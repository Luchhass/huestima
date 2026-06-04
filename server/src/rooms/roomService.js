import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { ROOM_STATUSES, ROOM_VISIBILITIES, ROUND_COUNT } from "../constants.js";
import {
  buildGamePayload,
  markPlayerInactiveForGame,
  startGameForRoom,
} from "../game/gameService.js";
import { generateRoomCode } from "../utils/ids.js";
import { logger } from "../utils/logger.js";
import { now } from "../utils/time.js";
import {
  deleteRoom,
  getRoom,
  listRooms,
  setRoom,
} from "./roomStore.js";
import {
  fail,
  ok,
  validateDifficulty,
  validateGameMode,
  validatePlayerId,
  validatePlayerName,
  validateRoomName,
  validateRoomPassword,
  validateRoomCode,
  validateRoomVisibility,
} from "./roomValidation.js";

let callbacks = {
  emitRoomState: () => {},
  emitRoomClosed: () => {},
  emitPlayerKicked: () => {},
  emitScoreboard: () => {},
  emitRoomList: () => {},
  leaveSocketRoom: () => {},
};

function normalizeSearchQuery(query) {
  return typeof query === "string" ? query.trim().toLowerCase().slice(0, 60) : "";
}

function createPasswordRecord(password) {
  if (!password) return null;

  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");

  return { salt, hash };
}

