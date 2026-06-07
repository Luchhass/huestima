"use client";

import { useEffect, useRef } from "react";
import { ROUND_COUNT } from "@/lib/constants";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_PHASES, useSingleplayerGame } from "@/hooks/useSingleplayerGame";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import FinalSummary from "@/components/ui/game/FinalSummary";

export default function SingleplayerGame({ initialDifficulty, initialGameMode }) {
  const { t } = useTranslation();
  const game = useSingleplayerGame(initialDifficulty, initialGameMode);
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const latestResult = game.results[game.results.length - 1];
  const isImmersivePhase = game.phase !== GAME_PHASES.FINAL;
  const currentRoundLabel = game.isEndlessMode
    ? `${t("game.level")} ${game.roundIndex + 1}`
    : undefined;
  const latestResultRoundLabel =
    game.isEndlessMode && latestResult
      ? `${t("game.level")} ${latestResult.round}`
      : undefined;

  useGameChrome(isImmersivePhase);

  useEffect(() => {
    if (startTrackedRef.current) return;

    startTrackedRef.current = true;
    trackMatchStart({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
    });
  }, [game.difficulty.id, game.gameMode.id]);

  useEffect(() => {
    if (game.phase !== GAME_PHASES.FINAL || completionTrackedRef.current) return;

    completionTrackedRef.current = true;
    trackMatchEnd({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      totalScore: game.summary.totalScore,
      averageScore: game.summary.averageScore,
      rounds: game.results.length,
    });
  }, [
    game.difficulty.id,
    game.gameMode.id,
    game.phase,
    game.results.length,
    game.summary.averageScore,
    game.summary.totalScore,
  ]);

  const handlePlayAgain = () => {
    startTrackedRef.current = true;
    completionTrackedRef.current = false;
    trackMatchStart({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
    });
    game.playAgain();
  };

  const shellColor =
    game.phase === GAME_PHASES.INTRO
      ? "#000000"
      : game.phase === GAME_PHASES.MEMORIZE
        ? game.targetColor
        : game.phase === GAME_PHASES.GUESS
          ? game.guessColor
          : null;

  return (
    <main className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <GameCardShell
        color={shellColor}
        isExpanded={game.phase === GAME_PHASES.FINAL}
      >
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
                durationMs={game.revealDurationMs}
                onColorChange={game.setTargetColor}
                onComplete={game.finishMemorize}
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                roundLabel={currentRoundLabel}
                durationMs={game.revealDurationMs}
                onComplete={game.finishMemorize}
              />
            )
          )}

          {game.phase === GAME_PHASES.GUESS && (
            <GuessPhase
              key={`guess-${game.roundIndex}`}
              round={game.roundIndex + 1}
              roundLabel={currentRoundLabel}
              difficulty={game.difficulty}
              guessColor={game.guessColor}
              onGuessChange={game.updateGuess}
              onSubmit={game.submitGuess}
              guessDurationMs={game.guessDurationMs}
            />
          )}

          {game.phase === GAME_PHASES.RESULT && (
            <ResultPhase
              key={`result-${game.roundIndex}`}
              result={latestResult}
              roundLabel={latestResultRoundLabel}
              hasNextRound={game.isEndlessMode || game.roundIndex + 1 < ROUND_COUNT}
              canFinishRun={game.isEndlessMode}
              onFinishRun={game.finishRun}
              onContinue={game.continueFromResult}
            />
          )}

          {game.phase === GAME_PHASES.FINAL && (
            <FinalSummary
              results={game.results}
              totalScore={game.summary.totalScore}
              averageScore={game.summary.averageScore}
              maxScore={game.summary.maxScore}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </div>
      </GameCardShell>
    </main>
  );
}
