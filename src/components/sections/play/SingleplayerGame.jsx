"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_MODE_IDS } from "@/lib/constants";
import { useGameChrome } from "@/hooks/useGameChrome";
import { useFlagFullscreenLock } from "@/hooks/useFlagFullscreenLock";
import { GAME_PHASES, useSingleplayerGame } from "@/hooks/useSingleplayerGame";
import { trackMatchEnd, trackMatchStart } from "@/lib/analytics";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import FinalSummary from "@/components/ui/game/FinalSummary";

const FLAG_WIDGET_EXIT_DELAY_MS = 680;

export default function SingleplayerGame({
  initialDifficulty,
  initialGameMode,
  initialRoundCount,
}) {
  const game = useSingleplayerGame(
    initialDifficulty,
    initialGameMode,
    initialRoundCount,
  );
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const latestResult = game.results[game.results.length - 1];
  const isImmersivePhase = game.phase !== GAME_PHASES.FINAL;
  const currentRoundLabel = game.isEndlessMode
    ? `${game.roundIndex + 1}/${game.roundIndex + 1}`
    : `${game.roundIndex + 1}/${game.roundCount}`;
  const latestResultRoundLabel =
    latestResult
      ? game.isEndlessMode
        ? `${latestResult.round}/${latestResult.round}`
        : `${latestResult.round}/${game.roundCount}`
      : undefined;
  const isFlagMode = game.gameMode.id === GAME_MODE_IDS.FLAG;
  const [renderedPhase, setRenderedPhase] = useState(game.phase);
  const [isFlagWidgetExiting, setIsFlagWidgetExiting] = useState(false);
  const isRenderedFlagGuessPhase =
    isFlagMode && renderedPhase === GAME_PHASES.GUESS;

  useGameChrome(isImmersivePhase);
  useFlagFullscreenLock(isFlagMode);

  useEffect(() => {
    if (game.phase === renderedPhase) return undefined;

    if (renderedPhase === GAME_PHASES.GUESS && isFlagMode) {
      const exitStartId = window.setTimeout(() => {
        setIsFlagWidgetExiting(true);
      }, 0);

      const timeoutId = window.setTimeout(() => {
        setRenderedPhase(game.phase);
        setIsFlagWidgetExiting(false);
      }, FLAG_WIDGET_EXIT_DELAY_MS);

      return () => {
        window.clearTimeout(exitStartId);
        window.clearTimeout(timeoutId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      setRenderedPhase(game.phase);
      setIsFlagWidgetExiting(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [game.phase, isFlagMode, renderedPhase]);

  useEffect(() => {
    if (startTrackedRef.current) return;

    startTrackedRef.current = true;
    trackMatchStart({
      gameType: "singleplayer",
      difficulty: game.difficulty.id,
      gameMode: game.gameMode.id,
      rounds: game.roundCount,
    });
  }, [game.difficulty.id, game.gameMode.id, game.roundCount]);

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
      rounds: game.roundCount,
    });
    game.playAgain();
  };
  const handleFlagSlotSelect = (slotId) => {
    const selectedSlot = game.guessColor.slots?.find((slotColor) => slotColor.id === slotId);

    game.updateGuess({
      ...game.guessColor,
      activeSlotId: slotId,
      h: selectedSlot?.h ?? game.guessColor.h,
      s: selectedSlot?.s ?? game.guessColor.s,
      v: selectedSlot?.v ?? game.guessColor.v,
    });
  };

  const shellColor =
    renderedPhase === GAME_PHASES.INTRO
      ? "#000000"
      : renderedPhase === GAME_PHASES.MEMORIZE
        ? game.targetColor
        : renderedPhase === GAME_PHASES.GUESS
          ? game.guessColor
          : null;

  return (
    <main
      className="game-stage app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8"
      style={
        isRenderedFlagGuessPhase
          ? { "--flag-control-count": game.difficulty?.controls?.length || 3 }
          : undefined
      }
    >
      <GameCardShell
        color={shellColor}
        className={`${isRenderedFlagGuessPhase ? "flag-game-card-shell" : ""} ${
          isFlagWidgetExiting ? "flag-game-card-shell--exiting" : ""
        }`}
        flagOverlayProps={
          isRenderedFlagGuessPhase
            ? {
                isInteractive: true,
                activeSlotId: game.guessColor.activeSlotId,
                onSlotSelect: handleFlagSlotSelect,
              }
            : undefined
        }
        isExpanded={renderedPhase === GAME_PHASES.FINAL}
      >
        <div className="h-full min-h-[inherit]">
          {renderedPhase === GAME_PHASES.INTRO && (
            <IntroPhase
              key={`intro-${game.roundIndex}`}
              onComplete={game.finishIntro}
            />
          )}

          {renderedPhase === GAME_PHASES.MEMORIZE && game.targetColor && (
            game.isSequenceMode ? (
              <SequenceMemorizePhase
                key="sequence-memorize"
                colors={game.targetColors}
                durationMs={game.revealDurationMs}
                roundCount={game.roundCount}
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

          {renderedPhase === GAME_PHASES.GUESS && (
            <GuessPhase
              key={`guess-${game.roundIndex}`}
              round={game.roundIndex + 1}
              roundLabel={currentRoundLabel}
              difficulty={game.difficulty}
              targetColor={game.targetColor}
              guessColor={game.guessColor}
              onGuessChange={game.updateGuess}
              onSubmit={game.submitGuess}
              guessDurationMs={game.guessDurationMs}
              isFlagWidgetExiting={isFlagWidgetExiting}
            />
          )}

          {renderedPhase === GAME_PHASES.RESULT && (
            <ResultPhase
              key={`result-${game.roundIndex}`}
              result={latestResult}
              roundLabel={latestResultRoundLabel}
              hasNextRound={game.isEndlessMode || game.roundIndex + 1 < game.roundCount}
              canFinishRun={game.isEndlessMode}
              onFinishRun={game.finishRun}
              onContinue={game.continueFromResult}
            />
          )}

          {renderedPhase === GAME_PHASES.FINAL && (
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
