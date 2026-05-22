"use client";

import { ROUND_COUNT } from "@/lib/constants";
import { useGameChrome } from "@/hooks/useGameChrome";
import { GAME_PHASES, useSingleplayerGame } from "@/hooks/useSingleplayerGame";
import GameCardShell from "@/components/ui/game/GameCardShell";
import IntroPhase from "@/components/ui/game/IntroPhase";
import MemorizePhase from "@/components/ui/game/MemorizePhase";
import SequenceMemorizePhase from "@/components/ui/game/SequenceMemorizePhase";
import GuessPhase from "@/components/ui/game/GuessPhase";
import ResultPhase from "@/components/ui/game/ResultPhase";
import FinalSummary from "@/components/ui/game/FinalSummary";

export default function SingleplayerGame({ initialDifficulty, initialGameMode }) {
  const game = useSingleplayerGame(initialDifficulty, initialGameMode);
  const latestResult = game.results[game.results.length - 1];
  const isImmersivePhase = game.phase !== GAME_PHASES.FINAL;

  useGameChrome(isImmersivePhase);

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
                durationMs={game.revealDurationMs}
                onColorChange={game.setTargetColor}
                onComplete={game.finishMemorize}
              />
            ) : (
              <MemorizePhase
                key={`memorize-${game.roundIndex}`}
                round={game.roundIndex + 1}
                durationMs={game.revealDurationMs}
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
              result={latestResult}
              hasNextRound={game.roundIndex + 1 < ROUND_COUNT}
              onContinue={game.continueFromResult}
            />
          )}

          {game.phase === GAME_PHASES.FINAL && (
            <FinalSummary
              results={game.results}
              totalScore={game.summary.totalScore}
              averageScore={game.summary.averageScore}
              onPlayAgain={game.playAgain}
            />
          )}
        </div>
      </GameCardShell>
    </main>
  );
}
