"use client";

import { useEffect, useMemo, useRef } from "react";
import { ROUND_COUNT } from "@/lib/constants";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_PHASES } from "@/hooks/useSingleplayerGame";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import WaitingCard from "./WaitingCard";
import LeaderboardCard from "./LeaderboardCard";

function buildProgressItems(room, currentPlayerId) {
  const totalRounds = room?.game?.roundCount || ROUND_COUNT;

  return (room?.players || [])
    .map((player, index) => {
      const progress = player.progress || {};
      const completedRounds = progress.completedRounds ?? player.completedRounds ?? 0;
      const currentRound =
        progress.currentRound ?? player.currentRound ?? Math.min(completedRounds + 1, totalRounds);
      const roundsTotal = progress.totalRounds || player.totalRounds || totalRounds;

      return {
        id: player.id,
        name: player.name,
        joinedAt: player.joinedAt || index,
        isCurrent: player.id === currentPlayerId,
        completedRounds,
        currentRound: Math.max(0, Math.min(currentRound, roundsTotal)),
        totalRounds: roundsTotal,
        label: `${Math.max(0, Math.min(currentRound, roundsTotal))}/${roundsTotal}`,
      };
    })
    .sort((first, second) => {
      if (second.currentRound !== first.currentRound) {
        return second.currentRound - first.currentRound;
      }

      if (second.completedRounds !== first.completedRounds) {
        return second.completedRounds - first.completedRounds;
      }

      return first.joinedAt - second.joinedAt;
    });
}

export default function MultiplayerGame({
  roomCode,
  playerId,
  difficultyId,
  gameModeId,
  gamePayload,
  room,
  leaderboard,
  onBackHome,
  onBackLobby,
  isReturningLobby,
  error = "",
}) {
  const { t } = useTranslation();
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const game = useMultiplayerGame({
    roomCode,
    playerId,
    difficultyId,
    gameModeId,
    gamePayload,
    incomingLeaderboard: leaderboard,
  });
  const { phase, leaderboard: gameLeaderboard, showLeaderboard } = game;
  const progressItems = useMemo(
    () => buildProgressItems(room, playerId),
    [playerId, room],
  );
  const isImmersivePhase =
    phase === GAME_PHASES.INTRO ||
    phase === GAME_PHASES.MEMORIZE ||
    phase === GAME_PHASES.GUESS ||
    phase === GAME_PHASES.RESULT ||
    phase === "waiting";

  useGameChrome(isImmersivePhase);

  useEffect(() => {
    if (startTrackedRef.current) return;

    startTrackedRef.current = true;
    trackMatchStart({
      gameType: "multiplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
    });
  }, [game.difficulty.id, game.gameMode.id]);

  useEffect(() => {
    if (phase === "waiting" && gameLeaderboard) {
      showLeaderboard();
    }
  }, [gameLeaderboard, phase, showLeaderboard]);

  useEffect(() => {
    if (
      completionTrackedRef.current ||
      phase !== "leaderboard" ||
      !game.leaderboard
    ) {
      return;
    }

    const rows = game.leaderboard.leaderboard || [];
    const currentRow = rows.find((row) => row.playerId === playerId);
    const totalRounds = game.leaderboard.totalRounds || ROUND_COUNT;
    const totalScore = currentRow?.totalScore || 0;

    completionTrackedRef.current = true;
    trackMatchEnd({
      gameType: "multiplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      totalScore,
      averageScore: totalRounds ? totalScore / totalRounds : 0,
      rounds: totalRounds,
    });
  }, [
    game.difficulty.id,
    game.gameMode.id,
    game.leaderboard,
    phase,
    playerId,
  ]);

  const shellColor =
    game.phase === GAME_PHASES.INTRO
      ? "#000000"
      : game.phase === GAME_PHASES.MEMORIZE
        ? game.targetColor?.hex
        : game.phase === GAME_PHASES.GUESS
          ? game.guessColor.hex
          : null;

  return (
    <main className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <GameCardShell color={shellColor}>
        <div className="h-full min-h-[inherit]">
          {game.phase === GAME_PHASES.INTRO && (
            <IntroPhase
              key={`intro-${game.roundIndex}`}
              onComplete={game.finishIntro}
            />
          )}

          {game.phase === GAME_PHASES.MEMORIZE && game.targetColor && (
            game.isSequenceMode ? (
              <SequenceMemorizePhase
                key="sequence-memorize"
                colors={game.targetColors}
                durationMs={game.revealDurationMs || undefined}
                onColorChange={game.setTargetColor}
                onComplete={game.finishMemorize}
                progressItems={progressItems}
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                durationMs={game.revealDurationMs || undefined}
                onComplete={game.finishMemorize}
                progressItems={progressItems}
              />
            )
          )}

          {game.phase === GAME_PHASES.GUESS && (
            <GuessPhase
              key={`guess-${game.roundIndex}`}
              round={game.roundIndex + 1}
              difficulty={game.difficulty}
              guessColor={game.guessColor}
              onGuessChange={game.updateGuess}
              onSubmit={game.submitGuess}
              progressItems={progressItems}
            />
          )}

          {game.phase === GAME_PHASES.RESULT && (
            <ResultPhase
              key={`result-${game.roundIndex}`}
              result={game.latestResult}
              hasNextRound={game.roundIndex + 1 < ROUND_COUNT}
              onContinue={game.continueFromResult}
            />
          )}

          {game.phase === "waiting" && (
            <WaitingCard message={game.error || t("room.automaticResults")} />
          )}

          {game.phase === "leaderboard" && (
            <LeaderboardCard
              leaderboard={game.leaderboard}
              currentPlayerId={playerId}
              onBackHome={onBackHome}
              onBackLobby={onBackLobby}
              isReturningLobby={isReturningLobby}
              error={error}
            />
          )}

          {game.error && game.phase !== "waiting" && (
            <p className="absolute bottom-4 left-6 right-6 z-30 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-semibold text-red-200">
              {game.error}
            </p>
          )}
        </div>
      </GameCardShell>
    </main>
  );
}
