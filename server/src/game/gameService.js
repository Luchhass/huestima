import {
  DIFFICULTY_CONFIG,
  GAME_MODE_CONFIG,
  GAME_MODES,
  MAX_ROUND_SCORE,
  ROOM_STATUSES,
  DEFAULT_ROUND_COUNT,
} from "../constants.js";
import { recordGameActivity } from "../operations/metrics.js";
import {
  applyDifficultyConstraints,
  generateTargetColors,
  isCartoonColor,
  isBrandColor,
  isBlendColor,
  isFlagColor,
  isGradientColor,
  withCartoonHex,
  withBrandHex,
  withTeamHex,
  withFlagHex,
  withHex,
  withGradientHex,
  withBlendHex,
} from "./colorGenerator.js";
import { resolveGuessChannels } from "../../../shared/colorMechanics.mjs";
import {
  getEliminationThreshold,
  passesEliminationThreshold,
} from "../../../shared/elimination.mjs";
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
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function calculateMatchScore(targetColor, guessColor) {
  if (isBlendColor(targetColor) && isBlendColor(guessColor)) {
    return calculateColorScore(targetColor.hex, guessColor.hex);
  }

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

  if (isBrandColor(targetColor) && isBrandColor(guessColor)) {
    return calculateColorScore(targetColor.hex, guessColor.hex);
  }

  return calculateColorScore(targetColor.hex, guessColor.hex);
}

