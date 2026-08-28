import {
  configureRoomService,
  createRoom,
  getRoomSnapshot,
  handleSocketDisconnect,
  joinRoom,
  listJoinableRooms,
  kickPlayer,
  leaveRoom,
  requestRoomState,
  returnRoomToLobby,
  scheduleCompletedCleanup,
  startRoomGame,
  updateRoomSettings,
} from "../rooms/roomService.js";
import { getRoom } from "../rooms/roomStore.js";
import { finishSprintForPlayer, submitFullResults, submitRoundGuess } from "../game/gameService.js";
import { validateRoomCode } from "../rooms/roomValidation.js";
import { createEmitters } from "./emitters.js";
import { logger } from "../utils/logger.js";
import {
  getSiteOperations,
  isMultiplayerAvailable,
} from "../operations/service.js";

function ackOk(ack, data = {}) {
  ack?.({
    ok: true,
    data,
    ...data,
  });
}

function ackFail(ack, error = "Unexpected multiplayer error.") {
  ack?.({
    ok: false,
    error,
  });
}

function safeEvent(handler) {
  return async (payload = {}, ack) => {
    try {
      if (!isMultiplayerAvailable()) {
        const operations = getSiteOperations();
        ack?.({
          ok: false,
          errorCode: operations.maintenanceEnabled
            ? "maintenance"
            : "multiplayer_disabled",
          error: operations.maintenanceEnabled
            ? "Huestima is currently under maintenance."
            : "Multiplayer is currently unavailable.",
        });
        return;
      }
      await handler(payload || {}, ack);
    } catch (error) {
      logger.error("socket event failed", { message: error.message });
      ackFail(ack);
    }
  };
}

function joinSocketToRoom(socket, roomCode) {
  if (roomCode) socket.join(roomCode);
}

function leaveSocketFromRoom(socket, roomCode) {
  if (roomCode) socket.leave(roomCode);
}

function getRoomFromPayload(payload) {
  const code = validateRoomCode(payload.roomCode);
  if (!code.ok) return code;

  const room = getRoom(code.data.roomCode);
  if (!room) return { ok: false, error: "Lobby not found or expired." };

  return { ok: true, data: { room } };
}

function getSocketPlayer(room, socket) {
  return Array.from(room?.players?.values?.() || []).find(
    (player) => player.socketId === socket.id && !player.kicked,
  ) || null;
}

function requireSocketPlayer(room, socket, playerId) {
  const player = getSocketPlayer(room, socket);

  if (!player || player.id !== playerId) {
    return { ok: false, error: "This socket is not authorized for that player." };
  }

  return { ok: true, data: { player } };
}

