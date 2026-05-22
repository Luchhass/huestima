"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  ROUND_COUNT,
} from "@/lib/constants";
import { randomTargetColor, withHex } from "@/lib/color";
import {
  applyDifficultyConstraints,
  getDifficultyOption,
} from "@/lib/difficulty";
import { getGameModeOption } from "@/lib/gameMode";
import { calculateColorScore, getGradeLabel } from "@/lib/scoring";

export const GAME_PHASES = {
  INTRO: "intro",
  MEMORIZE: "memorize",
  GUESS: "guess",
  RESULT: "result",
  FINAL: "final",
};

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function createDefaultGuess(difficulty) {
  return withHex(applyDifficultyConstraints(difficulty.defaultGuess, difficulty));
}

function createTargetColors(difficultyId) {
  return Array.from({ length: ROUND_COUNT }, () => randomTargetColor(difficultyId));
}

export function useSingleplayerGame(
  difficultyId = DEFAULT_DIFFICULTY_ID,
  gameModeId = DEFAULT_GAME_MODE_ID,
) {
  const difficulty = useMemo(() => getDifficultyOption(difficultyId), [difficultyId]);
  const gameMode = useMemo(() => getGameModeOption(gameModeId), [gameModeId]);
  const isSequenceMode = gameMode.id === GAME_MODE_IDS.SEQUENCE;
  const [phase, setPhase] = useState(GAME_PHASES.INTRO);
  const [roundIndex, setRoundIndex] = useState(0);
  const [targetColor, setTargetColor] = useState(null);
  const [targetColors, setTargetColors] = useState([]);
  const [guessColor, setGuessColor] = useState(() => createDefaultGuess(difficulty));
  const [results, setResults] = useState([]);

  const startRound = useCallback((nextRoundIndex) => {
    setRoundIndex(nextRoundIndex);
    setGuessColor(createDefaultGuess(difficulty));

    if (isSequenceMode) {
      const sequenceColors = createTargetColors(difficulty.id);
      setTargetColors(sequenceColors);
      setTargetColor(sequenceColors[0]);
      setPhase(GAME_PHASES.MEMORIZE);
      return;
    }

    setTargetColors([]);
    setTargetColor(randomTargetColor(difficulty.id));
    setPhase(GAME_PHASES.MEMORIZE);
  }, [difficulty, isSequenceMode]);

  const finishIntro = useCallback(() => {
    startRound(roundIndex);
  }, [roundIndex, startRound]);

  const finishMemorize = useCallback(() => {
    if (isSequenceMode) {
      setTargetColor(targetColors[roundIndex] || null);
    }

    setPhase(GAME_PHASES.GUESS);
  }, [isSequenceMode, roundIndex, targetColors]);

  const updateGuess = useCallback((nextGuess) => {
    setGuessColor(withHex(applyDifficultyConstraints(nextGuess, difficulty)));
  }, [difficulty]);

  const submitGuess = useCallback(() => {
    const activeTarget = isSequenceMode
      ? targetColors[roundIndex]
      : targetColor;

    if (!activeTarget) return;

    const finalGuess = withHex(applyDifficultyConstraints(guessColor, difficulty));
    const score = calculateColorScore(activeTarget.hex, finalGuess.hex);
    const result = {
      round: roundIndex + 1,
      target: activeTarget,
      guess: finalGuess,
      score,
      grade: getGradeLabel(score),
      difficulty: difficulty.id,
      gameMode: gameMode.id,
    };

    setResults((currentResults) => [...currentResults, result]);
    setPhase(GAME_PHASES.RESULT);
  }, [
    difficulty,
    gameMode,
    guessColor,
    isSequenceMode,
    roundIndex,
    targetColor,
    targetColors,
  ]);

  const continueFromResult = useCallback(() => {
    if (roundIndex + 1 >= ROUND_COUNT) {
      setPhase(GAME_PHASES.FINAL);
      return;
    }

    const nextRoundIndex = roundIndex + 1;

    setRoundIndex(nextRoundIndex);
    setGuessColor(createDefaultGuess(difficulty));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    setTargetColor(null);
    setPhase(GAME_PHASES.INTRO);
  }, [difficulty, isSequenceMode, roundIndex, targetColors]);

  const playAgain = useCallback(() => {
    setResults([]);
    setRoundIndex(0);
    setTargetColor(null);
    setTargetColors([]);
    setGuessColor(createDefaultGuess(difficulty));
    setPhase(GAME_PHASES.INTRO);
  }, [difficulty]);

  const summary = useMemo(() => {
    const totalScore = roundScore(results.reduce((sum, result) => sum + result.score, 0));
    const averageScore = results.length ? roundScore(totalScore / results.length) : 0;

    return {
      totalScore,
      averageScore,
    };
  }, [results]);

  return {
    difficulty,
    gameMode,
    isSequenceMode,
    phase,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs: gameMode.revealDurationMs,
    guessColor,
    results,
    summary,
    setTargetColor,
    finishIntro,
    finishMemorize,
    updateGuess,
    submitGuess,
    continueFromResult,
    playAgain,
  };
}
