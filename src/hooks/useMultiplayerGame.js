"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_PHASES } from "@/hooks/useSingleplayerGame";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  ROUND_COUNT,
} from "@/lib/constants";
import { applyDifficultyConstraints, getDifficultyOption } from "@/lib/difficulty";
import { getGameModeOption } from "@/lib/gameMode";
import {
  createDefaultGradientGuess,
  isGradientColor,
  withGradientHex,
  withHex,
} from "@/lib/color";
import { emitWithAck } from "@/lib/socket";

function responseData(response) {
  return response?.data || response || {};
}

function createDefaultGuess(difficulty, gameMode) {
  if (gameMode?.id === GAME_MODE_IDS.GRADIENT) {
    return createDefaultGradientGuess();
  }

  return withHex(applyDifficultyConstraints(difficulty.defaultGuess, difficulty));
}

function constrainGuessColor(guessColor, difficulty, gameMode) {
  if (gameMode.id === GAME_MODE_IDS.GRADIENT || isGradientColor(guessColor)) {
    return withGradientHex(guessColor);
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

export function useMultiplayerGame({
  roomCode,
  playerId,
  difficultyId = DEFAULT_DIFFICULTY_ID,
  gameModeId = DEFAULT_GAME_MODE_ID,
  gamePayload,
  room,
  incomingLeaderboard,
}) {
  const { t } = useTranslation();
  const difficulty = useMemo(() => getDifficultyOption(difficultyId), [difficultyId]);
  const gameMode = useMemo(() => getGameModeOption(gameModeId), [gameModeId]);
  const isSequenceMode = gameMode.id === GAME_MODE_IDS.SEQUENCE;
  const isGradientMode = gameMode.id === GAME_MODE_IDS.GRADIENT;
  const isDuelMode = gameMode.id === GAME_MODE_IDS.DUEL;
  const lockedDifficultyId = gameMode.lockedDifficultyId || null;
  const effectiveDifficulty = useMemo(
    () => (lockedDifficultyId ? getDifficultyOption(lockedDifficultyId) : difficulty),
    [difficulty, lockedDifficultyId],
  );
  const serverTargetColors = gamePayload?.targetColors || [];
  const [phase, setPhase] = useState(GAME_PHASES.INTRO);
  const [roundIndex, setRoundIndex] = useState(() => gamePayload?.currentRoundIndex || 0);
  const [targetColor, setTargetColor] = useState(null);
  const [targetColors, setTargetColors] = useState(serverTargetColors);
  const [revealDurationMs, setRevealDurationMs] = useState(
    gamePayload?.revealDurationMs || gameMode.revealDurationMs,
  );
  const guessDurationMs =
    gamePayload?.guessDurationMs || gameMode.guessDurationMs || null;
  const [guessColor, setGuessColor] = useState(() =>
    createDefaultGuess(effectiveDifficulty, gameMode),
  );
  const [results, setResults] = useState([]);
  const [localLeaderboard, setLocalLeaderboard] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentRoomPlayer = useMemo(
    () => room?.players?.find((player) => player.id === playerId) || null,
    [playerId, room?.players],
  );
  const isCurrentPlayerEliminated = Boolean(currentRoomPlayer?.eliminated);
  const serverRoundIndex = room?.game?.currentRoundIndex ?? gamePayload?.currentRoundIndex ?? 0;

  const prepareRound = useCallback(
    (nextRoundIndex) => {
      const colors = gamePayload?.targetColors || targetColors;

      if (!colors.length) {
        setError(t("game.waitingError"));
        return false;
      }

      setError("");
      setTargetColors(colors);
      setRevealDurationMs(gamePayload?.revealDurationMs || gameMode.revealDurationMs);
      setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode));

      if (isSequenceMode) {
        setTargetColor(colors[0]);
      } else {
        setTargetColor(colors[nextRoundIndex]);
      }

      setPhase(GAME_PHASES.MEMORIZE);
      return true;
    },
    [
      effectiveDifficulty,
      gameMode,
      gamePayload,
      isSequenceMode,
      targetColors,
      t,
    ],
  );

  const finishIntro = useCallback(() => {
    prepareRound(roundIndex);
  }, [prepareRound, roundIndex]);

  const finishMemorize = useCallback(() => {
    if (isSequenceMode) {
      setTargetColor(targetColors[roundIndex] || null);
    }

    setPhase(GAME_PHASES.GUESS);
  }, [isSequenceMode, roundIndex, targetColors]);

  const updateGuess = useCallback(
    (nextGuess) => {
      setGuessColor(constrainGuessColor(nextGuess, effectiveDifficulty, gameMode));
    },
    [effectiveDifficulty, gameMode],
  );

  const submitGuess = useCallback(async () => {
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    const response = await emitWithAck("game:submitGuess", {
      roomCode,
      playerId,
      roundIndex,
      guessColor: constrainGuessColor(guessColor, effectiveDifficulty, gameMode),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError(response.error || t("game.submitError"));
      return;
    }

    const data = responseData(response);
    const nextResult = toResultPhaseShape(data.result);

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

    setPhase(GAME_PHASES.RESULT);
  }, [
    effectiveDifficulty,
    gameMode,
    guessColor,
    isSubmitting,
    playerId,
    roomCode,
    roundIndex,
    t,
  ]);

  const continueFromResult = useCallback(() => {
    if (isDuelMode) {
      setPhase("waiting");
      return;
    }

    if (roundIndex + 1 >= ROUND_COUNT) {
      setPhase("waiting");
      return;
    }

    const nextRoundIndex = roundIndex + 1;

    setRoundIndex(nextRoundIndex);
    setTargetColor(null);
    setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    setPhase(GAME_PHASES.INTRO);
  }, [
    effectiveDifficulty,
    gameMode,
    isDuelMode,
    isSequenceMode,
    roundIndex,
    targetColors,
  ]);

  const showLeaderboard = useCallback(() => {
    setPhase("leaderboard");
  }, []);

  useEffect(() => {
    if (!isDuelMode || phase !== "waiting") return undefined;
    if (incomingLeaderboard || room?.status === "completed") return undefined;
    if (isCurrentPlayerEliminated) return undefined;
    if (serverRoundIndex <= roundIndex) return undefined;

    const timeoutId = window.setTimeout(() => {
      setRoundIndex(serverRoundIndex);
      setTargetColor(null);
      setGuessColor(createDefaultGuess(effectiveDifficulty, gameMode));
      setPhase(GAME_PHASES.INTRO);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    effectiveDifficulty,
    gameMode,
    incomingLeaderboard,
    isCurrentPlayerEliminated,
    isDuelMode,
    phase,
    room?.status,
    roundIndex,
    serverRoundIndex,
  ]);

  return {
    difficulty: effectiveDifficulty,
    gameMode,
    isSequenceMode,
    isGradientMode,
    isDuelMode,
    isCurrentPlayerEliminated,
    phase,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs,
    guessDurationMs,
    guessColor,
    results,
    latestResult: results[results.length - 1] || null,
    leaderboard: incomingLeaderboard || localLeaderboard,
    error,
    isSubmitting,
    finishIntro,
    finishMemorize,
    updateGuess,
    submitGuess,
    continueFromResult,
    showLeaderboard,
    setTargetColor,
  };
}