export function registerSocketEvents(io) {
  const emitters = createEmitters(io);
  configureRoomService(emitters);

  io.on("connection", (socket) => {
    socket.emit("operations:state", getSiteOperations());
    const eventBudget = { startedAt: Date.now(), count: 0 };
    socket.onAny(() => {
      const currentTime = Date.now();
      if (currentTime - eventBudget.startedAt >= 1000) {
        eventBudget.startedAt = currentTime;
        eventBudget.count = 0;
      }

      eventBudget.count += 1;
      if (eventBudget.count > 120) {
        logger.warn("socket event rate exceeded", { socketId: socket.id });
        socket.disconnect(true);
      }
    });

    socket.on(
      "room:create",
      safeEvent((payload, ack) => {
        const result = createRoom({ ...payload, socketId: socket.id });
        if (!result.ok) return ackFail(ack, result.error);

        joinSocketToRoom(socket, result.data.room.code);
        ackOk(ack, result.data);
        socket.emit("room:created", result.data);
        emitters.emitRoomState(getRoom(result.data.room.code));
        emitters.emitRoomList();
      }),
    );

    socket.on(
      "room:list",
      safeEvent((payload, ack) => {
        const result = listJoinableRooms(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
      }),
    );

    const handleJoin = safeEvent((payload, ack) => {
      const result = joinRoom({ ...payload, socketId: socket.id });
      if (!result.ok) return ackFail(ack, result.error);

      joinSocketToRoom(socket, result.data.room.code);
      ackOk(ack, result.data);
      socket.emit("room:joined", result.data);
      emitters.emitRoomState(getRoom(result.data.room.code));
      emitters.emitRoomList();
    });

    socket.on("room:join", handleJoin);

    const handleGetState = safeEvent((payload, ack) => {
      const result = requestRoomState({ ...payload, socketId: socket.id });
      if (!result.ok) return ackFail(ack, result.error);

      if (result.data.room) {
        joinSocketToRoom(socket, result.data.room.code);
        socket.emit("connection:restored", result.data);
        emitters.emitRoomState(getRoom(result.data.room.code));
      }

      ackOk(ack, result.data);
    });

    socket.on("room:getState", handleGetState);
    socket.on("room:requestState", handleGetState);

    socket.on(
      "room:leave",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = leaveRoom(payload);
        if (!result.ok) return ackFail(ack, result.error);

        leaveSocketFromRoom(socket, payload.roomCode);
        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
        emitters.emitRoomList();
      }),
    );

    socket.on(
      "room:kickPlayer",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(
          roomResult.data.room,
          socket,
          payload.hostPlayerId || payload.playerId,
        );
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = kickPlayer(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
        emitters.emitRoomList();
      }),
    );

    socket.on(
      "room:updateSettings",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(
          roomResult.data.room,
          socket,
          payload.hostPlayerId || payload.playerId,
        );
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = updateRoomSettings(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
        emitters.emitRoomList();
      }),
    );

    socket.on(
      "room:returnToLobby",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = returnRoomToLobby(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
        emitters.emitRoomList();
      }),
    );

    const handleStartGame = safeEvent((payload, ack) => {
      const roomResult = getRoomFromPayload(payload);
      if (!roomResult.ok) return ackFail(ack, roomResult.error);
      const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
      if (!auth.ok) return ackFail(ack, auth.error);

      const result = startRoomGame(payload);
      if (!result.ok) return ackFail(ack, result.error);

      const room = getRoom(result.data.room.code);
      ackOk(ack, result.data);
      emitters.emitRoomState(room);
      emitters.emitRoomList();
      io.to(room.code).emit("game:started", {
        roomCode: room.code,
        room: getRoomSnapshot(room),
        game: result.data.game,
      });
    });

    socket.on("room:startGame", handleStartGame);
    socket.on("game:start", handleStartGame);

    const handleSubmitGuess = safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = submitRoundGuess(roomResult.data.room, payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        emitters.emitRoomState(roomResult.data.room);

        if (result.data.leaderboard) {
          emitters.emitScoreboard(roomResult.data.room, result.data.leaderboard);
          scheduleCompletedCleanup(roomResult.data.room);
        } else {
          io.to(roomResult.data.room.code).emit("game:submissionReceived", {
            roomCode: roomResult.data.room.code,
            playerId: payload.playerId,
          });
        }
      });

    socket.on("game:submitGuess", handleSubmitGuess);
    socket.on("round:submitGuess", handleSubmitGuess);

    socket.on(
      "game:finishSprint",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = finishSprintForPlayer(roomResult.data.room, payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        emitters.emitRoomState(roomResult.data.room);
        if (result.data.leaderboard) {
          emitters.emitScoreboard(roomResult.data.room, result.data.leaderboard);
          scheduleCompletedCleanup(roomResult.data.room);
        }
      }),
    );

    socket.on(
      "game:submitResults",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
        if (!auth.ok) return ackFail(ack, auth.error);

        const result = submitFullResults(roomResult.data.room, payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        emitters.emitRoomState(roomResult.data.room);

        if (result.data.leaderboard) {
          emitters.emitScoreboard(roomResult.data.room, result.data.leaderboard);
          scheduleCompletedCleanup(roomResult.data.room);
        }
      }),
    );

    socket.on(
      "round:requestTarget",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);
        const auth = requireSocketPlayer(roomResult.data.room, socket, payload.playerId);
        if (!auth.ok) return ackFail(ack, auth.error);

        const { room } = roomResult.data;
        const roundIndex = Number(payload.roundIndex);
        if (!Number.isInteger(roundIndex) || roundIndex !== room.game?.currentRoundIndex) {
          return ackFail(ack, "That round is not currently active.");
        }
        const targetColors = room.game?.targetColors || [];
        const targetColor = targetColors[roundIndex] || null;
        if (!targetColor) return ackFail(ack, "Target color is unavailable.");

        ackOk(ack, {
          round: {
            roundIndex,
            targetColor,
            revealDurationMs: room.game.revealDurationMs,
            guessDurationMs: room.game.guessDurationMs || null,
          },
        });
      }),
    );

    socket.on("disconnect", () => {
      handleSocketDisconnect(socket.id);
    });
  });
}
