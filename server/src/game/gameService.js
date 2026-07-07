import {
  GAME_MODE_CONFIG,
  GAME_MODES,
  MAX_ROUND_SCORE,
  ROOM_STATUSES,
  DEFAULT_ROUND_COUNT,
} from "../constants.js";
import {
  applyDifficultyConstraints,
  generateTargetColors,
  isCartoonColor,
  isFlagColor,
  isGradientColor,
  withCartoonHex,
  withFlagHex,
  withHex,
  withGradientHex,
} from "./colorGenerator.js";
import {
  calculateColorScore,
  ciede2000Distance,
  getGradeLabel,
} from "./scoring.js";
import {
  fail,
  ok,
  validateHsvColor,
  validatePlayerId,
  validateRoundIndex,
} from "../rooms/roomValidation.js";
import { createSeed } from "../utils/ids.js";
import { now } from "../utils/time.js";

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

const DUEL_ELIMINATION = {
  initialGap: 1.25,
  shrinkPerRound: 0.095,
  minimumGap: 0.08,
};

function isDuelRoom(room) {
  return room?.game?.mode === GAME_MODES.DUEL;
}

function duelGapThreshold(roundIndex) {
  return roundScore(
    Math.max(
      DUEL_ELIMINATION.minimumGap,
      DUEL_ELIMINATION.initialGap - roundIndex * DUEL_ELIMINATION.shrinkPerRound,
    ),
  );
}

function calculateMatchScore(targetColor, guessColor) {
  if (isGradientColor(targetColor) && isGradientColor(guessColor)) {
    return (
      calculateColorScore(targetColor.left.hex, guessColor.left.hex) +
      calculateColorScore(targetColor.right.hex, guessColor.right.hex)
    ) / 2;
  }

  if (isFlagColor(targetColor) && isFlagColor(guessColor)) {
    return calculateFlagSlotAverage(targetColor, guessColor, calculateColorScore);
  }

  if (isCartoonColor(targetColor) && isCartoonColor(guessColor)) {
    return calculateColorScore(targetColor.hex, guessColor.hex);
  }

  return calculateColorScore(targetColor.hex, guessColor.hex);
}

function calculateMatchDistance(targetColor, guessColor) {
  if (isGradientColor(targetColor) && isGradientColor(guessColor)) {
    return (
      ciede2000Distance(targetColor.left.hex, guessColor.left.hex) +
      ciede2000Distance(targetColor.right.hex, guessColor.right.hex)
    ) / 2;
  }

  if (isFlagColor(targetColor) && isFlagColor(guessColor)) {
    return calculateFlagSlotAverage(targetColor, guessColor, ciede2000Distance);
  }

  if (isCartoonColor(targetColor) && isCartoonColor(guessColor)) {
    return ciede2000Distance(targetColor.hex, guessColor.hex);
  }

  return ciede2000Distance(targetColor.hex, guessColor.hex);
}