function verifyPassword(password, record) {
  if (!record) return true;
  if (!password) return false;

  const hash = createHash("sha256")
    .update(`${record.salt}:${password}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(record.hash, "hex"));
}

function getRoomHost(room) {
  return room.players.get(room.hostPlayerId) || null;
}

export function configureRoomService(nextCallbacks) {
  callbacks = {
    ...callbacks,
    ...nextCallbacks,
  };
}

function createTimerStore() {
  return {
    stale: null,
    empty: null,
    completed: null,
    hostDisconnect: null,
    playerDisconnects: new Map(),
  };
}

function clearTimer(timer) {
  if (timer) clearTimeout(timer);
}

function clearRoomTimers(room) {
  clearTimer(room.timers.stale);
  clearTimer(room.timers.empty);
  clearTimer(room.timers.completed);
  clearTimer(room.timers.hostDisconnect);
  for (const timer of room.timers.playerDisconnects.values()) clearTimer(timer);
  room.timers.playerDisconnects.clear();
}

function touchRoom(room) {
  room.updatedAt = now();
  room.expiresAt = now() + env.roomTtlMs;
}

function getPlayerProgress(player, room) {
  const completedRounds = player.results?.filter(Boolean).length || 0;
  const totalRounds = room?.game?.roundCount || ROUND_COUNT;
  const currentRound =
    room?.status === ROOM_STATUSES.IN_GAME
      ? Math.min(completedRounds + (player.submitted ? 0 : 1), totalRounds)
      : completedRounds;

  return {
    completedRounds,
    currentRound,
    totalRounds,
  };
}

function serializePlayer(player, room = null) {
  const progress = getPlayerProgress(player, room);

  return {
    id: player.id,
    playerId: player.id,
    name: player.name,
    isHost: player.isHost,
    connected: player.connected,
    returnedToLobby: Boolean(player.returnedToLobby),
    joinedAt: player.joinedAt,
    lastSeenAt: player.lastSeenAt,
    submitted: player.submitted,
    progress,
    completedRounds: progress.completedRounds,
    currentRound: progress.currentRound,
    totalRounds: progress.totalRounds,
  };
}

export function getRoomSnapshot(room) {
  if (!room) return null;

  return {
    code: room.code,
    roomCode: room.code,
    name: room.name,
    lobbyName: room.name,
    visibility: room.visibility,
    isPrivate: room.visibility === ROOM_VISIBILITIES.PRIVATE,
    hasPassword: Boolean(room.password),
    hostPlayerId: room.hostPlayerId,
    status: room.status,
    mode: room.gameMode,
    gameMode: room.gameMode,
    difficulty: room.difficulty,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    expiresAt: room.expiresAt,
    playerCount: room.players.size,
    players: Array.from(room.players.values())
      .filter((player) => !player.kicked)
      .sort((first, second) => first.joinedAt - second.joinedAt)
      .map((player) => serializePlayer(player, room)),
    game:
      room.status === ROOM_STATUSES.IN_GAME || room.status === ROOM_STATUSES.COMPLETED
        ? buildGamePayload(room)
        : null,
  };
}

function getRoomListSnapshot(room) {
  const host = getRoomHost(room);

  return {
    code: room.code,
    roomCode: room.code,
    name: room.name,
    lobbyName: room.name,
    visibility: room.visibility,
    isPrivate: room.visibility === ROOM_VISIBILITIES.PRIVATE,
    hasPassword: Boolean(room.password),
    gameMode: room.gameMode,
    difficulty: room.difficulty,
    status: room.status,
    playerCount: Array.from(room.players.values()).filter(
      (player) => !player.kicked,
    ).length,
    maxPlayers: room.maxPlayers,
    hostName: host?.name || "",
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    expiresAt: room.expiresAt,
  };
}

export function listJoinableRooms(payload = {}) {
  const query = normalizeSearchQuery(payload.query);
  const currentTime = now();

  const rooms = listRooms()
    .filter((room) => room.status === ROOM_STATUSES.LOBBY)
    .filter((room) => room.expiresAt > currentTime)
    .map(getRoomListSnapshot)
    .filter((room) => {
      if (!query) return true;

      return [
        room.code,
        room.name,
        room.hostName,
        room.gameMode,
        room.difficulty,
        room.visibility,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((first, second) => second.updatedAt - first.updatedAt)
    .slice(0, 50);

  return ok({ rooms });
}

function scheduleRoomDeletion(room, delayMs, reason, notify = false) {
  clearTimer(room.timers[reason] || null);

  const timer = setTimeout(() => {
    const currentRoom = getRoom(room.code);
    if (!currentRoom) return;

    closeRoom(currentRoom, reason, notify);
  }, delayMs);

  timer.unref?.();

  if (reason === "empty") room.timers.empty = timer;
  if (reason === "stale") room.timers.stale = timer;
  if (reason === "completed") room.timers.completed = timer;
}

function cancelEmptyDeletion(room) {
  clearTimer(room.timers.empty);
  room.timers.empty = null;
}

export function closeRoom(room, reason = "closed", notify = true) {
  if (!room) return;

  room.status = ROOM_STATUSES.CLOSED;
  clearRoomTimers(room);
  deleteRoom(room.code);

  if (notify) callbacks.emitRoomClosed(room, reason);
  callbacks.emitRoomList();
  logger.info("room closed", { roomCode: room.code, reason });
}

function maybeScheduleEmptyRoom(room) {
  const activePlayers = Array.from(room.players.values()).filter(
    (player) => !player.kicked,
  );

  if (activePlayers.length === 0) {
    scheduleRoomDeletion(room, env.emptyRoomTtlMs, "empty", false);
  }
}

function validateRoomCreatePayload(payload) {
  const playerId = validatePlayerId(payload.playerId);
  if (!playerId.ok) return playerId;

  const playerName = validatePlayerName(payload.playerName);
  if (!playerName.ok) return playerName;

  const difficulty = validateDifficulty(payload.difficulty);
  if (!difficulty.ok) return difficulty;

  const gameMode = validateGameMode(payload.gameMode || payload.mode);
  if (!gameMode.ok) return gameMode;

  const roomName = validateRoomName(
    payload.roomName || payload.lobbyName,
    `${playerName.data.playerName}'s lobby`,
  );
  if (!roomName.ok) return roomName;

  const visibility = validateRoomVisibility(payload.visibility);
  if (!visibility.ok) return visibility;

  const password = validateRoomPassword(payload.password, {
    required: visibility.data.visibility === ROOM_VISIBILITIES.PRIVATE,
  });
  if (!password.ok) return password;

  return ok({
    playerId: playerId.data.playerId,
    playerName: playerName.data.playerName,
    difficulty: difficulty.data.difficulty,
    gameMode: gameMode.data.gameMode,
    roomName: roomName.data.roomName,
    visibility: visibility.data.visibility,
    password: password.data.password,
  });
}

