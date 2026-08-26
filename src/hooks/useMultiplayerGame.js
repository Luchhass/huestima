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
} from "@/lib/constants";
import { applyDifficultyConstraints, getDifficultyOption } from "@/lib/difficulty";
import { getGameModeOption } from "@/lib/gameMode";
import {
  earnsHint,
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
  isCartoonColor,
  isBrandColor,
  isFlagColor,
  isGradientColor,
  withCartoonDifficultyHex,
  withBrandDifficultyHex,
  createDefaultTeamGuess,
  withTeamDifficultyHex,
  withFlagDifficultyHex,
  withGradientHex,
  withHex,
} from "@/lib/color";
import { emitWithAck } from "@/lib/socket";
import { getMultiplayerErrorMessage } from "@/lib/multiplayerErrors";
import { createMatchHistoryId } from "@/lib/matchHistory";

function responseData(response) {
  return response?.data || response || {};
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

function toResultPhaseShape(serverResult) {
  return {
    round: serverResult.round || serverResult.roundIndex + 1,
    roundIndex: serverResult.roundIndex,
    target: serverResult.target || serverResult.targetColor,
    guess: serverResult.guess || serverResult.guessColor,
    score: serverResult.score,
    grade: serverResult.grade,
    difference: serverResult.difference,
    playerTotalScoreSoFar: serverResult.playerTotalScoreSoFar,
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
  const isEndlessMode = gameMode.id === GAME_MODE_IDS.ENDLESS;
  const isDuelMode = gameMode.id === GAME_MODE_IDS.DUEL;
  const isFlagRecallMode = gameMode.id === GAME_MODE_IDS.FLAG_RECALL;
  const isSprintMode = gameMode.id === GAME_MODE_IDS.SPRINT;
  const isCartoonMode = isCartoonFamily(cleanGameFamily);
  const isCartoonSceneMode = gameMode.id === GAME_MODE_IDS.CARTOON;
  const isBrandRecallMode = gameMode.id === GAME_MODE_IDS.BRAND_RECALL || gameMode.id === GAME_MODE_IDS.TEAM_RECALL;
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
  const guessDurationMs =
    gamePayload?.guessDurationMs || gameMode.guessDurationMs || null;
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
  const [resumeSavedAt, setResumeSavedAt] = useState(null);
  const [historyMatchId, setHistoryMatchId] = useState(() =>
    initialGameSession?.historyMatchId || createMatchHistoryId(),
  );
  const restoredFromSession = Boolean(initialGameSession);
  const snapshotRef = useRef(null);
  const sprintDeadlineRef = useRef(null);
  const currentRoomPlayer = useMemo(
    () => room?.players?.find((player) => player.id === playerId) || null,
    [playerId, room?.players],
  );
  const isCurrentPlayerEliminated = Boolean(currentRoomPlayer?.eliminated);
  const serverRoundIndex = room?.game?.currentRoundIndex ?? gamePayload?.currentRoundIndex ?? 0;
  const currentSeed = gamePayload?.seed || room?.game?.seed || null;

  const transitionToPhase = useCallback((nextPhase) => {
    setPhaseStartedAt(Date.now());
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    if (!gameMode.isSprint || phase === "leaderboard" || phase === "waiting") {
      return undefined;
    }

    if (sprintDeadlineRef.current === null) {
      sprintDeadlineRef.current = Date.now() + (gameMode.sprintDurationMs || 30000);
    }

    const remaining = Math.max(0, sprintDeadlineRef.current - Date.now());
    const timeoutId = window.setTimeout(() => {
      if (phase !== "leaderboard" && phase !== "waiting") {
        transitionToPhase("leaderboard");
      }
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [gameMode.isSprint, gameMode.sprintDurationMs, phase, transitionToPhase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const canRestoreSession =
        initialGameSession &&
        (!currentSeed || !initialGameSession.seed || initialGameSession.seed === currentSeed);

      if (canRestoreSession) {
        const restorablePhases = [...Object.values(GAME_PHASES), "waiting", "leaderboard"];
        const restoredPhase = restorablePhases.includes(initialGameSession.phase)
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
    hintsEnabled,
    initialGameSession,
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
      const colors = gamePayload?.targetColors || targetColors;
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
        (isFlagFamily(cleanGameFamily) && isFlagRecallMode) ||
          (isCartoonMode && isCartoonSceneMode) ||
          (isBrandRecallMode && cleanGameFamily === "brand")
          ? GAME_PHASES.GUESS
          : GAME_PHASES.MEMORIZE,
      );
      return true;
    },
    [
      cleanGameFamily,
      effectiveDifficulty,
      gameMode,
      gamePayload,
      isFlagRecallMode,
      isCartoonMode,
      isCartoonSceneMode,
      isBrandRecallMode,
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

  const submitGuess = useCallback(async () => {
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
    if (hintsEnabled && earnsHint(nextResult.score)) {
      setHintCount((currentCount) => currentCount + 1);
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

    if (isSprintMode) {
      const nextRoundIndex = roundIndex + 1;
      if (!isEndlessMode && nextRoundIndex >= roundCount) {
        transitionToPhase("waiting");
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
    isSubmitting,
    isSprintMode,
    isEndlessMode,
    roundCount,
    phase,
    playerId,
    roomCode,
    roundIndex,
    targetColor,
    t,
    transitionToPhase,
  ]);

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

    if (isDuelMode) {
      transitionToPhase("waiting");
      return;
    }

    if (!isEndlessMode && roundIndex + 1 >= roundCount) {
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
    isEndlessMode,
    isDuelMode,
    isSequenceMode,
    phase,
    roundCount,
    roundIndex,
    targetColors,
    transitionToPhase,
  ]);

  const showLeaderboard = useCallback(() => {
    transitionToPhase("leaderboard");
  }, [transitionToPhase]);

  const abandonSession = useCallback(() => {
    clearGameSession(gameSessionKey);
  }, [gameSessionKey]);

  useEffect(() => {
    if (!isDuelMode || phase !== "waiting") return undefined;
    if (incomingLeaderboard || room?.status === "completed") return undefined;
    if (isCurrentPlayerEliminated) return undefined;
    if (serverRoundIndex <= roundIndex) return undefined;

    const timeoutId = window.setTimeout(() => {
      setRoundIndex(serverRoundIndex);
      setTargetColor(null);
      setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode, cleanGameFamily));
      transitionToPhase(GAME_PHASES.INTRO);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    cleanGameFamily,
    effectiveDifficulty,
    gameMode,
    incomingLeaderboard,
    isCurrentPlayerEliminated,
    isDuelMode,
    phase,
    room?.status,
    roundIndex,
    serverRoundIndex,
    transitionToPhase,
  ]);

  return {
    difficulty: effectiveDifficulty,
    gameMode,
    gameFamily: cleanGameFamily,
    isEndlessMode,
    isSequenceMode,
    isGradientMode,
    isDuelMode,
    isCartoonMode,
    isCurrentPlayerEliminated,
    roundCount,
    hintsEnabled,
    hintCount,
    hintActive,
    phase,
    phaseStartedAt,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs,
    guessDurationMs,
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
    useHint,
    submitGuess,
    continueFromResult,
    showLeaderboard,
    setTargetColor,
    abandonSession,
  };
}
