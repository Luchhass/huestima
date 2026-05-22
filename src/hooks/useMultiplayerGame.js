"use client";

import { useCallback, useMemo, useState } from "react";
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
import { withHex } from "@/lib/color";
import { emitWithAck } from "@/lib/socket";

function responseData(response) {
  return response?.data || response || {};
}

function createDefaultGuess(difficulty) {
  return withHex(applyDifficultyConstraints(difficulty.defaultGuess, difficulty));
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
  incomingLeaderboard,
}) {
  const { t } = useTranslation();
  const difficulty = useMemo(() => getDifficultyOption(difficultyId), [difficultyId]);
  const gameMode = useMemo(() => getGameModeOption(gameModeId), [gameModeId]);
  const isSequenceMode = gameMode.id === GAME_MODE_IDS.SEQUENCE;
  const serverTargetColors = gamePayload?.targetColors || [];
  const [phase, setPhase] = useState(GAME_PHASES.INTRO);
  const [roundIndex, setRoundIndex] = useState(0);
  const [targetColor, setTargetColor] = useState(null);
  const [targetColors, setTargetColors] = useState(serverTargetColors);
  const [revealDurationMs, setRevealDurationMs] = useState(
    gamePayload?.revealDurationMs || gameMode.revealDurationMs,
  );
  const [guessColor, setGuessColor] = useState(() => createDefaultGuess(difficulty));
  const [results, setResults] = useState([]);
  const [localLeaderboard, setLocalLeaderboard] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setGuessColor(createDefaultGuess(difficulty));

      if (isSequenceMode) {
        setTargetColor(colors[0]);
      } else {
        setTargetColor(colors[nextRoundIndex]);
      }

      setPhase(GAME_PHASES.MEMORIZE);
      return true;
    },
    [difficulty, gameMode.revealDurationMs, gamePayload, isSequenceMode, targetColors, t],
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
      setGuessColor(withHex(applyDifficultyConstraints(nextGuess, difficulty)));
    },
    [difficulty],
  );

  const submitGuess = useCallback(async () => {
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    const response = await emitWithAck("game:submitGuess", {
      roomCode,
      playerId,
      roundIndex,
      guessColor,
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
  }, [guessColor, isSubmitting, playerId, roomCode, roundIndex, t]);

  const continueFromResult = useCallback(() => {
    if (roundIndex + 1 >= ROUND_COUNT) {
      setPhase("waiting");
      return;
    }

    const nextRoundIndex = roundIndex + 1;

    setRoundIndex(nextRoundIndex);
    setTargetColor(null);
    setGuessColor(createDefaultGuess(difficulty));

    if (isSequenceMode) {
      setTargetColor(targetColors[nextRoundIndex] || null);
      setPhase(GAME_PHASES.GUESS);
      return;
    }

    setPhase(GAME_PHASES.INTRO);
  }, [difficulty, isSequenceMode, roundIndex, targetColors]);

  const showLeaderboard = useCallback(() => {
    setPhase("leaderboard");
  }, []);

  return {
    difficulty,
    gameMode,
    isSequenceMode,
    phase,
    roundIndex,
    targetColor,
    targetColors,
    revealDurationMs,
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