export function createRoom(payload) {
  const validation = validateRoomCreatePayload(payload);
  if (!validation.ok) return validation;

  const createdAt = now();
  const room = {
    code: generateRoomCode(),
    name: validation.data.roomName,
    visibility: validation.data.visibility,
    password:
      validation.data.visibility === ROOM_VISIBILITIES.PRIVATE
        ? createPasswordRecord(validation.data.password)
        : null,
    hostPlayerId: validation.data.playerId,
    status: ROOM_STATUSES.LOBBY,
    gameMode: validation.data.gameMode,
    difficulty: validation.data.difficulty,
    maxPlayers: env.maxPlayersPerRoom,
    createdAt,
    updatedAt: createdAt,
    expiresAt: createdAt + env.roomTtlMs,
    players: new Map(),
    kickedPlayerIds: new Set(),
    game: null,
    leaderboard: null,
    seed: null,
    timers: createTimerStore(),
  };

  room.players.set(validation.data.playerId, {
    id: validation.data.playerId,
    socketId: payload.socketId,
    name: validation.data.playerName,
    isHost: true,
    connected: true,
    joinedAt: createdAt,
    lastSeenAt: createdAt,
    submitted: false,
    inactive: false,
    kicked: false,
    returnedToLobby: false,
    results: [],
    totalScore: 0,
  });

  setRoom(room);
  scheduleRoomDeletion(room, env.roomTtlMs, "stale", true);

  logger.info("room created", { roomCode: room.code });

  return ok({
    room: getRoomSnapshot(room),
    player: serializePlayer(room.players.get(validation.data.playerId), room),
  });
}

export function requestRoomState(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return fail("Lobby not found or expired.");
  if (room.status === ROOM_STATUSES.CLOSED) return fail("Lobby is closed.");

  const playerId = payload.playerId ? validatePlayerId(payload.playerId) : null;
  let player = null;

  if (playerId?.ok) {
    player = room.players.get(playerId.data.playerId) || null;
    if (player && !player.kicked) {
      reconnectPlayer(room, player, payload.socketId);
    }
  }

  touchRoom(room);

  return ok({
    room: getRoomSnapshot(room),
    player: player ? serializePlayer(player, room) : null,
    game: player ? buildGamePayload(room) : null,
    leaderboard: room.leaderboard,
  });
}

function reconnectPlayer(room, player, socketId) {
  const disconnectTimer = room.timers.playerDisconnects.get(player.id);
  clearTimer(disconnectTimer);
  room.timers.playerDisconnects.delete(player.id);

  if (player.isHost) {
    clearTimer(room.timers.hostDisconnect);
    room.timers.hostDisconnect = null;
  }

  player.socketId = socketId;
  player.connected = true;
  player.lastSeenAt = now();
  touchRoom(room);
}

export function joinRoom(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const playerId = validatePlayerId(payload.playerId);
  if (!playerId.ok) return playerId;

  const playerName = validatePlayerName(payload.playerName);
  if (!playerName.ok) return playerName;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return fail("Lobby not found or expired.");
  if (room.status === ROOM_STATUSES.CLOSED) return fail("Lobby is closed.");
  if (room.kickedPlayerIds.has(playerId.data.playerId)) {
    return fail("You were removed from this lobby.");
  }

  const existingPlayer = room.players.get(playerId.data.playerId);
  if (existingPlayer && !existingPlayer.kicked) {
    existingPlayer.name = playerName.data.playerName;
    reconnectPlayer(room, existingPlayer, payload.socketId);
    return ok({
      room: getRoomSnapshot(room),
      player: serializePlayer(existingPlayer, room),
      game: buildGamePayload(room),
      leaderboard: room.leaderboard,
    });
  }

  if (room.visibility === ROOM_VISIBILITIES.PRIVATE && room.password) {
    const password = validateRoomPassword(payload.password, { required: true });
    if (!password.ok) return password;

    if (!verifyPassword(password.data.password, room.password)) {
      return fail("Invalid lobby password.");
    }
  }

  if (room.status !== ROOM_STATUSES.LOBBY) {
    return fail("Game already started.");
  }

  if (room.players.size >= room.maxPlayers) {
    return fail("Lobby is full.");
  }

  const joinedAt = now();
  const player = {
    id: playerId.data.playerId,
    socketId: payload.socketId,
    name: playerName.data.playerName,
    isHost: false,
    connected: true,
    joinedAt,
    lastSeenAt: joinedAt,
    submitted: false,
    inactive: false,
    kicked: false,
    returnedToLobby: false,
    results: [],
    totalScore: 0,
  };

  room.players.set(player.id, player);
  cancelEmptyDeletion(room);
  touchRoom(room);

  return ok({
    room: getRoomSnapshot(room),
    player: serializePlayer(player, room),
  });
}

export function updateRoomSettings(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const playerId = validatePlayerId(payload.hostPlayerId || payload.playerId);
  if (!playerId.ok) return playerId;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return fail("Lobby not found or expired.");
  if (room.status !== ROOM_STATUSES.LOBBY) return fail("Settings can only be changed in the lobby.");
  if (room.hostPlayerId !== playerId.data.playerId) return fail("Only the host can change lobby settings.");

  if (payload.gameMode !== undefined || payload.mode !== undefined) {
    const gameMode = validateGameMode(payload.gameMode || payload.mode);
    if (!gameMode.ok) return gameMode;

    room.gameMode = gameMode.data.gameMode;
  }

  if (payload.difficulty !== undefined) {
    const difficulty = validateDifficulty(payload.difficulty);
    if (!difficulty.ok) return difficulty;

    room.difficulty = difficulty.data.difficulty;
  }

  touchRoom(room);

  return ok({ room: getRoomSnapshot(room) });
}

