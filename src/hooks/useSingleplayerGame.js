"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  MAX_ROUND_SCORE,
} from "@/lib/constants";
import {
  createDefaultCartoonGuess,
  createDefaultGradientGuess,
  createDefaultFlagGuess,
  isCartoonColor,
  isGradientColor,
  isFlagColor,
  randomCartoonTargetColors,
  randomFlagTargetColors,
  randomTargetColor,
  withCartoonHex,
  withFlagHex,
  withGradientHex,
  withHex,
} from "@/lib/color";
import {
  applyDifficultyConstraints,
  getDifficultyOption,
} from "@/lib/difficulty";
import { getGameModeOption } from "@/lib/gameMode";
import { normalizeRoundCount } from "@/lib/roundCount";
import {
  calculateColorMatchDistance,
  calculateColorMatchScore,
  getGradeLabel,
} from "@/lib/scoring";

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

function createDefaultGuess(difficulty, gameMode, targetColor = null) {
  if (gameMode?.id === GAME_MODE_IDS.GRADIENT) {
    return createDefaultGradientGuess();
  }

  if (gameMode?.id === GAME_MODE_IDS.FLAG) {
    return createDefaultFlagGuess(targetColor);
  }

  if (gameMode?.id === GAME_MODE_IDS.CARTOON) {
    return createDefaultCartoonGuess(targetColor);
  }

  return withHex(applyDifficultyConstraints(difficulty.defaultGuess, difficulty));
}

function constrainGuessColor(guessColor, difficulty, gameMode) {
  if (gameMode.id === GAME_MODE_IDS.GRADIENT || isGradientColor(guessColor)) {
    return withGradientHex(guessColor);
  }

  if (gameMode.id === GAME_MODE_IDS.FLAG || isFlagColor(guessColor)) {
    return withFlagHex(guessColor);
  }

  if (gameMode.id === GAME_MODE_IDS.CARTOON || isCartoonColor(guessColor)) {
    return withCartoonHex(guessColor);
  }

  return withHex(applyDifficultyConstraints(guessColor, difficulty));
}

function createTargetColors(difficultyId, gameModeId, roundCount) {
  if (gameModeId === GAME_MODE_IDS.FLAG) {
    return randomFlagTargetColors(roundCount);
  }

  if (gameModeId === GAME_MODE_IDS.CARTOON) {
    return randomCartoonTargetColors(roundCount);
  }

  return Array.from({ length: roundCount }, () =>
    randomTargetColor(difficultyId, gameModeId),
  );
}

