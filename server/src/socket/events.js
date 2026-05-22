import {
  configureRoomService,
  createRoom,
  getRoomSnapshot,
  handleSocketDisconnect,
  joinRoom,
  kickPlayer,
  leaveRoom,
  requestRoomState,
  returnRoomToLobby,
  scheduleCompletedCleanup,
  startRoomGame,
  updateRoomSettings,
} from "../rooms/roomService.js";
import { getRoom } from "../rooms/roomStore.js";
import { submitFullResults, submitRoundGuess } from "../game/gameService.js";
import { validateRoomCode } from "../rooms/roomValidation.js";
import { createEmitters } from "./emitters.js";
import { logger } from "../utils/logger.js";

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

export function registerSocketEvents(io) {
  const emitters = createEmitters(io);
  configureRoomService(emitters);

  io.on("connection", (socket) => {
    socket.on(
      "room:create",
      safeEvent((payload, ack) => {
        const result = createRoom({ ...payload, socketId: socket.id });
        if (!result.ok) return ackFail(ack, result.error);

        joinSocketToRoom(socket, result.data.room.code);
        ackOk(ack, result.data);
        socket.emit("room:created", result.data);
        emitters.emitRoomState(getRoom(result.data.room.code));
      }),
    );

    const handleJoin = safeEvent((payload, ack) => {
      const result = joinRoom({ ...payload, socketId: socket.id });
      if (!result.ok) return ackFail(ack, result.error);

      joinSocketToRoom(socket, result.data.room.code);
      ackOk(ack, result.data);
      socket.emit("room:joined", result.data);
      emitters.emitRoomState(getRoom(result.data.room.code));
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
        const result = leaveRoom(payload);
        if (!result.ok) return ackFail(ack, result.error);

        leaveSocketFromRoom(socket, payload.roomCode);
        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
      }),
    );

    socket.on(
      "room:kickPlayer",
      safeEvent((payload, ack) => {
        const result = kickPlayer(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
      }),
    );

    socket.on(
      "room:updateSettings",
      safeEvent((payload, ack) => {
        const result = updateRoomSettings(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
      }),
    );

    socket.on(
      "room:returnToLobby",
      safeEvent((payload, ack) => {
        const result = returnRoomToLobby(payload);
        if (!result.ok) return ackFail(ack, result.error);

        ackOk(ack, result.data);
        if (result.data.room) emitters.emitRoomState(getRoom(result.data.room.code));
      }),
    );

    const handleStartGame = safeEvent((payload, ack) => {
      const result = startRoomGame(payload);
      if (!result.ok) return ackFail(ack, result.error);

      const room = getRoom(result.data.room.code);
      ackOk(ack, result.data);
      emitters.emitRoomState(room);
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
      "game:submitResults",
      safeEvent((payload, ack) => {
        const roomResult = getRoomFromPayload(payload);
        if (!roomResult.ok) return ackFail(ack, roomResult.error);

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

        const { room } = roomResult.data;
        const roundIndex = Number(payload.roundIndex);
        const targetColors = room.game?.targetColors || [];
        const targetColor = targetColors[roundIndex] || null;
        if (!targetColor) return ackFail(ack, "Target color is unavailable.");

        ackOk(ack, {
          round: {
            roundIndex,
            targetColor,
            targetColors,
            revealDurationMs: room.game.revealDurationMs,
          },
        });
      }),
    );

    socket.on("disconnect", () => {
      handleSocketDisconnect(socket.id);
    });
  });
}