export function returnRoomToLobby(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const playerId = validatePlayerId(payload.playerId);
  if (!playerId.ok) return playerId;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return fail("Lobby not found or expired.");
  if (room.status === ROOM_STATUSES.LOBBY) {
    return ok({ room: getRoomSnapshot(room), returnedAll: true });
  }
  if (room.status !== ROOM_STATUSES.COMPLETED) return fail("The match is still running.");

  const requester = room.players.get(playerId.data.playerId);
  if (!requester || requester.kicked) return fail("Player is not in this lobby.");

  requester.returnedToLobby = true;
  requester.lastSeenAt = now();

  if (!haveAllConnectedPlayersReturnedToLobby(room)) {
    touchRoom(room);

    return ok({
      room: getRoomSnapshot(room),
      player: serializePlayer(requester, room),
      leaderboard: room.leaderboard,
      pendingLobbyReturn: true,
    });
  }

  const resetResult = resetCompletedRoomToLobby(room);
  return ok(resetResult);
}

function getConnectedRoomPlayers(room) {
  return Array.from(room.players.values()).filter(
    (player) => !player.kicked && player.connected,
  );
}

function haveAllConnectedPlayersReturnedToLobby(room) {
  if (!room || room.status !== ROOM_STATUSES.COMPLETED) return false;

  const connectedPlayers = getConnectedRoomPlayers(room);

  return (
    connectedPlayers.length > 0 &&
    connectedPlayers.every((player) => player.returnedToLobby)
  );
}

function resetCompletedRoomToLobby(room) {
  clearTimer(room.timers.completed);
  room.timers.completed = null;
  room.status = ROOM_STATUSES.LOBBY;
  room.game = null;
  room.leaderboard = null;
  room.seed = null;

  for (const [id, player] of room.players.entries()) {
    if (player.kicked || !player.connected) {
      room.players.delete(id);
      continue;
    }

    player.submitted = false;
    player.inactive = false;
    player.returnedToLobby = false;
    player.results = [];
    player.totalScore = 0;
    player.lastSeenAt = now();
  }

  if (!room.players.has(room.hostPlayerId)) {
    const nextHost = Array.from(room.players.values())[0] || null;
    if (!nextHost) {
      closeRoom(room, "empty", true);
      return { room: null, closed: true };
    }

    room.hostPlayerId = nextHost.id;
    for (const player of room.players.values()) {
      player.isHost = player.id === nextHost.id;
    }
  }

  touchRoom(room);

  return { room: getRoomSnapshot(room), returnedAll: true };
}

export function leaveRoom(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const playerId = validatePlayerId(payload.playerId);
  if (!playerId.ok) return playerId;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return ok({ room: null });

  const player = room.players.get(playerId.data.playerId);
  if (!player) return ok({ room: getRoomSnapshot(room) });

  if (room.status === ROOM_STATUSES.LOBBY && player.isHost) {
    closeRoom(room, "host-left", true);
    return ok({ room: null, closed: true });
  }

  if (room.status === ROOM_STATUSES.LOBBY) {
    room.players.delete(player.id);
  } else if (room.status === ROOM_STATUSES.COMPLETED) {
    player.connected = false;
    player.inactive = true;

    if (haveAllConnectedPlayersReturnedToLobby(room)) {
      const resetResult = resetCompletedRoomToLobby(room);

      return ok({
        room: resetResult.room,
        leaderboard: room.leaderboard,
        closed: resetResult.closed,
      });
    }
  } else {
    player.connected = false;
    player.inactive = true;
    markPlayerInactiveForGame(room, player.id);
  }

  touchRoom(room);
  maybeScheduleEmptyRoom(room);

  return ok({
    room: getRoomSnapshot(room),
    leaderboard: room.leaderboard,
  });
}