export function useSingleplayerGame(
  difficultyId = DEFAULT_DIFFICULTY_ID,
  gameModeId = DEFAULT_GAME_MODE_ID,
  roundCountValue,
) {
  const difficulty = useMemo(() => getDifficultyOption(difficultyId), [difficultyId]);
  const gameMode = useMemo(() => getGameModeOption(gameModeId), [gameModeId]);
  const roundCount = useMemo(
    () => normalizeRoundCount(roundCountValue),
    [roundCountValue],
  );
  const isSequenceMode = gameMode.id === GAME_MODE_IDS.SEQUENCE;
  const isGradientMode = gameMode.id === GAME_MODE_IDS.GRADIENT;
  const isEndlessMode = gameMode.id === GAME_MODE_IDS.ENDLESS;
  const isFlagMode = gameMode.id === GAME_MODE_IDS.FLAG;
  const isCartoonMode = gameMode.id === GAME_MODE_IDS.CARTOON;
  const lockedDifficultyId = gameMode.lockedDifficultyId || null;
  const effectiveDifficulty = useMemo(
    () => (lockedDifficultyId ? getDifficultyOption(lockedDifficultyId) : difficulty),
    [difficulty, lockedDifficultyId],
  );
  const [phase, setPhase] = useState(GAME_PHASES.INTRO);
  const [roundIndex, setRoundIndex] = useState(0);
  const [targetColor, setTargetColor] = useState(null);
  const [targetColors, setTargetColors] = useState([]);
  const [guessColor, setGuessColor] = useState(() =>
    createDefaultGuess(effectiveDifficulty, gameMode),
  );
  const [results, setResults] = useState([]);

  const startRound = useCallback((nextRoundIndex) => {
    setRoundIndex(nextRoundIndex);

    if (isSequenceMode) {
      const sequenceColors = createTargetColors(
        effectiveDifficulty.id,
        gameMode.id,
        roundCount,
      );
      setTargetColors(sequenceColors);
      setTargetColor(sequenceColors[0]);
      setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, sequenceColors[0]));
      setPhase(GAME_PHASES.MEMORIZE);
      return;
    }

    if (isFlagMode) {
      const flagTargetColors =
        nextRoundIndex === 0 || targetColors.length < roundCount
          ? randomFlagTargetColors(roundCount)
          : targetColors;
      const nextTargetColor = flagTargetColors[nextRoundIndex];

      setTargetColors(flagTargetColors);
      setTargetColor(nextTargetColor);
      setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, nextTargetColor));
      setPhase(GAME_PHASES.MEMORIZE);
      return;
    }

    if (isCartoonMode) {
      const cartoonTargetColors =
        nextRoundIndex === 0 || targetColors.length < roundCount
          ? randomCartoonTargetColors(roundCount)
          : targetColors;
      const nextTargetColor = cartoonTargetColors[nextRoundIndex];

      setTargetColors(cartoonTargetColors);
      setTargetColor(nextTargetColor);
      setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, nextTargetColor));
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    const nextTargetColor = randomTargetColor(effectiveDifficulty.id, gameMode.id);

    setTargetColors([]);
    setTargetColor(nextTargetColor);
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, nextTargetColor));
    setPhase(GAME_PHASES.MEMORIZE);
  }, [
    effectiveDifficulty,
    gameMode,
    isCartoonMode,
    isFlagMode,
    isSequenceMode,
    roundCount,
    targetColors,
  ]);

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
    setGuessColor(constrainGuessColor(nextGuess, effectiveDifficulty, gameMode));
  }, [effectiveDifficulty, gameMode]);

  const submitGuess = useCallback(() => {
    const activeTarget = isSequenceMode
      ? targetColors[roundIndex]
      : targetColor;

    if (!activeTarget) return;

    const finalGuess = constrainGuessColor(guessColor, effectiveDifficulty, gameMode);
    const score = roundScore(calculateColorMatchScore(activeTarget, finalGuess));
    const result = {
      round: roundIndex + 1,
      target: activeTarget,
      guess: finalGuess,
      score,
      grade: getGradeLabel(score),
      difference: {
        deltaE2000: roundScore(calculateColorMatchDistance(activeTarget, finalGuess)),
      },
      difficulty: effectiveDifficulty.id,
      gameMode: gameMode.id,
    };

    setResults((currentResults) => [...currentResults, result]);
    setPhase(GAME_PHASES.RESULT);
  }, [
    effectiveDifficulty,
    gameMode,
    guessColor,
    isSequenceMode,
    roundIndex,
    targetColor,
    targetColors,
  ]);

  const continueFromResult = useCallback(() => {
    if (!isEndlessMode && roundIndex + 1 >= roundCount) {
      setPhase(GAME_PHASES.FINAL);
      return;
    }

    const nextRoundIndex = roundIndex + 1;

    setRoundIndex(nextRoundIndex);
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    setTargetColor(null);
    setPhase(GAME_PHASES.INTRO);
  }, [
    effectiveDifficulty,
    gameMode,
    isEndlessMode,
    isSequenceMode,
    roundCount,
    roundIndex,
    targetColors,
  ]);

  const finishRun = useCallback(() => {
    if (!results.length) return;

    setPhase(GAME_PHASES.FINAL);
  }, [results.length]);

  const playAgain = useCallback(() => {
    setResults([]);
    setRoundIndex(0);
    setTargetColor(null);
    setTargetColors([]);
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode));
    setPhase(GAME_PHASES.INTRO);
  }, [effectiveDifficulty, gameMode]);

  const summary = useMemo(() => {
    const totalScore = roundScore(results.reduce((sum, result) => sum + result.score, 0));
    const averageScore = results.length ? roundScore(totalScore / results.length) : 0;
    const maxScore = (isEndlessMode ? Math.max(results.length, 1) : roundCount) *
      MAX_ROUND_SCORE;

    return {
      totalScore,
      averageScore,
      maxScore,
    };
  }, [isEndlessMode, results, roundCount]);

  return {
    difficulty: effectiveDifficulty,
    gameMode,
    isSequenceMode,
    isGradientMode,
    isEndlessMode,
    isCartoonMode,
    roundCount,
    phase,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs: gameMode.revealDurationMs,
    guessDurationMs: gameMode.guessDurationMs || null,
    guessColor,
    results,
    summary,
    setTargetColor,
    finishIntro,
    finishMemorize,
    updateGuess,
    submitGuess,
    continueFromResult,
    finishRun,
    playAgain,
  };
}
