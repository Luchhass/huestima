import {
  GAME_MODE_CONFIG,
  MAX_ROUND_SCORE,
  ROOM_STATUSES,
  ROUND_COUNT,
} from "../constants.js";
import {
  applyDifficultyConstraints,
  generateTargetColors,
  withHex,
} from "./colorGenerator.js";
import {
  calculateColorScore,
  getGradeLabel,
  oklabDistance,
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

export function buildGamePayload(room) {
  if (!room.game) return null;

  return {
    roomCode: room.code,
    seed: room.game.seed,
    mode: room.game.mode,
    gameMode: room.game.mode,
    difficulty: room.game.difficulty,
    roundCount: room.game.roundCount,
    revealDurationMs: room.game.revealDurationMs,
    targetColors: room.game.targetColors,
    startedAt: room.game.startedAt,
  };
}

export function startGameForRoom(room) {
  const seed = createSeed();
  const modeConfig = GAME_MODE_CONFIG[room.gameMode] || GAME_MODE_CONFIG.normal;

  room.status = ROOM_STATUSES.IN_GAME;
  room.seed = seed;
  room.game = {
    seed,
    mode: room.gameMode,
    difficulty: room.difficulty,
    roundCount: ROUND_COUNT,
    revealDurationMs: modeConfig.revealDurationMs,
    targetColors: generateTargetColors({
      seed,
      difficulty: room.difficulty,
      roundCount: ROUND_COUNT,
    }),
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

  const roundResult = validateRoundIndex(payload.roundIndex, room.game.roundCount);
  if (!roundResult.ok) return roundResult;

  const colorResult = validateHsvColor(payload.guessColor);
  if (!colorResult.ok) return colorResult;

  const { roundIndex } = roundResult.data;
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

  const guessColor = withHex(
    applyDifficultyConstraints(colorResult.data.color, room.difficulty),
  );
  const score = calculateColorScore(targetColor.hex, guessColor.hex);
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
      oklabDistance: roundScore(oklabDistance(targetColor.hex, guessColor.hex)),
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

export function buildLeaderboard(room) {
  const activePlayers = getActivePlayers(room);
  const maxTotalScore = room.game.roundCount * MAX_ROUND_SCORE;

  const ranked = activePlayers
    .map((player) => {
      const roundResults = Array.from({ length: room.game.roundCount }, (_, index) => {
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
    totalRounds: room.game.roundCount,
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
  const allFinished =
    activePlayers.length > 0 &&
    activePlayers.every((player) => player.submitted);

  if (!allFinished) return null;

  room.status = ROOM_STATUSES.COMPLETED;
  room.leaderboard = buildLeaderboard(room);
  room.updatedAt = now();
  return room.leaderboard;
}