export function kickPlayer(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const hostId = validatePlayerId(payload.hostPlayerId || payload.playerId);
  if (!hostId.ok) return hostId;

  const targetId = validatePlayerId(payload.targetPlayerId);
  if (!targetId.ok) return targetId;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return fail("Lobby not found or expired.");
  if (room.status !== ROOM_STATUSES.LOBBY) return fail("Players can only be removed before the game starts.");

  const host = room.players.get(hostId.data.playerId);
  if (!host || host.id !== room.hostPlayerId) return fail("Only the host can remove players.");
  if (host.id === targetId.data.playerId) return fail("Host cannot remove themselves.");
  if (targetId.data.playerId === room.hostPlayerId) return fail("Host cannot be removed.");

  const target = room.players.get(targetId.data.playerId);
  if (!target) return fail("Player not found.");

  target.kicked = true;
  room.kickedPlayerIds.add(target.id);
  room.players.delete(target.id);
  touchRoom(room);

  callbacks.emitPlayerKicked(room, target);
  if (target.socketId) callbacks.leaveSocketRoom(room.code, target.socketId);
  maybeScheduleEmptyRoom(room);

  return ok({ room: getRoomSnapshot(room) });
}

export function startRoomGame(payload) {
  const roomCode = validateRoomCode(payload.roomCode);
  if (!roomCode.ok) return roomCode;

  const playerId = validatePlayerId(payload.playerId);
  if (!playerId.ok) return playerId;

  const room = getRoom(roomCode.data.roomCode);
  if (!room) return fail("Lobby not found or expired.");
  if (room.status !== ROOM_STATUSES.LOBBY) return fail("Game already started.");
  if (room.hostPlayerId !== playerId.data.playerId) return fail("Only the host can start the game.");
  if (room.players.size < 1) return fail("Lobby has no players.");

  room.status = ROOM_STATUSES.STARTING;
  touchRoom(room);

  const game = startGameForRoom(room);
  touchRoom(room);

  return ok({
    room: getRoomSnapshot(room),
    game,
  });
}

export function findRoomsBySocketId(socketId) {
  const matches = [];

  for (const room of listRooms()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) matches.push({ room, player });
    }
  }

  return matches;
}

function expireDisconnectedPlayer(roomCode, playerId) {
  const room = getRoom(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player || player.connected) return;

  room.timers.playerDisconnects.delete(playerId);

  if (room.status === ROOM_STATUSES.LOBBY) {
    room.players.delete(playerId);
    touchRoom(room);
    maybeScheduleEmptyRoom(room);
    callbacks.emitRoomState(room);
    return;
  }

  if (room.status === ROOM_STATUSES.IN_GAME) {
    const leaderboard = markPlayerInactiveForGame(room, playerId);
    callbacks.emitRoomState(room);
    if (leaderboard) {
      callbacks.emitScoreboard(room, leaderboard);
      scheduleRoomDeletion(room, env.roomTtlMs, "completed", false);
    }
  }
}

function expireDisconnectedHost(roomCode, playerId) {
  const room = getRoom(roomCode);
  if (!room || room.status !== ROOM_STATUSES.LOBBY) return;

  const host = room.players.get(playerId);
  if (!host || host.connected) return;

  closeRoom(room, "host-disconnected", true);
}

export function handleSocketDisconnect(socketId) {
  const matches = findRoomsBySocketId(socketId);

  for (const { room, player } of matches) {
    if (player.socketId !== socketId) continue;

    player.connected = false;
    player.socketId = null;
    player.lastSeenAt = now();
    touchRoom(room);

    if (room.status === ROOM_STATUSES.LOBBY && player.isHost) {
      clearTimer(room.timers.hostDisconnect);
      room.timers.hostDisconnect = setTimeout(
        () => expireDisconnectedHost(room.code, player.id),
        env.hostDisconnectGraceMs,
      );
      room.timers.hostDisconnect.unref?.();
    } else {
      clearTimer(room.timers.playerDisconnects.get(player.id));
      const timer = setTimeout(
        () => expireDisconnectedPlayer(room.code, player.id),
        env.disconnectGraceMs,
      );
      timer.unref?.();
      room.timers.playerDisconnects.set(player.id, timer);
    }

    if (
      room.status === ROOM_STATUSES.COMPLETED &&
      haveAllConnectedPlayersReturnedToLobby(room)
    ) {
      resetCompletedRoomToLobby(room);
    }

    callbacks.emitRoomState(room);
  }
}

export function scheduleCompletedCleanup(room) {
  scheduleRoomDeletion(room, env.roomTtlMs, "completed", false);
}

export function runRoomCleanup() {
  const currentTime = now();

  for (const room of listRooms()) {
    if (room.expiresAt <= currentTime) {
      closeRoom(room, "stale", true);
      continue;
    }

    maybeScheduleEmptyRoom(room);
  }
}
