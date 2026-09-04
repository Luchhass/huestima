"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  MAX_ROUND_SCORE,
  SPRINT_DURATION_MS,
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

function isVisualTargetForFamily(color, gameFamily) {
  if (isFlagFamily(gameFamily)) return isFlagColor(color);
  if (isCartoonFamily(gameFamily)) return isCartoonColor(color);
  if (isTeamFamily(gameFamily)) return isBrandColor(color) && Boolean(color?.teamId);
  if (isBrandFamily(gameFamily)) return isBrandColor(color) && !color?.teamId;
  return false;
}

function hasValidVisualTargets(colors, targetCount, gameFamily) {
  return (
    Array.isArray(colors) &&
    colors.length >= targetCount &&
    colors.slice(0, targetCount).every((color) =>
      isVisualTargetForFamily(color, gameFamily),
    )
  );
}

function normalizeVisualTargets(colors, targetCount, gameFamily, createFallback) {
  return hasValidVisualTargets(colors, targetCount, gameFamily)
    ? colors
    : createFallback();
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
  const isSpotMode = gameMode.id === GAME_MODE_IDS.SPOT;
  const isEndlessMode = gameMode.id === GAME_MODE_IDS.ENDLESS;
  const unlimitedHints = isEndlessMode;
  const isFlagMode = isFlagFamily(cleanGameFamily);
  const isSprintMode = gameMode.id === GAME_MODE_IDS.SPRINT;
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
  const isBrandMode = isLogoFamily(cleanGameFamily);
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
        flagDifficulty || "all-flags",
        Array.isArray(cartoonIds) ? cartoonIds.join(",") : "all-cartoons",
        Array.isArray(teamIds) ? teamIds.join(",") : "all-teams",
      ]),
    [
      cleanGameFamily,
      effectiveDifficulty.id,
      gameMode.id,
      hintsEnabled,
      roundCount,
      flagDifficulty,
      cartoonIds,
      teamIds,
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
  const [targetColors, setTargetColors] = useState(() => {
    if (!isFlagMode && !isCartoonMode && !isBrandMode) return [];
    const restoredRoundIndex = Math.max(
      Number(initialGameSession?.roundIndex) || 0,
      0,
    );
    const targetCount = isSprintMode || isEndlessMode
      ? restoredRoundIndex + 2
      : roundCount;

    return normalizeVisualTargets(
      initialGameSession?.targetColors,
      targetCount,
      cleanGameFamily,
      () =>
        createTargetColors(
          effectiveDifficulty.id,
          gameMode.id,
          cleanGameFamily,
          targetCount,
          flagDifficulty,
          cartoonIds,
          teamIds,
        ),
    );
  });
  const [guessColor, setGuessColor] = useState(() =>
    createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily),
  );
  const [results, setResults] = useState([]);
  const [hintCount, setHintCount] = useState(() =>
    hintsEnabled ? getInitialHintCount(roundCount) : 0,
  );
  const [hintActive, setHintActive] = useState(false);
  const [sprintRemainingMs, setSprintRemainingMs] = useState(
    () => gameMode.sprintDurationMs || SPRINT_DURATION_MS,
  );
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
  const sprintExpiredRef = useRef(false);
  const sprintSubmitRef = useRef(null);

  const transitionToPhase = useCallback((nextPhase) => {
    setPhaseStartedAt(Date.now());
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (initialGameSession) {
        const storedPhase = Object.values(GAME_PHASES).includes(initialGameSession.phase)
          ? initialGameSession.phase
          : GAME_PHASES.INTRO;
        const restoredPhase =
          cleanGameFamily !== "color" && storedPhase === GAME_PHASES.MEMORIZE
            ? GAME_PHASES.GUESS
            : storedPhase;
        const restoredRoundIndex = isSprintMode
          ? Math.max(Number(initialGameSession.roundIndex) || 0, 0)
          : Math.min(
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
        const isVisualMode = isFlagMode || isCartoonMode || isBrandMode;
        const restoredTargetCount = isSprintMode || isEndlessMode
          ? restoredRoundIndex + 2
          : roundCount;
        const restoredTargetColors = isVisualMode
          ? normalizeVisualTargets(
              initialGameSession.targetColors,
              restoredTargetCount,
              cleanGameFamily,
              () =>
                createTargetColors(
                  effectiveDifficulty.id,
                  gameMode.id,
                  cleanGameFamily,
                  restoredTargetCount,
                  flagDifficulty,
                  cartoonIds,
                  teamIds,
                ),
            )
          : initialGameSession.targetColors || [];
        const restoredTargetColor = isVisualMode
          ? isVisualTargetForFamily(initialGameSession.targetColor, cleanGameFamily)
            ? initialGameSession.targetColor
            : restoredTargetColors[restoredRoundIndex] || null
          : initialGameSession.targetColor || null;

        setTargetColor(restoredTargetColor);
        setTargetColors(restoredTargetColors);
        setGuessColor(
          isVisualMode
            ? isVisualTargetForFamily(initialGameSession.guessColor, cleanGameFamily)
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
        setSprintRemainingMs(
          Number.isFinite(initialGameSession.sprintRemainingMs)
            ? Math.max(0, initialGameSession.sprintRemainingMs)
            : gameMode.sprintDurationMs || SPRINT_DURATION_MS,
        );
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
    isCartoonMode,
    isFlagMode,
    isEndlessMode,
    isSpotMode,
    isSprintMode,
    roundCount,
    cartoonIds,
    flagDifficulty,
    teamIds,
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
      sprintRemainingMs,
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
    sprintRemainingMs,
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
      sprintRemainingMs,
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
    sprintRemainingMs,
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
      transitionToPhase(GAME_PHASES.MEMORIZE);
      return;
    }

    if (isFlagMode) {
      if (isSprintMode || isEndlessMode) {
        const sprintTargets = [...targetColors];
        while (sprintTargets.length <= nextRoundIndex + 1) {
          sprintTargets.push(randomFlagTargetColors(1, Math.random, flagDifficulty)[0]);
        }
        const nextTargetColor = sprintTargets[nextRoundIndex];
        if (sprintTargets.length !== targetColors.length) setTargetColors(sprintTargets);
        setTargetColor(nextTargetColor);
        setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily, nextTargetColor));
        transitionToPhase(GAME_PHASES.GUESS);
        return;
      }
      const flagTargetColors =
        !hasValidVisualTargets(targetColors, roundCount, cleanGameFamily)
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
        GAME_PHASES.GUESS,
      );
      return;
    }

    if (isCartoonMode) {
      if (isSprintMode || isEndlessMode) {
        const sprintTargets = [...targetColors];
        while (sprintTargets.length <= nextRoundIndex + 1) {
          sprintTargets.push(randomCartoonTargetColors(1, Math.random, cartoonIds)[0]);
        }
        const nextTargetColor = sprintTargets[nextRoundIndex];
        if (sprintTargets.length !== targetColors.length) setTargetColors(sprintTargets);
        setTargetColor(nextTargetColor);
        setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily, nextTargetColor));
        transitionToPhase(GAME_PHASES.GUESS);
        return;
      }
      const cartoonTargetColors =
        !hasValidVisualTargets(targetColors, roundCount, cleanGameFamily)
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
        GAME_PHASES.GUESS,
      );
      return;
    }

    if (isBrandMode) {
      if (isSprintMode || isEndlessMode) {
        const sprintTargets = [...targetColors];
        while (sprintTargets.length <= nextRoundIndex + 1) {
          sprintTargets.push(
            isTeamFamily(cleanGameFamily)
              ? randomTeamTargetColors(1, Math.random, teamIds)[0]
              : randomBrandTargetColors(1)[0],
          );
        }
        const nextTargetColor = sprintTargets[nextRoundIndex];
        if (sprintTargets.length !== targetColors.length) setTargetColors(sprintTargets);
        setTargetColor(nextTargetColor);
        setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily, nextTargetColor));
        transitionToPhase(GAME_PHASES.GUESS);
        return;
      }
      const brandTargetColors =
        !hasValidVisualTargets(targetColors, roundCount, cleanGameFamily)
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
        GAME_PHASES.GUESS,
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
    transitionToPhase(isSpotMode ? GAME_PHASES.GUESS : GAME_PHASES.MEMORIZE);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    isCartoonMode,
    isBrandMode,
    isEndlessMode,
    isSpotMode,
    isSprintMode,
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
      (!hintsEnabled && !unlimitedHints) ||
      (!unlimitedHints && hintCount <= 0) ||
      hintActive ||
      hintActionRef.current
    ) {
      return;
    }

    hintActionRef.current = true;
    if (!unlimitedHints) {
      setHintCount((currentCount) => Math.max(0, currentCount - 1));
    }
    setHintActive(true);
  }, [hintActive, hintCount, hintsEnabled, phase, unlimitedHints]);

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

  const submitGuess = useCallback((options = {}) => {
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
    if (isSprintMode) {
      const nextRoundIndex = roundIndex + 1;
      if (options.finishSprint) {
        transitionToPhase(GAME_PHASES.FINAL);
      } else {
        setRoundIndex(nextRoundIndex);
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
    isSprintMode,
    phase,
    roundIndex,
    targetColor,
    targetColors,
    transitionToPhase,
  ]);

  useEffect(() => {
    sprintSubmitRef.current = submitGuess;
  }, [submitGuess]);

  useEffect(() => {
    if (!isSprintMode || phase !== GAME_PHASES.GUESS) {
      return undefined;
    }

    let previousTick = performance.now();
    const intervalId = window.setInterval(() => {
      const currentTick = performance.now();
      const elapsed = currentTick - previousTick;
      previousTick = currentTick;

      setSprintRemainingMs((currentRemaining) => {
        const nextRemaining = Math.max(0, currentRemaining - elapsed);
        if (nextRemaining === 0 && !sprintExpiredRef.current) {
          sprintExpiredRef.current = true;
          window.queueMicrotask(() =>
            sprintSubmitRef.current?.({ finishSprint: true }),
          );
        }
        return nextRemaining;
      });
    }, 25);

    return () => window.clearInterval(intervalId);
  }, [isSprintMode, phase]);

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
    setTargetColors(
      isFlagMode || isCartoonMode || isBrandMode
        ? createTargetColors(
            effectiveDifficulty.id,
            gameMode.id,
            cleanGameFamily,
            isSprintMode || isEndlessMode ? 2 : roundCount,
            flagDifficulty,
            cartoonIds,
            teamIds,
          )
        : [],
    );
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));
    setHintCount(hintsEnabled ? getInitialHintCount(roundCount) : 0);
    setHintActive(false);
    setSprintRemainingMs(gameMode.sprintDurationMs || SPRINT_DURATION_MS);
    sprintExpiredRef.current = false;
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
    isBrandMode,
    isCartoonMode,
    isEndlessMode,
    isFlagMode,
    isSprintMode,
    roundCount,
    cartoonIds,
    flagDifficulty,
    teamIds,
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
      (isEndlessMode || isSprintMode ? Math.max(normalizedResults.length, 1) : roundCount) *
      MAX_ROUND_SCORE;

    return {
      totalScore,
      averageScore,
      maxScore,
    };
  }, [isEndlessMode, isSprintMode, results, roundCount]);

  return {
    difficulty: effectiveDifficulty,
    gameMode,
    isSequenceMode,
    isGradientMode,
    isSpotMode,
    isEndlessMode,
    isSprintMode,
    isCartoonMode,
    gameFamily: cleanGameFamily,
    roundCount,
    hintsEnabled,
    unlimitedHints,
    hintCount,
    hintActive,
    phase,
    phaseStartedAt,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs: gameMode.revealDurationMs,
    guessDurationMs: isSprintMode ? null : gameMode.guessDurationMs || null,
    sprintDurationMs: gameMode.sprintDurationMs || null,
    sprintRemainingMs,
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
