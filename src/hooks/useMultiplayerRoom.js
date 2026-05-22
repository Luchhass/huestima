"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { emitWithAck, getSocket } from "@/lib/socket";

function responseData(response) {
  return response?.data || response || {};
}

function isSameRoom(payload, roomCode) {
  return payload?.roomCode === roomCode || payload?.code === roomCode;
}

export function useMultiplayerRoom(roomCode) {
  const { t } = useTranslation();
  const [room, setRoom] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [startedGame, setStartedGame] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [kickedMessage, setKickedMessage] = useState("");
  const [closedMessage, setClosedMessage] = useState("");

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleRoomState = (nextRoom) => {
      if (nextRoom?.code === roomCode) {
        setRoom(nextRoom);

        if (nextRoom.game) {
          setStartedGame(nextRoom.game);
        } else if (nextRoom.status === "lobby") {
          setStartedGame(null);
        }

        if (nextRoom.status !== "completed") {
          setLeaderboard(null);
        }
      }
    };

    const handleGameStarted = (payload) => {
      if (!isSameRoom(payload, roomCode)) return;

      setStartedGame(payload.game || payload);
      if (payload.room) setRoom(payload.room);
    };

    const handleScoreboard = (payload) => {
      if (!isSameRoom(payload, roomCode)) return;

      setLeaderboard(payload);
      setRoom((currentRoom) =>
        currentRoom
          ? {
              ...currentRoom,
              status: "completed",
            }
          : currentRoom,
      );
    };

    const handleKicked = (payload) => {
      if (!isSameRoom(payload, roomCode)) return;

      setKickedMessage(payload.message || t("room.kickedMessage"));
      setRoom(null);
      setStartedGame(null);
      setLeaderboard(null);
    };

    const handleClosed = (payload) => {
      if (!isSameRoom(payload, roomCode)) return;

      setClosedMessage(payload.message || t("room.closedMessage"));
      setRoom(null);
      setStartedGame(null);
    };

    const handleConnectError = () => {
      setConnectionError(t("room.couldNotReachServer"));
    };

    const handleConnect = () => {
      setConnectionError("");
    };

    socket.on("room:state", handleRoomState);
    socket.on("game:started", handleGameStarted);
    socket.on("game:scoreboard", handleScoreboard);
    socket.on("game:leaderboard", handleScoreboard);
    socket.on("room:playerKicked", handleKicked);
    socket.on("room:closed", handleClosed);
    socket.on("connect_error", handleConnectError);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("game:started", handleGameStarted);
      socket.off("game:scoreboard", handleScoreboard);
      socket.off("game:leaderboard", handleScoreboard);
      socket.off("room:playerKicked", handleKicked);
      socket.off("room:closed", handleClosed);
      socket.off("connect_error", handleConnectError);
      socket.off("connect", handleConnect);
    };
  }, [roomCode, t]);

  const requestState = useCallback(
    async (playerId) => {
      const response = await emitWithAck("room:getState", {
        roomCode,
        playerId,
      });

      if (response.ok) {
        const data = responseData(response);
        setRoom(data.room);
        setStartedGame(data.game || data.room?.game || null);
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      }

      return response;
    },
    [roomCode],
  );

  const joinRoom = useCallback(
    async ({ playerId, playerName }) => {
      const response = await emitWithAck("room:join", {
        roomCode,
        playerId,
        playerName,
      });

      if (response.ok) {
        const data = responseData(response);
        setRoom(data.room);
        setStartedGame(data.game || data.room?.game || null);
      }

      return response;
    },
    [roomCode],
  );

  const leaveRoom = useCallback(
    async (playerId) => {
      await emitWithAck("room:leave", {
        roomCode,
        playerId,
      });
    },
    [roomCode],
  );

  const startGame = useCallback(
    async (playerId) => {
      const response = await emitWithAck("room:startGame", {
        roomCode,
        playerId,
      });

      if (response.ok) {
        const data = responseData(response);
        setRoom(data.room);
        setStartedGame(data.game);
      }

      return response;
    },
    [roomCode],
  );

  const kickPlayer = useCallback(
    async ({ hostPlayerId, targetPlayerId }) => {
      const response = await emitWithAck("room:kickPlayer", {
        roomCode,
        hostPlayerId,
        targetPlayerId,
      });

      if (response.ok) {
        const data = responseData(response);
        setRoom(data.room);
      }

      return response;
    },
    [roomCode],
  );

  const updateSettings = useCallback(
    async ({ playerId, gameMode, difficulty }) => {
      const response = await emitWithAck("room:updateSettings", {
        roomCode,
        playerId,
        gameMode,
        difficulty,
      });

      if (response.ok) {
        const data = responseData(response);
        setRoom(data.room);
      }

      return response;
    },
    [roomCode],
  );

  const returnToLobby = useCallback(
    async (playerId) => {
      const response = await emitWithAck("room:returnToLobby", {
        roomCode,
        playerId,
      });

      if (response.ok) {
        const data = responseData(response);
        setRoom(data.room);
        setStartedGame(null);
        setLeaderboard(null);
      }

      return response;
    },
    [roomCode],
  );

  return {
    room,
    leaderboard,
    startedGame,
    connectionError,
    kickedMessage,
    closedMessage,
    requestState,
    joinRoom,
    leaveRoom,
    startGame,
    kickPlayer,
    updateSettings,
    returnToLobby,
  };
}
