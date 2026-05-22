"use client";

import { useEffect } from "react";
import { ROUND_COUNT } from "@/lib/constants";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_PHASES } from "@/hooks/useSingleplayerGame";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import WaitingCard from "./WaitingCard";
import LeaderboardCard from "./LeaderboardCard";

export default function MultiplayerGame({
  roomCode,
  playerId,
  difficultyId,
  gameModeId,
  gamePayload,
  leaderboard,
}) {
  const { t } = useTranslation();
  const game = useMultiplayerGame({
    roomCode,
    playerId,
    difficultyId,
    gameModeId,
    gamePayload,
    incomingLeaderboard: leaderboard,
  });
  const { phase, leaderboard: gameLeaderboard, showLeaderboard } = game;
  const isImmersivePhase =
    phase === GAME_PHASES.INTRO ||
    phase === GAME_PHASES.MEMORIZE ||
    phase === GAME_PHASES.GUESS ||
    phase === GAME_PHASES.RESULT;

  useGameChrome(isImmersivePhase);

  useEffect(() => {
    if (phase === "waiting" && gameLeaderboard) {
      showLeaderboard();
    }
  }, [gameLeaderboard, phase, showLeaderboard]);

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
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                durationMs={game.revealDurationMs || undefined}
                onComplete={game.finishMemorize}
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
