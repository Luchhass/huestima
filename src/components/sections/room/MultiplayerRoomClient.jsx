"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayerId, consumeInviteCopied, useRoomSession } from "@/hooks/useRoomSession";
import { useTranslation } from "@/hooks/useLanguage";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { trackEvent } from "@/lib/analytics";
import RoomCardShell from "./RoomCardShell";
import JoinRoomCard from "./JoinRoomCard";
import LobbyCard from "./LobbyCard";
import RoomMessageCard from "./RoomMessageCard";
import LeaderboardCard from "./LeaderboardCard";
import MultiplayerGame from "./MultiplayerGame";

const ROOM_CODE_PATTERN = /^\d{6}$/;

function findRoomPlayer(room, playerId) {
  return room?.players?.find((roomPlayer) => roomPlayer.id === playerId) || null;
}

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
    updateSettings,
    returnToLobby,
  } = useMultiplayerRoom(roomCode);
  const { session, isLoaded, saveSession, clearSession } = useRoomSession(roomCode);
  const bootstrappedRef = useRef(false);
  const [view, setView] = useState("loading");
  const [player, setPlayer] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isReturningLobby, setIsReturningLobby] = useState(false);
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

      const sessionRoomPlayer = findRoomPlayer(response.room, session?.playerId);
      const isParticipant = session?.playerId && sessionRoomPlayer;

      if (isParticipant) {
        setPlayer(session);

        consumeInviteCopied(roomCode);

        const responseGame = response.game || response.room.game;

        if (response.room.status === "completed" && sessionRoomPlayer.returnedToLobby) {
          setView("lobby");
        } else if (response.leaderboard || response.room.status === "completed") {
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
    trackEvent("lobby_join", {
      game_type: "multiplayer",
      difficulty: response.room?.difficulty,
      game_mode: response.room?.gameMode,
    });
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
    if (room?.status !== "lobby") return;

    setIsStarting(true);
    setError("");

    const response = await startGame(player.playerId);
    setIsStarting(false);

    if (!response.ok) {
      setError(response.error || t("room.couldNotStart"));
      return;
    }

    trackEvent("multiplayer_game_start", {
      game_type: "multiplayer",
      difficulty: room.difficulty,
      game_mode: room.gameMode,
      player_count: room.players?.length || 0,
    });

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

  const handleUpdateGameMode = async (gameMode) => {
    if (!player) return;

    setIsUpdatingSettings(true);
    setError("");

    const response = await updateSettings({
      playerId: player.playerId,
      gameMode,
    });

    setIsUpdatingSettings(false);

    if (!response.ok) {
      setError(response.error || t("room.couldNotUpdateSettings"));
    }
  };

  const handleUpdateDifficulty = async (difficulty) => {
    if (!player) return;

    setIsUpdatingSettings(true);
    setError("");

    const response = await updateSettings({
      playerId: player.playerId,
      difficulty,
    });

    setIsUpdatingSettings(false);

    if (!response.ok) {
      setError(response.error || t("room.couldNotUpdateSettings"));
    }
  };

  const handleReturnToLobby = async () => {
    if (!player) return;

    setIsReturningLobby(true);
    setError("");

    const response = await returnToLobby(player.playerId);

    setIsReturningLobby(false);

    if (!response.ok) {
      setError(response.error || t("room.couldNotReturnToLobby"));
      return;
    }

    setView("lobby");
  };

  const currentRoomPlayer = findRoomPlayer(room, player?.playerId);
  const isWaitingForLobbyReturn = room?.status === "completed";
  const canStartGame = room?.status === "lobby";

  const handleBackHome = async () => {
    if (
      player?.playerId &&
      (room?.status === "lobby" || currentRoomPlayer?.returnedToLobby)
    ) {
      await leaveRoom(player.playerId);
    }

    router.push("/");
  };

  const activeGame = startedGame || room?.game;
  let effectiveView = view;

  if (kickedMessage) {
    effectiveView = "kicked";
  } else if (closedMessage) {
    effectiveView = "closed";
  } else if (
    player &&
    room?.status === "completed" &&
    currentRoomPlayer?.returnedToLobby
  ) {
    effectiveView = "lobby";
  } else if (player && room?.status === "lobby") {
    effectiveView = "lobby";
  } else if (player && startedGame && room?.status === "completed") {
    effectiveView = "game";
  } else if (player && leaderboard && room?.status === "completed") {
    effectiveView = "leaderboard";
  } else if (player && activeGame) {
    effectiveView = "game";
  }

  if (effectiveView === "game" && player && room && activeGame) {
    return (
      <MultiplayerGame
        roomCode={roomCode}
        playerId={player.playerId}
        difficultyId={room.difficulty}
        gameModeId={room.gameMode}
        gamePayload={activeGame}
        room={room}
        leaderboard={leaderboard}
        onBackHome={handleBackHome}
        onBackLobby={handleReturnToLobby}
        isReturningLobby={isReturningLobby}
        error={error || connectionError}
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
          onGameModeChange={handleUpdateGameMode}
          onDifficultyChange={handleUpdateDifficulty}
          onBackHome={handleBackHome}
          isStarting={isStarting}
          canStartGame={canStartGame}
          startDisabledLabel={
            isWaitingForLobbyReturn ? t("room.waitingLobbyReturn") : ""
          }
          isUpdatingSettings={isUpdatingSettings}
          error={error || connectionError}
        />
      )}

      {effectiveView === "leaderboard" && (
        <LeaderboardCard
          leaderboard={leaderboard}
          currentPlayerId={player?.playerId}
          onBackHome={handleBackHome}
          onBackLobby={handleReturnToLobby}
          isReturningLobby={isReturningLobby}
          error={error || connectionError}
        />
      )}
    </RoomCardShell>
  );
}
