"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  MAX_ROUND_SCORE,
} from "@/lib/constants";
import {
  createDefaultCartoonGuess,
  createDefaultBrandGuess,
  createDefaultGradientGuess,
  createDefaultFlagGuess,
  isCartoonColor,
  isBrandColor,
  isGradientColor,
  isFlagColor,
  randomCartoonTargetColors,
  randomBrandTargetColors,
  randomFlagTargetColors,
  randomTargetColor,
  withCartoonDifficultyHex,
  withBrandDifficultyHex,
  createDefaultTeamGuess,
  randomTeamTargetColors,
  withTeamDifficultyHex,
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
  isBrandFamily,
  isTeamFamily,
  isLogoFamily,
  isFlagFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import {
  calculateColorMatchDistance,
  calculateColorMatchScore,
  getGradeLabel,
} from "@/lib/scoring";
import {
  buildGameSessionKey,
  clearGameSession,
  getGameSession,
  saveGameSession,
} from "@/hooks/useGameSession";
import { createMatchHistoryId } from "@/lib/matchHistory";

export const GAME_PHASES = {
  INTRO: "intro",
  MEMORIZE: "memorize",
  GUESS: "guess",
  RESULT: "result",
  FINAL: "final",
};

function roundScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function normalizeRoundResults(results) {
  if (!Array.isArray(results)) return [];

  const uniqueResults = new Map();

  for (const result of results) {
    const roundIndex = Number.isInteger(result?.roundIndex)
      ? result.roundIndex
      : Number.isInteger(result?.round)
        ? result.round - 1
        : null;

    if (
      roundIndex === null ||
      roundIndex < 0 ||
      !Number.isFinite(Number(result?.score)) ||
      uniqueResults.has(roundIndex)
    ) {
      continue;
    }

    uniqueResults.set(roundIndex, {
      ...result,
      round: roundIndex + 1,
      roundIndex,
      score: Number(result.score),
    });
  }

  return Array.from(uniqueResults.values()).sort(
    (first, second) => first.roundIndex - second.roundIndex,
  );
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

  if (isLogoFamily(gameFamily)) {
    return isTeamFamily(gameFamily)
      ? createDefaultTeamGuess(targetColor, difficulty)
      : createDefaultBrandGuess(targetColor, difficulty);
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

  if (isTeamFamily(gameFamily)) return withTeamDifficultyHex(guessColor, targetColor, difficulty);

  if (isBrandFamily(gameFamily) || isBrandColor(guessColor)) {
    return withBrandDifficultyHex(guessColor, targetColor, difficulty);
  }

  return withHex(applyDifficultyConstraints(guessColor, difficulty));
}

function createTargetColors(difficultyId, gameModeId, gameFamily, roundCount, flagDifficulty, cartoonIds, teamIds) {
  if (isFlagFamily(gameFamily)) {
    return randomFlagTargetColors(roundCount, Math.random, flagDifficulty);
  }

  if (isCartoonFamily(gameFamily)) {
    return randomCartoonTargetColors(roundCount, Math.random, cartoonIds);
  }

  if (isBrandFamily(gameFamily)) {
    return randomBrandTargetColors(roundCount);
  }

  if (isTeamFamily(gameFamily)) return randomTeamTargetColors(roundCount, Math.random, teamIds);

  return Array.from({ length: roundCount }, () =>
    randomTargetColor(difficultyId, gameModeId),
  );
}

function hasValidBrandTargets(colors, roundCount) {
  return (
    Array.isArray(colors) &&
    colors.length >= roundCount &&
    colors.slice(0, roundCount).every(isBrandColor)
  );
}

function normalizeBrandTargets(colors, roundCount) {
  return hasValidBrandTargets(colors, roundCount)
    ? colors
    : randomBrandTargetColors(roundCount);
}

export function useSingleplayerGame(
  difficultyId = DEFAULT_DIFFICULTY_ID,
  gameModeId = DEFAULT_GAME_MODE_ID,
  roundCountValue,
  hintsEnabledValue = true,
  gameFamily = "color",
  flagDifficulty = null,
  cartoonIds = null,
  teamIds = null,
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
  const isFlagRecallMode = gameMode.id === GAME_MODE_IDS.FLAG_RECALL;
  const isFlagSprintMode = gameMode.id === GAME_MODE_IDS.FLAG_SPRINT;
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
  const isCartoonSceneMode = gameMode.id === GAME_MODE_IDS.CARTOON;
  const isBrandMode = isLogoFamily(cleanGameFamily);
  const isBrandRecallMode = gameMode.id === GAME_MODE_IDS.BRAND_RECALL || gameMode.id === GAME_MODE_IDS.TEAM_RECALL;
  const lockedDifficultyId = gameMode.lockedDifficultyId || null;
  const effectiveDifficulty = useMemo(
    () => (lockedDifficultyId ? getDifficultyOption(lockedDifficultyId) : difficulty),
    [difficulty, lockedDifficultyId],
  );
  const gameSessionKey = useMemo(
    () =>
      buildGameSessionKey("singleplayer", [
        cleanGameFamily,
        effectiveDifficulty.id,
        gameMode.id,
        roundCount,
        hintsEnabled ? "hints-on" : "hints-off",
      ]),
    [
      cleanGameFamily,
      effectiveDifficulty.id,
      gameMode.id,
      hintsEnabled,
      roundCount,
    ],
  );
  const initialGameSession = useMemo(
    () => getGameSession(gameSessionKey),
    [gameSessionKey],
  );
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASES.INTRO);
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => Date.now());
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
  const [resumeSavedAt, setResumeSavedAt] = useState(null);
  const [historyMatchId, setHistoryMatchId] = useState(() =>
    initialGameSession?.historyMatchId || createMatchHistoryId(),
  );
  const restoredFromSession = Boolean(initialGameSession);
  const snapshotRef = useRef(null);
  const submittedRoundRef = useRef(null);
  const continuedRoundRef = useRef(null);
  const completedIntroRoundRef = useRef(null);
  const completedMemorizeRoundRef = useRef(null);
  const hintActionRef = useRef(false);

  const transitionToPhase = useCallback((nextPhase) => {
    setPhaseStartedAt(Date.now());
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (initialGameSession) {
        const restoredPhase = Object.values(GAME_PHASES).includes(initialGameSession.phase)
          ? initialGameSession.phase
          : GAME_PHASES.INTRO;
        const restoredRoundIndex = Math.min(
          Math.max(Number(initialGameSession.roundIndex) || 0, 0),
          Math.max(roundCount - 1, 0),
        );

        setPhase(restoredPhase);
        setPhaseStartedAt(
          Number.isFinite(initialGameSession.phaseStartedAt)
            ? initialGameSession.phaseStartedAt
            : Date.now(),
        );
        setRoundIndex(restoredRoundIndex);
        const restoredTargetColors = isBrandMode
          ? normalizeBrandTargets(initialGameSession.targetColors, roundCount)
          : initialGameSession.targetColors || [];
        const restoredTargetColor = isBrandMode
          ? isBrandColor(initialGameSession.targetColor)
            ? initialGameSession.targetColor
            : restoredTargetColors[restoredRoundIndex] || null
          : initialGameSession.targetColor || null;

        setTargetColor(restoredTargetColor);
        setTargetColors(restoredTargetColors);
        setGuessColor(
          isBrandMode
            ? isBrandColor(initialGameSession.guessColor)
              ? constrainGuessColor(
                  initialGameSession.guessColor,
                  effectiveDifficulty,
                  gameMode,
                  cleanGameFamily,
                  restoredTargetColor,
                )
              : createDefaultGuess(
                  effectiveDifficulty,
                  gameMode,
                  cleanGameFamily,
                  restoredTargetColor,
                )
            : initialGameSession.guessColor ||
              createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily),
        );
        setResults(normalizeRoundResults(initialGameSession.results));
        setHintCount(
          Number.isFinite(initialGameSession.hintCount)
            ? initialGameSession.hintCount
            : hintsEnabled
              ? getInitialHintCount(roundCount)
              : 0,
        );
        setHintActive(Boolean(initialGameSession.hintActive));
        hintActionRef.current = Boolean(initialGameSession.hintActive);
        setResumeSavedAt(
          Number.isFinite(initialGameSession.savedAt)
            ? initialGameSession.savedAt
            : Date.now(),
        );
        setHistoryMatchId(
          initialGameSession.historyMatchId || createMatchHistoryId(),
        );
      } else {
        setPhaseStartedAt(Date.now());
        setResumeSavedAt(null);
        setHistoryMatchId(createMatchHistoryId());
      }

      setHasRestoredSession(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    hintsEnabled,
    initialGameSession,
    isBrandMode,
    roundCount,
  ]);

  useEffect(() => {
    if (!hasRestoredSession) return;

    saveGameSession(gameSessionKey, {
      historyMatchId,
      phase,
      phaseStartedAt,
      roundIndex,
      targetColor,
      targetColors,
      guessColor,
      results,
      hintCount,
      hintActive,
    });
  }, [
    gameSessionKey,
    guessColor,
    hasRestoredSession,
    historyMatchId,
    hintActive,
    hintCount,
    phase,
    phaseStartedAt,
    results,
    roundIndex,
    targetColor,
    targetColors,
  ]);

  useEffect(() => {
    snapshotRef.current = {
      historyMatchId,
      phase,
      phaseStartedAt,
      roundIndex,
      targetColor,
      targetColors,
      guessColor,
      results,
      hintCount,
      hintActive,
    };
  }, [
    guessColor,
    historyMatchId,
    hintActive,
    hintCount,
    phase,
    phaseStartedAt,
    results,
    roundIndex,
    targetColor,
    targetColors,
  ]);

  useEffect(() => {
    if (!hasRestoredSession) return undefined;

    const persistLatestSnapshot = () => {
      if (!snapshotRef.current) return;
      saveGameSession(gameSessionKey, snapshotRef.current);
    };

    window.addEventListener("pagehide", persistLatestSnapshot);
    window.addEventListener("beforeunload", persistLatestSnapshot);

    return () => {
      window.removeEventListener("pagehide", persistLatestSnapshot);
      window.removeEventListener("beforeunload", persistLatestSnapshot);
    };
  }, [gameSessionKey, hasRestoredSession]);

  const startRound = useCallback((nextRoundIndex) => {
    setRoundIndex(nextRoundIndex);
    hintActionRef.current = false;
    setHintActive(false);

    if (isSequenceMode) {
      const sequenceColors = createTargetColors(
        effectiveDifficulty.id,
        gameMode.id,
        cleanGameFamily,
        roundCount,
        flagDifficulty,
        cartoonIds,
        teamIds,
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
      transitionToPhase(
        isBrandRecallMode ? GAME_PHASES.GUESS : GAME_PHASES.MEMORIZE,
      );
      return;
    }

    if (isFlagMode) {
      const flagTargetColors =
        nextRoundIndex === 0 || targetColors.length < roundCount
          ? randomFlagTargetColors(roundCount, Math.random, flagDifficulty)
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
      transitionToPhase(
        isFlagRecallMode ? GAME_PHASES.GUESS : GAME_PHASES.MEMORIZE,
      );
      return;
    }

    if (isCartoonMode) {
      const cartoonTargetColors =
        nextRoundIndex === 0 || targetColors.length < roundCount
          ? randomCartoonTargetColors(roundCount, Math.random, cartoonIds)
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
      transitionToPhase(
        isCartoonSceneMode ? GAME_PHASES.GUESS : GAME_PHASES.MEMORIZE,
      );
      return;
    }

    if (isBrandMode) {
      const brandTargetColors =
        nextRoundIndex === 0 || !hasValidBrandTargets(targetColors, roundCount)
          ? isTeamFamily(cleanGameFamily)
          ? randomTeamTargetColors(roundCount, Math.random, teamIds)
            : randomBrandTargetColors(roundCount)
          : targetColors;
      const nextTargetColor = brandTargetColors[nextRoundIndex];

      setTargetColors(brandTargetColors);
      setTargetColor(nextTargetColor);
      setGuessColor(
        createDefaultGuess(
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          nextTargetColor,
        ),
      );
      transitionToPhase(
        isBrandRecallMode ? GAME_PHASES.GUESS : GAME_PHASES.MEMORIZE,
      );
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
    transitionToPhase(GAME_PHASES.MEMORIZE);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    isFlagRecallMode,
    isCartoonMode,
    isCartoonSceneMode,
    isBrandMode,
    isBrandRecallMode,
    flagDifficulty,
    cartoonIds,
    teamIds,
    isFlagMode,
    isSequenceMode,
    roundCount,
    targetColors,
    transitionToPhase,
  ]);

  const useHint = useCallback(() => {
    if (
      phase !== GAME_PHASES.GUESS ||
      !hintsEnabled ||
      hintCount <= 0 ||
      hintActive ||
      hintActionRef.current
    ) {
      return;
    }

    hintActionRef.current = true;
    setHintCount((currentCount) => Math.max(0, currentCount - 1));
    setHintActive(true);
  }, [hintActive, hintCount, hintsEnabled, phase]);

  const finishIntro = useCallback(() => {
    if (phase !== GAME_PHASES.INTRO || completedIntroRoundRef.current === roundIndex) {
      return;
    }

    completedIntroRoundRef.current = roundIndex;
    startRound(roundIndex);
  }, [phase, roundIndex, startRound]);

  const finishMemorize = useCallback(() => {
    if (
      phase !== GAME_PHASES.MEMORIZE ||
      completedMemorizeRoundRef.current === roundIndex
    ) {
      return;
    }

    completedMemorizeRoundRef.current = roundIndex;

    if (isSequenceMode) {
      setTargetColor(targetColors[roundIndex] || null);
    }

    transitionToPhase(GAME_PHASES.GUESS);
  }, [isSequenceMode, phase, roundIndex, targetColors, transitionToPhase]);

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
    if (phase !== GAME_PHASES.GUESS || submittedRoundRef.current === roundIndex) {
      return;
    }

    const activeTarget = isSequenceMode
      ? targetColors[roundIndex]
      : targetColor;

    if (!activeTarget) return;

    submittedRoundRef.current = roundIndex;

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

    setResults((currentResults) =>
      normalizeRoundResults([...currentResults, result]),
    );
    if (hintsEnabled && earnsHint(score)) {
      setHintCount((currentCount) => currentCount + 1);
    }
    if (isFlagSprintMode) {
      const nextRoundIndex = roundIndex + 1;
      if (!isEndlessMode && nextRoundIndex >= roundCount) {
        transitionToPhase(GAME_PHASES.FINAL);
      } else {
        setRoundIndex(nextRoundIndex);
        setTargetColor(null);
        transitionToPhase(GAME_PHASES.INTRO);
      }
    } else {
      transitionToPhase(GAME_PHASES.RESULT);
    }
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    guessColor,
    hintsEnabled,
    isSequenceMode,
    isFlagSprintMode,
    isEndlessMode,
    roundCount,
    phase,
    roundIndex,
    targetColor,
    targetColors,
    transitionToPhase,
  ]);

  const continueFromResult = useCallback(() => {
    if (phase !== GAME_PHASES.RESULT || continuedRoundRef.current === roundIndex) {
      return;
    }

    continuedRoundRef.current = roundIndex;

    if (!isEndlessMode && roundIndex + 1 >= roundCount) {
      transitionToPhase(GAME_PHASES.FINAL);
      return;
    }

    const nextRoundIndex = roundIndex + 1;

    setRoundIndex(nextRoundIndex);
    hintActionRef.current = false;
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      transitionToPhase(GAME_PHASES.GUESS);
      return;
    }

    setTargetColor(null);
    transitionToPhase(GAME_PHASES.INTRO);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    isEndlessMode,
    isSequenceMode,
    phase,
    roundCount,
    roundIndex,
    targetColors,
    transitionToPhase,
  ]);

  const finishRun = useCallback(() => {
    if (!results.length) return;

    transitionToPhase(GAME_PHASES.FINAL);
  }, [results.length, transitionToPhase]);

  const playAgain = useCallback(() => {
    clearGameSession(gameSessionKey);
    setResults([]);
    submittedRoundRef.current = null;
    continuedRoundRef.current = null;
    completedIntroRoundRef.current = null;
    completedMemorizeRoundRef.current = null;
    hintActionRef.current = false;
    setRoundIndex(0);
    setTargetColor(null);
    setTargetColors([]);
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));
    setHintCount(hintsEnabled ? getInitialHintCount(roundCount) : 0);
    setHintActive(false);
    setPhaseStartedAt(Date.now());
    setPhase(GAME_PHASES.INTRO);
    setResumeSavedAt(null);
    setHistoryMatchId(createMatchHistoryId());
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    gameSessionKey,
    hintsEnabled,
    roundCount,
  ]);

  const abandonSession = useCallback(() => {
    clearGameSession(gameSessionKey);
  }, [gameSessionKey]);

  const summary = useMemo(() => {
    const normalizedResults = normalizeRoundResults(results);
    const totalScore = roundScore(
      normalizedResults.reduce((sum, result) => sum + result.score, 0),
    );
    const averageScore = normalizedResults.length
      ? roundScore(totalScore / normalizedResults.length)
      : 0;
    const maxScore =
      (isEndlessMode ? Math.max(normalizedResults.length, 1) : roundCount) *
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
    phaseStartedAt,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs: gameMode.revealDurationMs,
    guessDurationMs: gameMode.guessDurationMs || null,
    hasRestoredSession,
    restoredFromSession,
    resumeSavedAt,
    historyMatchId,
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
    abandonSession,
  };
}