function calculateMatchDistance(targetColor, guessColor) {
  if (isBlendColor(targetColor) && isBlendColor(guessColor)) {
    return ciede2000Distance(targetColor.hex, guessColor.hex);
  }

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

  if (isBrandColor(targetColor) && isBrandColor(guessColor)) {
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

function completeHsvForDifficulty(targetColor, guessColor, difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
  return resolveGuessChannels({ guess: guessColor, target: targetColor, difficulty: config });
}

function validateGuessColorPayload(targetColor, guessColor, difficulty) {
  if (isBlendColor(targetColor)) {
    const sources = [];
    const guessSources = Array.isArray(guessColor?.sources)
      ? guessColor.sources.slice(0, 3)
      : [];
    for (const source of guessSources) {
      const validatedSource = validateHsvColor(source);
      if (!validatedSource.ok) return validatedSource;
      sources.push(validatedSource.data.color);
    }

    if (sources.length !== 3) {
      return { ok: false, error: "Blend guesses require three source colors." };
    }

    return {
      ok: true,
      data: {
        color: withBlendHex({ sources }),
      },
    };
  }

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
    const color = validateHsvColor(
      completeHsvForDifficulty(targetColor, guessColor, difficulty),
    );
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

  if (isCartoonColor(targetColor)) {
    const color = validateHsvColor(
      completeHsvForDifficulty(targetColor, guessColor, difficulty),
    );
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

  if (isBrandColor(targetColor)) {
    const color = validateHsvColor(
      completeHsvForDifficulty(targetColor, guessColor, difficulty),
    );
    if (!color.ok) return color;

    return {
      ok: true,
      data: {
        color: targetColor.teamId
          ? withTeamHex({ ...color.data.color, teamId: targetColor.teamId })
          : withBrandHex({ ...color.data.color, brandId: targetColor.brandId }),
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
    hintsEnabled: room.game.hintsEnabled !== false,
    currentRoundIndex: room.game.currentRoundIndex || 0,
    revealDurationMs: room.game.revealDurationMs,
    guessDurationMs: room.game.guessDurationMs || null,
    rushDurationMs: room.game.rushDurationMs || null,
    targetColors: room.game.targetColors,
    startedAt: room.game.startedAt,
  };
}

export function startGameForRoom(room) {
  const seed = createSeed();
  const modeConfig = GAME_MODE_CONFIG[room.gameMode] || GAME_MODE_CONFIG.normal;
  const difficulty = modeConfig.lockedDifficulty || room.difficulty;
  const roundCount = modeConfig.roundCount || room.roundCount || DEFAULT_ROUND_COUNT;

  room.status = ROOM_STATUSES.IN_GAME;
  room.seed = seed;
  room.difficulty = difficulty;
  room.game = {
    seed,
    mode: room.gameMode,
    difficulty,
    roundCount,
    hintsEnabled: room.hintsEnabled !== false,
    currentRoundIndex: 0,
    revealDurationMs: modeConfig.revealDurationMs,
    guessDurationMs: modeConfig.guessDurationMs || null,
    rushDurationMs: modeConfig.rushDurationMs || null,
    targetColors: generateTargetColors({
      seed,
      difficulty,
      roundCount,
      gameMode: room.gameMode,
      gameFamily: room.gameFamily,
      flagDifficulty: room.flagDifficulty,
      flagDifficulties: room.flagDifficulties,
      cartoonIds: room.cartoonIds,
      teamIds: room.teamIds,
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
    player.eliminated = false;
    player.inactive = false;
    player.returnedToLobby = false;
    player.results = [];
    player.totalScore = 0;
  }

  recordGameActivity(room, "started");

  return buildGamePayload(room);
}

function getActivePlayers(room) {
  if (!room.game) return [];

  return Array.from(room.game.activePlayerIds)
    .map((playerId) => room.players.get(playerId))
    .filter(
      (player) => player && !player.inactive && !player.kicked && !player.eliminated,
    );
}

function ensureEliminationTarget(room, roundIndex) {
  if (room.game.targetColors[roundIndex]) return room.game.targetColors[roundIndex];

  const requiredRoundCount = roundIndex + 1;
  room.game.targetColors = generateTargetColors({
    seed: room.game.seed,
    difficulty: room.game.difficulty,
    roundCount: requiredRoundCount,
    gameMode: room.game.mode,
    gameFamily: room.gameFamily,
    flagDifficulty: room.flagDifficulty,
    flagDifficulties: room.flagDifficulties,
    cartoonIds: room.cartoonIds,
    teamIds: room.teamIds,
  });
  room.game.roundCount = room.game.targetColors.length;
  return room.game.targetColors[roundIndex];
}

export function markPlayerInactiveForGame(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || !room.game) return null;

  player.inactive = true;
  player.connected = false;
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
  if (player.eliminated) return fail("This player has been eliminated.");

  const isElimination = room.game.mode === GAME_MODES.ELIMINATION;
  let roundIndex;
  if (isElimination) {
    roundIndex = Number(payload.roundIndex);
    const expectedRoundIndex = player.results.filter(Boolean).length;
    if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex !== expectedRoundIndex) {
      return fail("Invalid elimination round.");
    }
    ensureEliminationTarget(room, roundIndex);
  } else {
    const roundResult = validateRoundIndex(payload.roundIndex, room.game.roundCount);
    if (!roundResult.ok) return roundResult;
    roundIndex = roundResult.data.roundIndex;
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

  const colorResult = validateGuessColorPayload(
    targetColor,
    payload.guessColor,
    room.difficulty,
  );
  if (!colorResult.ok) return colorResult;

  const guessColor = isBlendColor(targetColor)
    ? withBlendHex(colorResult.data.color)
    : isGradientColor(targetColor)
      ? withGradientHex(colorResult.data.color)
      : isFlagColor(targetColor)
        ? withFlagHex(colorResult.data.color)
        : isCartoonColor(targetColor)
          ? withCartoonHex(colorResult.data.color)
          : isBrandColor(targetColor)
            ? targetColor.teamId
              ? withTeamHex({ ...colorResult.data.color, teamId: targetColor.teamId })
              : withBrandHex({
                  ...colorResult.data.color,
                  brandId: targetColor.brandId,
                })
            : withHex(applyDifficultyConstraints(colorResult.data.color, room.difficulty));
  const score = roundScore(calculateMatchScore(targetColor, guessColor));
  const eliminationThreshold = isElimination
    ? getEliminationThreshold(roundIndex)
    : null;
  const eliminationPassed = isElimination
    ? passesEliminationThreshold(score, roundIndex)
    : null;
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
    ...(isElimination
      ? {
          eliminationThreshold,
          eliminationPassed,
          eliminated: !eliminationPassed,
        }
      : {}),
  };

  player.results[roundIndex] = result;
  player.totalScore = roundScore(
    player.results.filter(Boolean).reduce((sum, item) => sum + item.score, 0),
  );
  if (isElimination) {
    player.eliminated = !eliminationPassed;
    player.submitted = !eliminationPassed;
    if (!eliminationPassed) {
      room.game.activePlayerIds.delete(player.id);
    } else {
      ensureEliminationTarget(room, roundIndex + 1);
    }
  } else {
    player.submitted = player.results.filter(Boolean).length >= room.game.roundCount;
  }
  player.lastSeenAt = now();
  room.updatedAt = now();

  const leaderboard = maybeFinishRoom(room);

  return ok({
    result,
    playerResults: player.results.filter(Boolean),
    playerTotalScoreSoFar: player.totalScore,
    nextTargetColor: isElimination && eliminationPassed
      ? room.game.targetColors[roundIndex + 1]
      : null,
    nextRoundIndex: isElimination && eliminationPassed ? roundIndex + 1 : null,
    leaderboard,
  });
}

export function submitFullResults(room, payload) {
  if (!Array.isArray(payload.results)) return fail("Invalid score payload.");

  const uniqueResults = new Map();
  for (const item of payload.results) {
    const roundResult = validateRoundIndex(item?.roundIndex, room.game?.roundCount);
    if (!roundResult.ok) return roundResult;
    if (!uniqueResults.has(roundResult.data.roundIndex)) {
      uniqueResults.set(roundResult.data.roundIndex, item);
    }
  }

  let lastResult = null;
  for (const item of uniqueResults.values()) {
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

export function finishRushForPlayer(room, payload) {
  if (!room) return fail("Lobby not found or expired.");
  if (room.status !== ROOM_STATUSES.IN_GAME || !room.game) {
    return fail("Game has not started.");
  }
  if (room.game.mode !== GAME_MODES.RUSH) return fail("This game is not a rush.");

  const playerIdResult = validatePlayerId(payload.playerId);
  if (!playerIdResult.ok) return playerIdResult;

  const player = room.players.get(playerIdResult.data.playerId);
  if (!player || player.kicked || player.inactive) {
    return fail("Player is not active in this game.");
  }

  player.submitted = true;
  player.lastSeenAt = now();
  room.updatedAt = now();

  return ok({ leaderboard: maybeFinishRoom(room) });
}

function getGameParticipantPlayers(room) {
  if (!room.game) return [];

  const participantIds = room.game.participantPlayerIds || room.game.activePlayerIds;

  return Array.from(participantIds)
    .map((playerId) => room.players.get(playerId))
    .filter((player) => player && !player.kicked);
}

export function buildLeaderboard(room) {
  const players = getGameParticipantPlayers(room);
  const isRush = room.game.mode === GAME_MODES.RUSH;
  const isElimination = room.game.mode === GAME_MODES.ELIMINATION;
  const totalRounds = isRush || isElimination
    ? Math.max(1, ...players.map((player) => player.results.filter(Boolean).length))
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
        totalScore,
        maxTotalScore,
        roundResults,
      };
    })
    .sort((first, second) => second.totalScore - first.totalScore);

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

  const activePlayers = getActivePlayers(room);
  const allFinished = room.game.mode === GAME_MODES.ELIMINATION
    ? activePlayers.length === 0
    : activePlayers.length > 0 && activePlayers.every((player) => player.submitted);

  if (!allFinished) return null;

  room.status = ROOM_STATUSES.COMPLETED;
  room.leaderboard = buildLeaderboard(room);
  room.updatedAt = now();
  recordGameActivity(room, "completed");
  return room.leaderboard;
}
