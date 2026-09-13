"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_PHASES } from "@/hooks/useSingleplayerGame";
import {
  buildGameSessionKey,
  clearGameSession,
  getGameSession,
  saveGameSession,
} from "@/hooks/useGameSession";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  ROUND_COUNT,
  RUSH_DURATION_MS,
} from "@/lib/constants";
import { applyDifficultyConstraints, getDifficultyOption } from "@/lib/difficulty";
import { getGameModeOption } from "@/lib/gameMode";
import {
  getInitialHintCount,
  normalizeHintsEnabled,
} from "@/lib/hints";
import {
  isCartoonFamily,
  isBrandFamily,
  isTeamFamily,
  isLogoFamily,
  isFlagFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import {
  createDefaultCartoonGuess,
  createDefaultBrandGuess,
  createDefaultFlagGuess,
  createDefaultGradientGuess,
  createDefaultBlendGuess,
  isCartoonColor,
  isBrandColor,
  isFlagColor,
  isGradientColor,
  isBlendColor,
  withCartoonDifficultyHex,
  withBrandDifficultyHex,
  createDefaultTeamGuess,
  withTeamDifficultyHex,
  withFlagDifficultyHex,
  withGradientHex,
  withBlendDifficultyHex,
  withHex,
} from "@/lib/color";
import { emitWithAck } from "@/lib/socket";
import { getMultiplayerErrorMessage } from "@/lib/multiplayerErrors";
import { createMatchHistoryId } from "@/lib/matchHistory";
import { shouldMemorizeMultiplayerRound } from "../../shared/gameMechanics.mjs";

function responseData(response) {
  return response?.data || response || {};
}

function createDefaultGuess(difficulty, gameMode, gameFamily, targetColor = null) {
  if (gameMode?.id === GAME_MODE_IDS.ODD) return null;
  if (gameMode?.id === GAME_MODE_IDS.PATTERN) {
    return Array.isArray(targetColor?.board) ? [...targetColor.board] : [];
  }

  if (gameMode?.id === GAME_MODE_IDS.GRADIENT) {
    return createDefaultGradientGuess();
  }

  if (gameMode?.id === GAME_MODE_IDS.BLEND) {
    return createDefaultBlendGuess();
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
  if (gameMode.id === GAME_MODE_IDS.ODD) return null;
  if (gameMode.id === GAME_MODE_IDS.PATTERN) return guessColor;

  if (gameMode.id === GAME_MODE_IDS.GRADIENT || isGradientColor(guessColor)) {
    return withGradientHex(guessColor);
  }

  if (gameMode.id === GAME_MODE_IDS.BLEND || isBlendColor(guessColor)) {
    return withBlendDifficultyHex(guessColor, targetColor, difficulty);
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

function toResultPhaseShape(serverResult) {
  return {
    ...serverResult,
    round: serverResult.round || serverResult.roundIndex + 1,
    roundIndex: serverResult.roundIndex,
    target: serverResult.target || serverResult.targetColor,
    guess: serverResult.guess || serverResult.guessColor,
    score: serverResult.score,
    grade: serverResult.grade,
    difference: serverResult.difference,
    playerTotalScoreSoFar: serverResult.playerTotalScoreSoFar,
    eliminationThreshold: serverResult.eliminationThreshold,
    eliminationPassed: serverResult.eliminationPassed,
    eliminated: serverResult.eliminated,
    oddSelection: serverResult.oddSelection,
    oddPassed: serverResult.oddPassed,
  };
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

export function useMultiplayerGame({
  roomCode,
  playerId,
  difficultyId = DEFAULT_DIFFICULTY_ID,
  gameModeId = DEFAULT_GAME_MODE_ID,
  gameFamily = "color",
  gamePayload,
  room,
  incomingLeaderboard,
}) {
  const { t } = useTranslation();
  const cleanGameFamily = useMemo(
    () => normalizeGameFamily(gameFamily),
    [gameFamily],
  );
  const difficulty = useMemo(() => getDifficultyOption(difficultyId), [difficultyId]);
  const gameMode = useMemo(
    () => getGameModeOption(gameModeId, undefined, cleanGameFamily),
    [cleanGameFamily, gameModeId],
  );
  const isSequenceMode = gameMode.id === GAME_MODE_IDS.SEQUENCE;
  const isGradientMode = gameMode.id === GAME_MODE_IDS.GRADIENT;
  const isBlendMode = gameMode.id === GAME_MODE_IDS.BLEND;
  const isSpotMode = gameMode.id === GAME_MODE_IDS.SPOT;
  const isEndlessMode = Boolean(gameMode.isEndless);
  const isRushMode = gameMode.id === GAME_MODE_IDS.RUSH;
  const isEliminationMode = gameMode.id === GAME_MODE_IDS.ELIMINATION;
  const isOddMode = gameMode.id === GAME_MODE_IDS.ODD;
  const isBlindMode = gameMode.id === GAME_MODE_IDS.BLIND;
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
  const shouldMemorizeRound = shouldMemorizeMultiplayerRound(
    gameMode.id,
    cleanGameFamily,
  );
  const lockedDifficultyId = gameMode.lockedDifficultyId || null;
  const effectiveDifficulty = useMemo(
    () => (lockedDifficultyId ? getDifficultyOption(lockedDifficultyId) : difficulty),
    [difficulty, lockedDifficultyId],
  );
  const gameSessionKey = useMemo(
    () =>
      buildGameSessionKey("multiplayer", [
        roomCode,
        playerId,
        gamePayload?.seed || room?.game?.seed || "pending",
      ]),
    [gamePayload?.seed, playerId, room?.game?.seed, roomCode],
  );
  const initialGameSession = useMemo(
    () => getGameSession(gameSessionKey),
    [gameSessionKey],
  );
  const roundCount = useMemo(() => {
    const value = Number(
      gamePayload?.roundCount ?? room?.game?.roundCount ?? room?.roundCount ?? ROUND_COUNT,
    );

    return Number.isFinite(value) && value > 0 ? value : ROUND_COUNT;
  }, [gamePayload?.roundCount, room?.game?.roundCount, room?.roundCount]);
  const hintsEnabled = useMemo(
    () =>
      normalizeHintsEnabled(
        gamePayload?.hintsEnabled ?? room?.game?.hintsEnabled ?? room?.hintsEnabled,
        true,
      ),
    [gamePayload?.hintsEnabled, room?.game?.hintsEnabled, room?.hintsEnabled],
  );
  const unlimitedHints = isEndlessMode;
  const serverTargetColors = useMemo(
    () => gamePayload?.targetColors || [],
    [gamePayload?.targetColors],
  );
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [phase, setPhase] = useState(GAME_PHASES.INTRO);
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => Date.now());
  const [roundIndex, setRoundIndex] = useState(
    () => gamePayload?.currentRoundIndex || 0,
  );
  const [targetColor, setTargetColor] = useState(null);
  const [targetColors, setTargetColors] = useState(serverTargetColors);
  const [revealDurationMs, setRevealDurationMs] = useState(
    gamePayload?.revealDurationMs || gameMode.revealDurationMs,
  );
  const guessDurationMs = isRushMode
    ? null
    : gamePayload?.guessDurationMs || gameMode.guessDurationMs || null;
  const [guessColor, setGuessColor] = useState(() =>
    createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily),
  );
  const [results, setResults] = useState([]);
  const [localLeaderboard, setLocalLeaderboard] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRoundRef = useRef(null);
  const submittedRoundRef = useRef(null);
  const continuedRoundRef = useRef(null);
  const completedIntroRoundRef = useRef(null);
  const completedMemorizeRoundRef = useRef(null);
  const hintActionRef = useRef(false);
  const [hintCount, setHintCount] = useState(() =>
    hintsEnabled ? getInitialHintCount(roundCount) : 0,
  );
  const [hintActive, setHintActive] = useState(false);
  const [rushRemainingMs, setRushRemainingMs] = useState(
    () => gamePayload?.rushDurationMs || gameMode.rushDurationMs || RUSH_DURATION_MS,
  );
  const [resumeSavedAt, setResumeSavedAt] = useState(null);
  const [historyMatchId, setHistoryMatchId] = useState(() =>
    initialGameSession?.historyMatchId || createMatchHistoryId(),
  );
  const restoredFromSession = Boolean(initialGameSession);
  const snapshotRef = useRef(null);
  const rushExpiredRef = useRef(false);
  const rushSubmitRef = useRef(null);
  const currentSeed = gamePayload?.seed || room?.game?.seed || null;

  const transitionToPhase = useCallback((nextPhase) => {
    setPhaseStartedAt(Date.now());
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const canRestoreSession =
        initialGameSession &&
        (!currentSeed || !initialGameSession.seed || initialGameSession.seed === currentSeed);

      if (canRestoreSession) {
        const restorablePhases = [...Object.values(GAME_PHASES), "waiting", "leaderboard"];
        const storedPhase = restorablePhases.includes(initialGameSession.phase)
          ? initialGameSession.phase
          : GAME_PHASES.INTRO;
        const restoredPhase =
          cleanGameFamily !== "color" && storedPhase === GAME_PHASES.MEMORIZE
            ? GAME_PHASES.GUESS
            : storedPhase;
        const rawRestoredRoundIndex = Math.max(
          Number(initialGameSession.roundIndex) || 0,
          0,
        );
        const restoredRoundIndex = isEliminationMode || isOddMode
          ? rawRestoredRoundIndex
          : Math.min(rawRestoredRoundIndex, Math.max(roundCount - 1, 0));

        setPhase(restoredPhase);
        setPhaseStartedAt(
          Number.isFinite(initialGameSession.phaseStartedAt)
            ? initialGameSession.phaseStartedAt
            : Date.now(),
        );
        setRoundIndex(
          restoredRoundIndex ||
            gamePayload?.currentRoundIndex ||
            0,
        );
        setTargetColor(initialGameSession.targetColor || null);
        setTargetColors(initialGameSession.targetColors || serverTargetColors);
        setGuessColor(
          initialGameSession.guessColor ||
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
        setRushRemainingMs(
          Number.isFinite(initialGameSession.rushRemainingMs)
            ? Math.max(0, initialGameSession.rushRemainingMs)
            : gamePayload?.rushDurationMs || gameMode.rushDurationMs || RUSH_DURATION_MS,
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
    currentSeed,
    effectiveDifficulty,
    gameMode,
    gamePayload?.currentRoundIndex,
    gamePayload?.rushDurationMs,
    hintsEnabled,
    initialGameSession,
    isEliminationMode,
    isOddMode,
    isBlindMode,
    roundCount,
    serverTargetColors,
  ]);

  useEffect(() => {
    if (!hasRestoredSession) return undefined;
    if (initialGameSession?.seed && initialGameSession.seed === currentSeed) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setHintCount(hintsEnabled ? getInitialHintCount(roundCount) : 0);
      setHintActive(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentSeed,
    hasRestoredSession,
    hintsEnabled,
    initialGameSession?.seed,
    roundCount,
  ]);

  const prepareRound = useCallback(
    (nextRoundIndex) => {
      const payloadColors = gamePayload?.targetColors || [];
      const colors = targetColors.length >= payloadColors.length
        ? targetColors
        : payloadColors;
      hintActionRef.current = false;
      setHintActive(false);

      if (!colors.length) {
        setError(t("game.waitingError"));
        return false;
      }

      setError("");
      setTargetColors(colors);
      setRevealDurationMs(gamePayload?.revealDurationMs || gameMode.revealDurationMs);

      const nextTargetColor = isSequenceMode
        ? colors[0]
        : colors[nextRoundIndex];

      setGuessColor(
        createDefaultGuess(
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          nextTargetColor,
        ),
      );

      if (isSequenceMode) {
        setTargetColor(nextTargetColor);
      } else {
        setTargetColor(nextTargetColor);
      }

      transitionToPhase(
        shouldMemorizeRound ? GAME_PHASES.MEMORIZE : GAME_PHASES.GUESS,
      );
      return true;
    },
    [
      cleanGameFamily,
      effectiveDifficulty,
      gameMode,
      gamePayload,
      shouldMemorizeRound,
      isSequenceMode,
      targetColors,
      t,
      transitionToPhase,
    ],
  );

  const finishIntro = useCallback(() => {
    if (
      phase !== GAME_PHASES.INTRO ||
      completedIntroRoundRef.current === roundIndex
    ) {
      return;
    }

    completedIntroRoundRef.current = roundIndex;
    prepareRound(roundIndex);
  }, [phase, prepareRound, roundIndex]);

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

  const updateGuess = useCallback(
    (nextGuess) => {
      setGuessColor(
        constrainGuessColor(
          nextGuess,
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          targetColor,
        ),
      );
    },
    [cleanGameFamily, effectiveDifficulty, gameMode, targetColor],
  );

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

  const submitGuess = useCallback(async (options = {}) => {
    if (
      phase !== GAME_PHASES.GUESS ||
      isSubmitting ||
      submittingRoundRef.current === roundIndex ||
      submittedRoundRef.current === roundIndex
    ) {
      return;
    }

    submittingRoundRef.current = roundIndex;

    setError("");
    setIsSubmitting(true);

    let response;

    try {
      response = await emitWithAck("game:submitGuess", {
        roomCode,
        playerId,
        roundIndex,
        guessColor: constrainGuessColor(
          guessColor,
          effectiveDifficulty,
          gameMode,
          cleanGameFamily,
          targetColor,
        ),
        patternBoard: options.patternBoard,
        oddSelection: options.oddSelection,
        remainingMs: options.remainingMs,
        swaps: options.swaps,
      });
    } catch (submitError) {
      submittingRoundRef.current = null;
      setIsSubmitting(false);
      setError(getMultiplayerErrorMessage({ error: submitError }, t, "game.submitError"));
      return;
    }

    setIsSubmitting(false);

    if (!response.ok) {
      submittingRoundRef.current = null;
      setError(getMultiplayerErrorMessage(response, t, "game.submitError"));
      return;
    }

    submittedRoundRef.current = roundIndex;

    const data = responseData(response);
    const nextResult = toResultPhaseShape(data.result);
    if ((isEliminationMode || isOddMode) && data.nextTargetColor) {
      setTargetColors((currentColors) => {
        const nextColors = [...currentColors];
        nextColors[data.nextRoundIndex] = data.nextTargetColor;
        return nextColors;
      });
    }
    setResults((currentResults) => {
      const withoutDuplicate = currentResults.filter(
        (result) => result.roundIndex !== nextResult.roundIndex,
      );
      return [...withoutDuplicate, nextResult].sort(
        (first, second) => first.roundIndex - second.roundIndex,
      );
    });

    if (data.leaderboard) {
      setLocalLeaderboard(data.leaderboard);
    }

    if (isOddMode) {
      submittingRoundRef.current = null;
      if (nextResult.oddPassed && data.nextTargetColor) {
        submittedRoundRef.current = null;
        continuedRoundRef.current = null;
        setRoundIndex(data.nextRoundIndex);
        setTargetColor(data.nextTargetColor);
        setGuessColor(null);
        transitionToPhase(GAME_PHASES.GUESS);
      } else {
        transitionToPhase(data.leaderboard ? "leaderboard" : "waiting");
      }
      return nextResult;
    }

    if (isRushMode) {
      const nextRoundIndex = roundIndex + 1;
      if (options.finishRush || rushExpiredRef.current) {
        const finishResponse = await emitWithAck("game:finishRush", {
          roomCode,
          playerId,
        });
        if (!finishResponse.ok) {
          rushExpiredRef.current = false;
          setError(getMultiplayerErrorMessage(finishResponse, t, "game.submitError"));
          return;
        }
        const finishData = responseData(finishResponse);
        if (finishData.leaderboard) {
          setLocalLeaderboard(finishData.leaderboard);
          transitionToPhase("leaderboard");
        } else {
          transitionToPhase("waiting");
        }
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
    isSubmitting,
    isEliminationMode,
    isOddMode,
    isRushMode,
    phase,
    playerId,
    roomCode,
    roundIndex,
    targetColor,
    t,
    transitionToPhase,
  ]);

  useEffect(() => {
    rushSubmitRef.current = submitGuess;
  }, [submitGuess]);

  useEffect(() => {
    if (!isRushMode || phase !== GAME_PHASES.GUESS || isSubmitting) {
      return undefined;
    }

    let previousTick = performance.now();
    const intervalId = window.setInterval(() => {
      const currentTick = performance.now();
      const elapsed = currentTick - previousTick;
      previousTick = currentTick;

      setRushRemainingMs((currentRemaining) => {
        const nextRemaining = Math.max(0, currentRemaining - elapsed);
        if (nextRemaining === 0 && !rushExpiredRef.current) {
          rushExpiredRef.current = true;
          window.queueMicrotask(() =>
            void rushSubmitRef.current?.({ finishRush: true }),
          );
        }
        return nextRemaining;
      });
    }, 25);

    return () => window.clearInterval(intervalId);
  }, [isRushMode, isSubmitting, phase]);

  useEffect(() => {
    if (!hasRestoredSession) return;

    saveGameSession(gameSessionKey, {
      historyMatchId,
      seed: currentSeed,
      phase,
      phaseStartedAt,
      roundIndex,
      targetColor,
      targetColors,
      guessColor,
      results,
      hintCount,
      hintActive,
      rushRemainingMs,
      revealDurationMs,
      guessDurationMs,
    });
  }, [
    currentSeed,
    gameSessionKey,
    guessColor,
    hasRestoredSession,
    historyMatchId,
    hintActive,
    hintCount,
    rushRemainingMs,
    phase,
    phaseStartedAt,
    results,
    roundIndex,
    revealDurationMs,
    guessDurationMs,
    targetColor,
    targetColors,
  ]);

  useEffect(() => {
    snapshotRef.current = {
      historyMatchId,
      seed: currentSeed,
      phase,
      phaseStartedAt,
      roundIndex,
      targetColor,
      targetColors,
      guessColor,
      results,
      hintCount,
      hintActive,
      rushRemainingMs,
      revealDurationMs,
      guessDurationMs,
    };
  }, [
    currentSeed,
    guessColor,
    guessDurationMs,
    historyMatchId,
    hintActive,
    hintCount,
    rushRemainingMs,
    phase,
    phaseStartedAt,
    results,
    revealDurationMs,
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

  const continueFromResult = useCallback(() => {
    if (phase !== GAME_PHASES.RESULT || continuedRoundRef.current === roundIndex) {
      return;
    }

    continuedRoundRef.current = roundIndex;

    const latestResult = results[results.length - 1];
    if (isEliminationMode && !latestResult?.eliminationPassed) {
      transitionToPhase(localLeaderboard || incomingLeaderboard ? "leaderboard" : "waiting");
      return;
    }

    if (isOddMode && !latestResult?.oddPassed) {
      transitionToPhase(localLeaderboard || incomingLeaderboard ? "leaderboard" : "waiting");
      return;
    }

    if (!isEndlessMode && !isEliminationMode && !isOddMode && roundIndex + 1 >= roundCount) {
      transitionToPhase("waiting");
      return;
    }

    const nextRoundIndex = roundIndex + 1;

    setRoundIndex(nextRoundIndex);
    completedIntroRoundRef.current = null;
    completedMemorizeRoundRef.current = null;
    hintActionRef.current = false;
    setTargetColor(null);
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      transitionToPhase(GAME_PHASES.GUESS);
      return;
    }

    transitionToPhase(GAME_PHASES.INTRO);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    incomingLeaderboard,
    isEliminationMode,
    isOddMode,
    isEndlessMode,
    isSequenceMode,
    localLeaderboard,
    phase,
    roundCount,
    roundIndex,
    results,
    targetColors,
    transitionToPhase,
  ]);

  const showLeaderboard = useCallback(() => {
    transitionToPhase("leaderboard");
  }, [transitionToPhase]);

  const abandonSession = useCallback(() => {
    clearGameSession(gameSessionKey);
  }, [gameSessionKey]);

  return {
    difficulty: effectiveDifficulty,
    gameMode,
    gameFamily: cleanGameFamily,
    isEndlessMode,
    isEliminationMode,
    isOddMode,
    isBlindMode,
    isRushMode,
    isSequenceMode,
    isGradientMode,
    isBlendMode,
    isSpotMode,
    isCartoonMode,
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
    revealDurationMs,
    guessDurationMs,
    rushDurationMs: gamePayload?.rushDurationMs || gameMode.rushDurationMs || null,
    rushRemainingMs,
    hasRestoredSession,
    restoredFromSession,
    resumeSavedAt,
    historyMatchId,
    guessColor,
    results,
    latestResult: results[results.length - 1] || null,
    leaderboard: incomingLeaderboard || localLeaderboard,
    error,
    isSubmitting,
    finishIntro,
    finishMemorize,
    updateGuess,
    updatePatternBoard: (nextBoard) => {
      if (gameMode.id === GAME_MODE_IDS.PATTERN && Array.isArray(nextBoard)) {
        setGuessColor(nextBoard);
      }
    },
    useHint,
    submitGuess,
    continueFromResult,
    showLeaderboard,
    setTargetColor,
    abandonSession,
  };
}
