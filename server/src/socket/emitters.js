import { getRoomSnapshot } from "../rooms/roomService.js";

export function createEmitters(io) {
  return {
    emitRoomState(room) {
      io.to(room.code).emit("room:state", getRoomSnapshot(room));
    },

    emitRoomClosed(room, reason) {
      io.to(room.code).emit("room:closed", {
        roomCode: room.code,
        reason,
        message: "This lobby has closed.",
      });
    },

    emitPlayerKicked(room, player) {
      if (!player.socketId) return;

      io.to(player.socketId).emit("room:playerKicked", {
        roomCode: room.code,
        playerId: player.id,
        message: "You were removed from the lobby.",
      });
    },

    emitScoreboard(room, leaderboard) {
      io.to(room.code).emit("game:scoreboard", leaderboard);
      io.to(room.code).emit("game:leaderboard", leaderboard);
    },

    leaveSocketRoom(roomCode, socketId) {
      const socket = io.sockets.sockets.get(socketId);
      socket?.leave(roomCode);
    },
  };
}
