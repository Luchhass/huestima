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
  withCartoonDifficultyHex,
  withFlagDifficultyHex,
  withGradientHex,
  withHex,
} from "@/lib/color";
import {
  applyDifficultyConstraints,
  getDifficultyOption,
} from "@/lib/difficulty";
import { getGameModeOption } from "@/lib/gameMode";
import {
  earnsHint,
  getInitialHintCount,
  normalizeHintsEnabled,
} from "@/lib/hints";
import { normalizeRoundCount } from "@/lib/roundCount";
import {
  isCartoonFamily,
  isFlagFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
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

function createDefaultGuess(difficulty, gameMode, gameFamily, targetColor = null) {
  if (gameMode?.id === GAME_MODE_IDS.GRADIENT) {
    return createDefaultGradientGuess();
  }

  if (isFlagFamily(gameFamily)) {
    return createDefaultFlagGuess(targetColor, difficulty);
  }

  if (isCartoonFamily(gameFamily)) {
    return createDefaultCartoonGuess(targetColor, difficulty);
  }

  return withHex(applyDifficultyConstraints(difficulty.defaultGuess, difficulty));
}

function constrainGuessColor(
  guessColor,
  difficulty,
  gameMode,
  gameFamily,
  targetColor = null,
) {
  if (gameMode.id === GAME_MODE_IDS.GRADIENT || isGradientColor(guessColor)) {
    return withGradientHex(guessColor);
  }

  if (isFlagFamily(gameFamily) || isFlagColor(guessColor)) {
    return withFlagDifficultyHex(guessColor, targetColor, difficulty);
  }

  if (isCartoonFamily(gameFamily) || isCartoonColor(guessColor)) {
    return withCartoonDifficultyHex(guessColor, targetColor, difficulty);
  }

  return withHex(applyDifficultyConstraints(guessColor, difficulty));
}

function createTargetColors(difficultyId, gameModeId, gameFamily, roundCount) {
  if (isFlagFamily(gameFamily)) {
    return randomFlagTargetColors(roundCount);
  }

  if (isCartoonFamily(gameFamily)) {
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
  hintsEnabledValue = true,
  gameFamily = "color",
) {
  const cleanGameFamily = useMemo(
    () => normalizeGameFamily(gameFamily),
    [gameFamily],
  );
  const difficulty = useMemo(() => getDifficultyOption(difficultyId), [difficultyId]);
  const gameMode = useMemo(
    () => getGameModeOption(gameModeId, undefined, cleanGameFamily),
    [cleanGameFamily, gameModeId],
  );
  const roundCount = useMemo(
    () => normalizeRoundCount(roundCountValue),
    [roundCountValue],
  );
  const hintsEnabled = useMemo(
    () => normalizeHintsEnabled(hintsEnabledValue, true),
    [hintsEnabledValue],
  );
  const isSequenceMode = gameMode.id === GAME_MODE_IDS.SEQUENCE;
  const isGradientMode = gameMode.id === GAME_MODE_IDS.GRADIENT;
  const isEndlessMode = gameMode.id === GAME_MODE_IDS.ENDLESS;
  const isFlagMode = isFlagFamily(cleanGameFamily);
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
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
    createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily),
  );
  const [results, setResults] = useState([]);
  const [hintCount, setHintCount] = useState(() =>
    hintsEnabled ? getInitialHintCount(roundCount) : 0,
  );
  const [hintActive, setHintActive] = useState(false);

  const startRound = useCallback((nextRoundIndex) => {
    setRoundIndex(nextRoundIndex);
    setHintActive(false);

    if (isSequenceMode) {
      const sequenceColors = createTargetColors(
        effectiveDifficulty.id,
        gameMode.id,
        cleanGameFamily,
        roundCount,
      );
      setTargetColors(sequenceColors);
      setTargetColor(sequenceColors[0]);
      setGuessColor(
        createDefaultGuess(
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          sequenceColors[0],
        ),
      );
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
      setGuessColor(
        createDefaultGuess(
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          nextTargetColor,
        ),
      );
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
      setGuessColor(
        createDefaultGuess(
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          nextTargetColor,
        ),
      );
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    const nextTargetColor = randomTargetColor(effectiveDifficulty.id, gameMode.id);

    setTargetColors([]);
    setTargetColor(nextTargetColor);
    setGuessColor(
      createDefaultGuess(
        effectiveDifficulty,
        gameMode,
        cleanGameFamily,
        nextTargetColor,
      ),
    );
    setPhase(GAME_PHASES.MEMORIZE);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    isCartoonMode,
    isFlagMode,
    isSequenceMode,
    roundCount,
    targetColors,
  ]);

  const useHint = useCallback(() => {
    if (!hintsEnabled || hintCount <= 0 || hintActive) return;

    setHintCount((currentCount) => Math.max(0, currentCount - 1));
    setHintActive(true);
  }, [hintActive, hintCount, hintsEnabled]);

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
    const activeTarget = isSequenceMode
      ? targetColors[roundIndex]
      : targetColor;

    setGuessColor(
      constrainGuessColor(
        nextGuess,
        effectiveDifficulty,
        gameMode,
        cleanGameFamily,
        activeTarget,
      ),
    );
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    isSequenceMode,
    roundIndex,
    targetColor,
    targetColors,
  ]);

  const submitGuess = useCallback(() => {
    const activeTarget = isSequenceMode
      ? targetColors[roundIndex]
      : targetColor;

    if (!activeTarget) return;

    const finalGuess = constrainGuessColor(
      guessColor,
      effectiveDifficulty,
      gameMode,
      cleanGameFamily,
      activeTarget,
    );
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
    if (hintsEnabled && earnsHint(score)) {
      setHintCount((currentCount) => currentCount + 1);
    }
    setPhase(GAME_PHASES.RESULT);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    guessColor,
    hintsEnabled,
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
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    setTargetColor(null);
    setPhase(GAME_PHASES.INTRO);
  }, [
    cleanGameFamily,
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
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));
    setHintCount(hintsEnabled ? getInitialHintCount(roundCount) : 0);
    setHintActive(false);
    setPhase(GAME_PHASES.INTRO);
  }, [cleanGameFamily, effectiveDifficulty, gameMode, hintsEnabled, roundCount]);

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
    gameFamily: cleanGameFamily,
    roundCount,
    hintsEnabled,
    hintCount,
    hintActive,
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
    useHint,
    submitGuess,
    continueFromResult,
    finishRun,
    playAgain,
  };
}