function calculateFlagSlotAverage(targetColor, guessColor, scoreFn) {
  const targetSlots = Array.isArray(targetColor?.slots) ? targetColor.slots : [];
  const guessSlots = Array.isArray(guessColor?.slots) ? guessColor.slots : [];

  if (!targetSlots.length || !guessSlots.length) {
    return scoreFn(targetColor.hex, guessColor.hex);
  }

  const scores = targetSlots.map((targetSlot) => {
    const guessSlot =
      guessSlots.find((slotColor) => slotColor.id === targetSlot.id) || guessSlots[0];

    return scoreFn(targetSlot.hex, guessSlot.hex);
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function validateGuessColorPayload(targetColor, guessColor) {
  if (isGradientColor(targetColor)) {
    const left = validateHsvColor(guessColor?.left);
    if (!left.ok) return left;

    const right = validateHsvColor(guessColor?.right);
    if (!right.ok) return right;

    return {
      ok: true,
      data: {
        color: withGradientHex({
          left: left.data.color,
          right: right.data.color,
        }),
      },
    };
  }

  if (isFlagColor(targetColor)) {
    const targetSlots = Array.isArray(targetColor.slots) ? targetColor.slots : [];

    if (!targetSlots.length) {
      const color = validateHsvColor({
        ...targetColor,
        ...guessColor,
      });
      if (!color.ok) return color;

      return {
        ok: true,
        data: {
          color: withFlagHex({
            ...color.data.color,
            flagId: targetColor.flagId,
          }),
        },
      };
    }

    const cleanSlots = [];

    for (const targetSlot of targetSlots) {
      const slotPayload = guessColor?.slots?.find(
        (slotColor) => slotColor?.id === targetSlot.id,
      );
      const slotResult = validateHsvColor({
        ...targetSlot,
        ...(slotPayload || guessColor),
      });

      if (!slotResult.ok) return slotResult;

      cleanSlots.push({
        id: targetSlot.id,
        ...slotResult.data.color,
      });
    }

    return {
      ok: true,
      data: {
        color: withFlagHex({
          activeSlotId: guessColor?.activeSlotId,
          slots: cleanSlots,
          flagId: targetColor.flagId,
        }),
      },
    };
  }

  if (isCartoonColor(targetColor)) {
    const color = validateHsvColor({
      ...targetColor,
      ...guessColor,
    });
    if (!color.ok) return color;

    return {
      ok: true,
      data: {
        color: withCartoonHex({
          ...color.data.color,
          cartoonId: targetColor.cartoonId,
        }),
      },
    };
  }

  return validateHsvColor(guessColor);
}

export function buildGamePayload(room) {
  if (!room.game) return null;

  return {
    roomCode: room.code,
    seed: room.game.seed,
    mode: room.game.mode,
    gameMode: room.game.mode,
    difficulty: room.game.difficulty,
    roundCount: room.game.roundCount,
    currentRoundIndex: room.game.currentRoundIndex || 0,
    isElimination: Boolean(room.game.isElimination),
    eliminationGapThreshold: room.game.isElimination
      ? duelGapThreshold(room.game.currentRoundIndex || 0)
      : null,
    lastElimination: room.game.lastElimination || null,
    revealDurationMs: room.game.revealDurationMs,
    guessDurationMs: room.game.guessDurationMs || null,
    targetColors: room.game.targetColors,
    startedAt: room.game.startedAt,
  };
}

export function startGameForRoom(room) {
  const seed = createSeed();
  const modeConfig = GAME_MODE_CONFIG[room.gameMode] || GAME_MODE_CONFIG.normal;
  const difficulty = modeConfig.lockedDifficulty || room.difficulty;
  const roundCount = room.roundCount || modeConfig.roundCount || DEFAULT_ROUND_COUNT;
  const isElimination = Boolean(modeConfig.elimination);

  room.status = ROOM_STATUSES.IN_GAME;
  room.seed = seed;
  room.difficulty = difficulty;
  room.game = {
    seed,
    mode: room.gameMode,
    difficulty,
    roundCount,
    currentRoundIndex: 0,
    isElimination,
    lastElimination: null,
    revealDurationMs: modeConfig.revealDurationMs,
    guessDurationMs: modeConfig.guessDurationMs || null,
    targetColors: generateTargetColors({
      seed,
      difficulty,
      roundCount,
      gameMode: room.gameMode,
    }),
    participantPlayerIds: new Set(
      Array.from(room.players.values())
        .filter((player) => !player.kicked)
        .map((player) => player.id),
    ),
    activePlayerIds: new Set(
      Array.from(room.players.values())
        .filter((player) => !player.kicked)
        .map((player) => player.id),
    ),
    startedAt: now(),
  };

  for (const player of room.players.values()) {
    player.submitted = false;
    player.inactive = false;
    player.returnedToLobby = false;
    player.eliminated = false;
    player.eliminatedRound = null;
    player.elimination = null;
    player.results = [];
    player.totalScore = 0;
  }

  return buildGamePayload(room);
}

function getActivePlayers(room) {
  if (!room.game) return [];

  return Array.from(room.game.activePlayerIds)
    .map((playerId) => room.players.get(playerId))
    .filter((player) => player && !player.inactive && !player.kicked);
}

export function markPlayerInactiveForGame(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || !room.game) return null;

  player.inactive = true;
  player.connected = false;
  if (isDuelRoom(room)) {
    player.eliminated = true;
    player.eliminatedRound = (room.game.currentRoundIndex || 0) + 1;
    player.elimination = {
      round: player.eliminatedRound,
      roundIndex: room.game.currentRoundIndex || 0,
      score: 0,
      gap: null,
      threshold: duelGapThreshold(room.game.currentRoundIndex || 0),
      disconnected: true,
    };
    room.game.activePlayerIds.delete(player.id);
  }
  player.lastSeenAt = now();
  room.updatedAt = now();
  return maybeFinishRoom(room);
}

export function submitRoundGuess(room, payload) {
  if (!room) return fail("Lobby not found or expired.");
  if (room.status !== ROOM_STATUSES.IN_GAME || !room.game) {
    return fail("Game has not started.");
  }

  const playerIdResult = validatePlayerId(payload.playerId);
  if (!playerIdResult.ok) return playerIdResult;

  const player = room.players.get(playerIdResult.data.playerId);
  if (!player || player.kicked) return fail("Player is not in this lobby.");
  if (player.inactive) return fail("This player is no longer active in the game.");
  if (isDuelRoom(room) && player.eliminated) {
    return fail("You were eliminated from this duel.");
  }

  const roundResult = validateRoundIndex(payload.roundIndex, room.game.roundCount);
  if (!roundResult.ok) return roundResult;

  const { roundIndex } = roundResult.data;
  if (isDuelRoom(room) && roundIndex !== room.game.currentRoundIndex) {
    return fail("This duel round is no longer active.");
  }

  const existing = player.results[roundIndex];
  if (existing) {
    return ok({
      result: existing,
      playerResults: player.results.filter(Boolean),
      leaderboard: room.leaderboard,
    });
  }

  const targetColor = room.game.targetColors[roundIndex];
  if (!targetColor) return fail("Target color is unavailable.");

  const colorResult = validateGuessColorPayload(targetColor, payload.guessColor);
  if (!colorResult.ok) return colorResult;

  const guessColor = isGradientColor(targetColor)
    ? withGradientHex(colorResult.data.color)
    : isFlagColor(targetColor)
      ? withFlagHex(colorResult.data.color)
      : isCartoonColor(targetColor)
        ? withCartoonHex(colorResult.data.color)
        : withHex(applyDifficultyConstraints(colorResult.data.color, room.difficulty));
  const score = roundScore(calculateMatchScore(targetColor, guessColor));
  const result = {
    round: roundIndex + 1,
    roundIndex,
    target: targetColor,
    targetColor,
    guess: guessColor,
    guessColor,
    score,
    grade: getGradeLabel(score),
    difference: {
      deltaE2000: roundScore(calculateMatchDistance(targetColor, guessColor)),
    },
  };

  player.results[roundIndex] = result;
  player.totalScore = roundScore(
    player.results.filter(Boolean).reduce((sum, item) => sum + item.score, 0),
  );
  player.submitted = player.results.filter(Boolean).length >= room.game.roundCount;
  player.lastSeenAt = now();
  room.updatedAt = now();

  const leaderboard = maybeFinishRoom(room);

  return ok({
    result,
    playerResults: player.results.filter(Boolean),
    playerTotalScoreSoFar: player.totalScore,
    leaderboard,
    duel: isDuelRoom(room)
      ? {
          currentRoundIndex: room.game.currentRoundIndex,
          lastElimination: room.game.lastElimination,
          playerEliminated: Boolean(player.eliminated),
        }
      : null,
  });
}

export function submitFullResults(room, payload) {
  if (!Array.isArray(payload.results)) return fail("Invalid score payload.");

  let lastResult = null;
  for (const item of payload.results) {
    const submission = submitRoundGuess(room, {
      playerId: payload.playerId,
      roundIndex: item.roundIndex,
      guessColor: item.guessColor || item.guess,
    });

    if (!submission.ok) return submission;
    lastResult = submission.data;
  }

  return ok(lastResult || {});
}

function getGameParticipantPlayers(room) {
  if (!room.game) return [];

  const participantIds = room.game.participantPlayerIds || room.game.activePlayerIds;

  return Array.from(participantIds)
    .map((playerId) => room.players.get(playerId))
    .filter((player) => player && !player.kicked);
}

function getDuelRoundRows(room, roundIndex) {
  return getActivePlayers(room)
    .map((player) => ({
      player,
      result: player.results[roundIndex] || null,
    }))
    .filter((row) => row.result);
}

function evaluateDuelRound(room) {
  const roundIndex = room.game.currentRoundIndex || 0;
  const activePlayers = getActivePlayers(room);

  if (activePlayers.length <= 1) {
    return { finished: true, eliminatedPlayer: null };
  }

  const allSubmitted = activePlayers.every((player) => player.results[roundIndex]);
  if (!allSubmitted) return { finished: false, eliminatedPlayer: null };

  const rows = getDuelRoundRows(room, roundIndex).sort((first, second) => {
    if (first.result.score !== second.result.score) {
      return first.result.score - second.result.score;
    }

    return first.player.joinedAt - second.player.joinedAt;
  });

  const worst = rows[0];
  const protectedPlayer = rows[1];
  const gap = roundScore((protectedPlayer?.result.score || 0) - worst.result.score);
  const threshold = duelGapThreshold(roundIndex);
  const maxRoundReached = roundIndex + 1 >= room.game.roundCount;
  const shouldEliminate = maxRoundReached || gap >= threshold;

  room.game.lastElimination = {
    round: roundIndex + 1,
    roundIndex,
    threshold,
    gap,
    eliminatedPlayerId: null,
    eliminatedPlayerName: null,
    protected: !shouldEliminate,
  };

  if (shouldEliminate) {
    const eliminatedPlayer = worst.player;

    eliminatedPlayer.eliminated = true;
    eliminatedPlayer.eliminatedRound = roundIndex + 1;
    eliminatedPlayer.elimination = {
      round: roundIndex + 1,
      roundIndex,
      score: worst.result.score,
      gap,
      threshold,
    };
    room.game.activePlayerIds.delete(eliminatedPlayer.id);
    room.game.lastElimination = {
      ...room.game.lastElimination,
      eliminatedPlayerId: eliminatedPlayer.id,
      eliminatedPlayerName: eliminatedPlayer.name,
      protected: false,
    };
  }

  const remainingPlayers = getActivePlayers(room);
  const finished = remainingPlayers.length <= 1 || maxRoundReached;

  if (!finished) {
    room.game.currentRoundIndex = roundIndex + 1;
  }

  return {
    finished,
    eliminatedPlayer: shouldEliminate ? worst.player : null,
  };
}

export function buildLeaderboard(room) {
  const isDuel = isDuelRoom(room);
  const players = isDuel ? getGameParticipantPlayers(room) : getActivePlayers(room);
  const totalRounds = isDuel
    ? Math.min((room.game.currentRoundIndex || 0) + 1, room.game.roundCount)
    : room.game.roundCount;
  const maxTotalScore = totalRounds * MAX_ROUND_SCORE;

  const ranked = players
    .map((player) => {
      const roundResults = Array.from({ length: totalRounds }, (_, index) => {
        const result = player.results[index];
        return (
          result || {
            round: index + 1,
            roundIndex: index,
            target: room.game.targetColors[index],
            targetColor: room.game.targetColors[index],
            guess: room.game.targetColors[index],
            guessColor: room.game.targetColors[index],
            score: 0,
            grade: "Missed",
            difference: null,
          }
        );
      });

      const totalScore = roundScore(
        roundResults.reduce((sum, result) => sum + result.score, 0),
      );

      return {
        playerId: player.id,
        playerName: player.name,
        connected: player.connected,
        submitted: player.submitted,
        eliminated: Boolean(player.eliminated),
        eliminatedRound: player.eliminatedRound,
        elimination: player.elimination,
        totalScore,
        maxTotalScore,
        roundResults,
      };
    })
    .sort((first, second) => {
      if (isDuel) {
        if (first.eliminated !== second.eliminated) {
          return first.eliminated ? 1 : -1;
        }

        if (first.eliminated && second.eliminated) {
          if (second.eliminatedRound !== first.eliminatedRound) {
            return second.eliminatedRound - first.eliminatedRound;
          }
        }
      }

      return second.totalScore - first.totalScore;
    });

  return {
    roomCode: room.code,
    mode: room.game.mode,
    gameMode: room.game.mode,
    difficulty: room.game.difficulty,
    totalRounds,
    maxRoundScore: MAX_ROUND_SCORE,
    maxTotalScore,
    targetColors: room.game.targetColors,
    players: ranked,
    leaderboard: ranked.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })),
    completedAt: now(),
  };
}

export function maybeFinishRoom(room) {
  if (!room.game || room.status !== ROOM_STATUSES.IN_GAME) return room.leaderboard;

  if (isDuelRoom(room)) {
    const duelResult = evaluateDuelRound(room);

    if (!duelResult.finished) {
      room.updatedAt = now();
      return null;
    }

    room.status = ROOM_STATUSES.COMPLETED;
    room.leaderboard = buildLeaderboard(room);
    room.updatedAt = now();
    return room.leaderboard;
  }

  const activePlayers = getActivePlayers(room);
  const allFinished =
    activePlayers.length > 0 &&
    activePlayers.every((player) => player.submitted);

  if (!allFinished) return null;

  room.status = ROOM_STATUSES.COMPLETED;
  room.leaderboard = buildLeaderboard(room);
  room.updatedAt = now();
  return room.leaderboard;
}
