"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayerId, consumeInviteCopied, useRoomSession } from "@/hooks/useRoomSession";
import { useTranslation } from "@/hooks/useLanguage";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import RoomCardShell from "./RoomCardShell";
import JoinRoomCard from "./JoinRoomCard";
import LobbyCard from "./LobbyCard";
import RoomMessageCard from "./RoomMessageCard";
import LeaderboardCard from "./LeaderboardCard";
import MultiplayerGame from "./MultiplayerGame";

const ROOM_CODE_PATTERN = /^\d{6}$/;

async function copyInviteLink(roomCode) {
  const inviteUrl = `${window.location.origin}/${roomCode}`;
  if (!navigator.clipboard) {
    throw new Error("Clipboard unavailable");
  }

  await navigator.clipboard.writeText(inviteUrl);
}

export default function MultiplayerRoomClient({ roomCode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const {
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
  } = useMultiplayerRoom(roomCode);
  const { session, isLoaded, saveSession, clearSession } = useRoomSession(roomCode);
  const bootstrappedRef = useRef(false);
  const [view, setView] = useState("loading");
  const [player, setPlayer] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || (!kickedMessage && !closedMessage)) return;

    clearSession();
  }, [clearSession, closedMessage, kickedMessage, session]);

  useEffect(() => {
    if (!isLoaded || bootstrappedRef.current) return;

    bootstrappedRef.current = true;

    const bootstrap = async () => {
      if (!ROOM_CODE_PATTERN.test(roomCode)) {
        setView("not-found");
        return;
      }

      const response = await requestState(session?.playerId);

      if (!response.ok) {
        setError(response.error || t("room.lobbyNotFound"));
        setView("not-found");
        return;
      }

      const isParticipant =
        session?.playerId &&
        response.room.players.some((roomPlayer) => roomPlayer.id === session.playerId);

      if (isParticipant) {
        setPlayer(session);

        consumeInviteCopied(roomCode);

        const responseGame = response.game || response.room.game;

        if (response.leaderboard || response.room.status === "completed") {
          setView("leaderboard");
        } else if (responseGame || response.room.status === "in_game") {
          setView("game");
        } else {
          setView("lobby");
        }

        return;
      }

      setView(response.room.status === "lobby" ? "join" : "not-found");
    };

    bootstrap();
  }, [isLoaded, requestState, roomCode, session, t]);

  const handleJoin = async (playerName) => {
    setIsJoining(true);
    setError("");

    const nextPlayer = {
      roomCode,
      playerId: createPlayerId(),
      playerName,
      isHost: false,
    };
    const response = await joinRoom(nextPlayer);

    setIsJoining(false);

    if (!response.ok) {
      setError(response.error || t("room.couldNotJoin"));
      return;
    }

    saveSession(nextPlayer);
    setPlayer(nextPlayer);
    setView(response.room.status === "in_game" ? "game" : "lobby");
  };

  const handleCopyInvite = async () => {
    setError("");

    try {
      await copyInviteLink(roomCode);
      return true;
    } catch {
      setError(t("room.couldNotCopy"));
      return false;
    }
  };

  const handleStartGame = async () => {
    if (!player) return;

    setIsStarting(true);
    setError("");

    const response = await startGame(player.playerId);
    setIsStarting(false);

    if (!response.ok) {
      setError(response.error || t("room.couldNotStart"));
      return;
    }

    setView("game");
  };

  const handleKickPlayer = async (targetPlayerId) => {
    if (!player) return { ok: false };

    setError("");
    const response = await kickPlayer({
      hostPlayerId: player.playerId,
      targetPlayerId,
    });

    if (!response.ok) {
      setError(response.error);
    }

    return response;
  };

  const handleBackHome = async () => {
    if (player?.playerId && room?.status === "lobby") {
      await leaveRoom(player.playerId);
    }

    router.push("/");
  };

  const effectiveView =
    kickedMessage
      ? "kicked"
      : closedMessage
        ? "closed"
        : player && view !== "game" && leaderboard && room?.status === "completed"
          ? "leaderboard"
          : player &&
              view !== "game" &&
              (startedGame || room?.game || room?.status === "in_game")
            ? "game"
            : view;

  const activeGame = startedGame || room?.game;

  if (effectiveView === "game" && player && room && activeGame) {
    return (
      <MultiplayerGame
        roomCode={roomCode}
        playerId={player.playerId}
        difficultyId={room.difficulty}
        gameModeId={room.gameMode}
        gamePayload={activeGame}
        leaderboard={leaderboard}
      />
    );
  }

  return (
    <RoomCardShell>
      {effectiveView === "loading" && (
        <RoomMessageCard
          title={t("common.loading")}
          message={connectionError || t("room.findingLobby")}
        />
      )}

      {effectiveView === "not-found" && (
        <RoomMessageCard
          title={t("common.lobby")}
          message={error || t("room.lobbyNotFound")}
        />
      )}

      {effectiveView === "kicked" && (
        <RoomMessageCard
          title={t("room.kicked")}
          message={kickedMessage || t("room.kickedMessage")}
        />
      )}

      {effectiveView === "closed" && (
        <RoomMessageCard
          title={t("common.lobby")}
          message={closedMessage || t("room.closedMessage")}
        />
      )}

      {effectiveView === "join" && (
        <JoinRoomCard
          room={room}
          roomCode={roomCode}
          onJoin={handleJoin}
          isJoining={isJoining}
          error={error}
        />
      )}

      {effectiveView === "lobby" && room && player && (
        <LobbyCard
          room={room}
          currentPlayerId={player.playerId}
          onCopyInvite={handleCopyInvite}
          onStartGame={handleStartGame}
          onKickPlayer={handleKickPlayer}
          onBackHome={handleBackHome}
          isStarting={isStarting}
          error={error || connectionError}
        />
      )}

      {effectiveView === "leaderboard" && (
        <LeaderboardCard
          leaderboard={leaderboard}
          currentPlayerId={player?.playerId}
        />
      )}
    </RoomCardShell>
  );
}
