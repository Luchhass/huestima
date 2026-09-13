import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { BRAND_ITEMS, TEAM_ITEMS } from "../shared/brandCatalog.mjs";
import { CARTOON_ITEMS } from "../shared/cartoonCatalog.mjs";
import { FLAG_ITEMS } from "../shared/flagCatalog.mjs";
import {
  GAME_FAMILY_MODE_IDS,
  MULTIPLAYER_GAME_FAMILY_MODE_IDS,
} from "../shared/gameFamilyModes.mjs";
import {
  PATTERN_DIFFICULTY_GRIDS,
  PATTERN_DIFFICULTY_MISPLACED_COUNTS,
  countMisplacedPatternTiles,
  createPatternPuzzle,
  isPatternSolved,
  scorePatternRound,
  swapPatternTiles,
} from "../shared/patternGame.mjs";
import {
  createOddPuzzle,
  getOddDifference,
  isOddSelectionCorrect,
} from "../shared/oddGame.mjs";
import {
  BLEND_SOURCE_HUES,
  blendSourcesToHex,
} from "../shared/blendMechanics.mjs";
import {
  DECOY_MIN_HUE_DISTANCE,
  DECOY_POSITIONS,
} from "../shared/decoyMechanics.mjs";
import {
  GAME_FAMILIES,
  GAME_MODES,
  GAME_MODE_CONFIG,
  DIFFICULTIES,
  RUSH_MAX_ROUNDS,
  ROUND_COUNT_OPTIONS,
} from "../server/src/constants.js";
import {
  generateTargetColors,
  withBlendHex,
} from "../server/src/game/colorGenerator.js";
import { calculateColorScore } from "../server/src/game/scoring.js";
import { dominantPaint } from "../scripts/lib/visual-scene-pipeline.mjs";
import {
  createRoom,
  joinRoom,
  startRoomGame,
  updateRoomSettings,
} from "../server/src/rooms/roomService.js";
import {
  validateGameMode,
  validateGameModeForFamily,
  validateRoundCount,
} from "../server/src/rooms/roomValidation.js";
import {
  isFixedMultiplayerRoundMode,
  shouldMemorizeMultiplayerRound,
} from "../shared/gameMechanics.mjs";
import {
  getEliminationThreshold,
  passesEliminationThreshold,
} from "../shared/elimination.mjs";
import { submitRoundGuess } from "../server/src/game/gameService.js";
import { getRoom } from "../server/src/rooms/roomStore.js";

test("visual paint anchors follow a real dominant color instead of averaging hues", () => {
  const pixels = Buffer.from([
    255, 255, 0, 255,
    255, 255, 0, 255,
    255, 255, 0, 255,
    255, 255, 0, 255,
    0, 87, 183, 255,
    0, 87, 183, 255,
  ]);

  assert.deepEqual(dominantPaint(pixels, 4), { h: 60, s: 100, v: 100 });
});

const GENERATED_SUFFIXES = [
  "scene.webp",
  "original.webp",
  "scene-mask.png",
  "main-layer.png",
];

function assertGeneratedAssets(root, id) {
  for (const suffix of GENERATED_SUFFIXES) {
    assert.equal(
      existsSync(`${root}/${id}-${suffix}`),
      true,
      `Missing ${root}/${id}-${suffix}`,
    );
  }
}

test("the server accepts every multiplayer UI mode", () => {
  for (const [family, modes] of Object.entries(MULTIPLAYER_GAME_FAMILY_MODE_IDS)) {
    for (const mode of modes) {
      assert.equal(validateGameMode(mode).ok, true);
      assert.equal(validateGameModeForFamily(mode, family).ok, true);
    }
  }
});

test("multiplayer accepts every level count shown by the client", () => {
  assert.deepEqual(ROUND_COUNT_OPTIONS, [1, 3, 5, 10, 20]);

  for (const roundCount of ROUND_COUNT_OPTIONS) {
    assert.equal(validateRoundCount(roundCount).ok, true);
  }
});

test("multiplayer follows the same memorize rules as singleplayer", () => {
  for (const mode of ["normal", "flash", "sequence", "timed", "gradient", "blind", "blend", "decoy", "rush"]) {
    assert.equal(shouldMemorizeMultiplayerRound(mode, "color"), true, mode);
  }

  assert.equal(shouldMemorizeMultiplayerRound("spot", "color"), false);
  assert.equal(validateGameModeForFamily("blind", "color").ok, true);
  assert.equal(validateGameModeForFamily("blind", "flag").ok, false);
  assert.equal(validateGameModeForFamily("blend", "color").ok, true);
  assert.equal(validateGameModeForFamily("blend", "flag").ok, false);
  assert.equal(validateGameModeForFamily("decoy", "color").ok, true);
  assert.equal(validateGameModeForFamily("decoy", "flag").ok, false);
  for (const family of ["flag", "cartoon", "brand", "team"]) {
    assert.equal(shouldMemorizeMultiplayerRound("normal", family), false, family);
  }
});

test("locked multiplayer modes have matching backend rules", () => {
  assert.equal(GAME_MODE_CONFIG.spot.lockedDifficulty, DIFFICULTIES.HARD);
  assert.equal(GAME_MODE_CONFIG.spot.revealDurationMs, 0);
  assert.equal(GAME_MODE_CONFIG.rush.roundCount, RUSH_MAX_ROUNDS);
  assert.equal(isFixedMultiplayerRoundMode("rush"), true);
  assert.equal(isFixedMultiplayerRoundMode("elimination"), true);
  assert.equal(isFixedMultiplayerRoundMode("normal"), false);
});

test("blend is Easy-only and every generated target is exactly reproducible with RGB bars", () => {
  assert.equal(GAME_MODE_CONFIG.blend.lockedDifficulty, DIFFICULTIES.EASY);
  assert.deepEqual(BLEND_SOURCE_HUES, [0, 120, 240]);
  assert.equal(GAME_FAMILY_MODE_IDS.color.includes("blend"), true);
  assert.equal(MULTIPLAYER_GAME_FAMILY_MODE_IDS.color.includes("blend"), true);

  for (const family of ["flag", "cartoon", "brand", "team"]) {
    assert.equal(GAME_FAMILY_MODE_IDS[family].includes("blend"), false, family);
    assert.equal(MULTIPLAYER_GAME_FAMILY_MODE_IDS[family].includes("blend"), false, family);
  }

  const channelCheck = withBlendHex({
    sources: [
      { h: 42, s: 15, v: 0 },
      { h: 42, s: 15, v: 50 },
      { h: 42, s: 15, v: 100 },
    ],
  });
  assert.deepEqual(channelCheck.sources.map(({ h }) => h), [0, 120, 240]);
  assert.deepEqual(channelCheck.sources.map(({ s }) => s), [100, 100, 100]);
  assert.deepEqual(channelCheck.sources.map(({ v }) => v), [0, 50, 100]);
  assert.equal(channelCheck.hex, "#0080ff");

  const targets = generateTargetColors({
    seed: "blend-rgb-audit",
    difficulty: DIFFICULTIES.HARD,
    roundCount: 64,
    gameMode: GAME_MODES.BLEND,
    gameFamily: GAME_FAMILIES.COLOR,
  });

  for (const target of targets) {
    assert.equal(target.sources.length, 3);
    assert.deepEqual(target.sources.map(({ h }) => h), [0, 120, 240]);
    assert.deepEqual(target.sources.map(({ s }) => s), [100, 100, 100]);
    assert.equal(target.sources.every(({ v }) => Number.isInteger(v) && v >= 0 && v <= 100), true);
    assert.equal(Math.max(...target.sources.map(({ v }) => v)) >= 30, true);
    assert.equal(target.hex, blendSourcesToHex(target.sources));

    const reconstructed = withBlendHex({
      sources: target.sources.map(({ v }) => ({ h: 999, s: 0, v })),
    });
    assert.equal(reconstructed.hex, target.hex);
    assert.equal(calculateColorScore(target.hex, reconstructed.hex), 10);
  }

  const playerId = `blend-audit-${Date.now()}`;
  const created = createRoom({
    playerId,
    playerName: "Blend Tester",
    roomName: "Blend RGB audit",
    visibility: "public",
    gameMode: GAME_MODES.BLEND,
    gameFamily: GAME_FAMILIES.COLOR,
    difficulty: DIFFICULTIES.HARD,
    roundCount: 1,
  });
  assert.equal(created.ok, true);

  const roomCode = created.data.room.code;
  const started = startRoomGame({ roomCode, playerId });
  assert.equal(started.ok, true);

  const room = getRoom(roomCode);
  assert.equal(room.difficulty, DIFFICULTIES.EASY);
  assert.equal(room.game.difficulty, DIFFICULTIES.EASY);

  const perfectSubmission = submitRoundGuess(room, {
    playerId,
    roundIndex: 0,
    guessColor: room.game.targetColors[0],
  });
  assert.equal(perfectSubmission.ok, true);
  assert.equal(perfectSubmission.data.result.score, 10);
});

test("decoy keeps Classic controls while hiding one real target among two distinct colors", () => {
  assert.equal(GAME_MODE_CONFIG.decoy.lockedDifficulty, undefined);
  assert.equal(GAME_FAMILY_MODE_IDS.color.includes("decoy"), true);
  assert.equal(MULTIPLAYER_GAME_FAMILY_MODE_IDS.color.includes("decoy"), true);

  for (const family of ["flag", "cartoon", "brand", "team"]) {
    assert.equal(GAME_FAMILY_MODE_IDS[family].includes("decoy"), false, family);
    assert.equal(MULTIPLAYER_GAME_FAMILY_MODE_IDS[family].includes("decoy"), false, family);
  }

  for (const difficulty of Object.values(DIFFICULTIES)) {
    const targets = generateTargetColors({
      seed: `decoy-${difficulty}-audit`,
      difficulty,
      roundCount: 32,
      gameMode: GAME_MODES.DECOY,
      gameFamily: GAME_FAMILIES.COLOR,
    });

    for (const target of targets) {
      assert.equal(target.type, GAME_MODES.DECOY);
      assert.equal(Boolean(target.decoy?.hex), true);
      assert.equal(DECOY_POSITIONS.includes(target.targetPosition), true);

      const hueDifference = Math.abs(target.h - target.decoy.h);
      const circularHueDistance = Math.min(hueDifference, 360 - hueDifference);
      assert.equal(circularHueDistance >= DECOY_MIN_HUE_DISTANCE, true);
      assert.equal(calculateColorScore(target.hex, target.hex), 10);
      assert.equal(calculateColorScore(target.hex, target.decoy.hex) < 10, true);
    }

    if (difficulty === DIFFICULTIES.EASY) {
      assert.equal(targets.every((target) => target.s === 82 && target.v === 78), true);
      assert.equal(targets.every((target) => target.decoy.s === 82 && target.decoy.v === 78), true);
    }
  }

  const createDecoyRoom = (suffix) => {
    const playerId = `decoy-${suffix}-${Date.now()}`;
    const created = createRoom({
      playerId,
      playerName: "Decoy Tester",
      roomName: `Decoy ${suffix}`,
      visibility: "public",
      gameMode: GAME_MODES.DECOY,
      gameFamily: GAME_FAMILIES.COLOR,
      difficulty: DIFFICULTIES.HARD,
      roundCount: 1,
    });
    assert.equal(created.ok, true);
    assert.equal(startRoomGame({ roomCode: created.data.room.code, playerId }).ok, true);

    return {
      playerId,
      room: getRoom(created.data.room.code),
    };
  };

  const perfectGame = createDecoyRoom("real");
  const perfectTarget = perfectGame.room.game.targetColors[0];
  const perfectSubmission = submitRoundGuess(perfectGame.room, {
    playerId: perfectGame.playerId,
    roundIndex: 0,
    guessColor: perfectTarget,
  });
  assert.equal(perfectSubmission.ok, true);
  assert.equal(perfectSubmission.data.result.score, 10);

  const fooledGame = createDecoyRoom("fake");
  const fooledTarget = fooledGame.room.game.targetColors[0];
  const fooledSubmission = submitRoundGuess(fooledGame.room, {
    playerId: fooledGame.playerId,
    roundIndex: 0,
    guessColor: fooledTarget.decoy,
  });
  assert.equal(fooledSubmission.ok, true);
  assert.equal(fooledSubmission.data.result.score < 10, true);
});

test("elimination threshold rises smoothly and still allows a perfect endless run", () => {
  assert.deepEqual(
    Array.from({ length: 13 }, (_, roundIndex) => getEliminationThreshold(roundIndex)),
    [2, 3, 4.2, 5.4, 6.4, 7.2, 7.9, 8.5, 9, 9.4, 9.7, 9.9, 9.97],
  );
  assert.equal(getEliminationThreshold(13), 9.985);
  assert.ok(getEliminationThreshold(30) <= 10);
  assert.equal(passesEliminationThreshold(10, 10_000), true);
});

test("multiplayer elimination expands beyond its initial targets and ends on a miss", () => {
  const playerId = `elimination-${Date.now()}`;
  const created = createRoom({
    playerId,
    playerName: "Survivor",
    roomName: "Elimination lobby",
    visibility: "public",
    gameMode: "elimination",
    gameFamily: "color",
    difficulty: "hard",
    roundCount: 3,
  });
  assert.equal(created.ok, true);

  const roomCode = created.data.room.code;
  const started = startRoomGame({ roomCode, playerId });
  assert.equal(started.ok, true);

  const room = getRoom(roomCode);
  for (let roundIndex = 0; roundIndex < 17; roundIndex += 1) {
    const target = room.game.targetColors[roundIndex];
    const submission = submitRoundGuess(room, {
      playerId,
      roundIndex,
      guessColor: target,
    });
    assert.equal(submission.ok, true, `perfect round ${roundIndex + 1}`);
    assert.equal(submission.data.result.eliminationPassed, true);
  }

  assert.ok(room.game.targetColors.length >= 18);
  const failed = submitRoundGuess(room, {
    playerId,
    roundIndex: 17,
    guessColor: { h: 0, s: 0, v: 0 },
  });
  assert.equal(failed.ok, true);
  assert.equal(failed.data.result.eliminationPassed, false);
  assert.equal(room.players.get(playerId).eliminated, true);
  assert.equal(room.status, "completed");
  assert.ok(failed.data.leaderboard);
});

test("eliminated multiplayer players wait while the remaining player continues", () => {
  const hostId = `elimination-host-${Date.now()}`;
  const guestId = `elimination-guest-${Date.now()}`;
  const created = createRoom({
    playerId: hostId,
    playerName: "Host",
    roomName: "Elimination duo",
    visibility: "public",
    gameMode: "elimination",
    gameFamily: "color",
    difficulty: "hard",
    roundCount: 5,
  });
  assert.equal(created.ok, true);
  const roomCode = created.data.room.code;
  const joined = joinRoom({ roomCode, playerId: guestId, playerName: "Guest" });
  assert.equal(joined.ok, true);
  assert.equal(startRoomGame({ roomCode, playerId: hostId }).ok, true);

  const room = getRoom(roomCode);
  const target = room.game.targetColors[0];
  const deliberateMiss = {
    h: (target.h + 180) % 360,
    s: 100,
    v: 100,
  };
  const hostMiss = submitRoundGuess(room, {
    playerId: hostId,
    roundIndex: 0,
    guessColor: deliberateMiss,
  });
  assert.equal(hostMiss.ok, true);
  assert.equal(hostMiss.data.leaderboard, null);
  assert.equal(room.status, "in_game");
  assert.equal(room.game.activePlayerIds.has(hostId), false);
  assert.equal(room.game.activePlayerIds.has(guestId), true);

  const guestMiss = submitRoundGuess(room, {
    playerId: guestId,
    roundIndex: 0,
    guessColor: deliberateMiss,
  });
  assert.equal(guestMiss.ok, true);
  assert.ok(guestMiss.data.leaderboard);
  assert.equal(room.status, "completed");
});

test("lobby settings update atomically and enforce mode locks", () => {
  const playerId = `mechanics-${Date.now()}`;
  const created = createRoom({
    playerId,
    playerName: "Tester",
    roomName: "Mechanics lobby",
    visibility: "public",
    gameMode: "normal",
    gameFamily: "color",
    difficulty: "easy",
    roundCount: 5,
  });
  assert.equal(created.ok, true);

  const roomCode = created.data.room.code;
  const updated = updateRoomSettings({
    roomCode,
    playerId,
    gameMode: "spot",
    difficulty: "easy",
    roundCount: 10,
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.data.room.gameMode, "spot");
  assert.equal(updated.data.room.difficulty, "hard");
  assert.equal(updated.data.room.roundCount, 10);

  const rejected = updateRoomSettings({
    roomCode,
    playerId,
    gameMode: "timed",
    roundCount: 2,
  });
  assert.equal(rejected.ok, false);

  const unchanged = updateRoomSettings({ roomCode, playerId });
  assert.equal(unchanged.data.room.gameMode, "spot");
  assert.equal(unchanged.data.room.difficulty, "hard");
  assert.equal(unchanged.data.room.roundCount, 10);
});

test("changing flag difficulty updates the active flag pool", () => {
  const playerId = `flag-mechanics-${Date.now()}`;
  const created = createRoom({
    playerId,
    playerName: "Flag tester",
    roomName: "Flag lobby",
    visibility: "public",
    gameMode: "normal",
    gameFamily: "flag",
    difficulty: "normal",
    flagDifficulty: "starter",
    roundCount: 3,
  });
  assert.equal(created.ok, true);

  const updated = updateRoomSettings({
    roomCode: created.data.room.code,
    playerId,
    flagDifficulty: "advanced",
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.data.room.flagDifficulty, "advanced");
  assert.deepEqual(updated.data.room.flagDifficulties, ["advanced"]);
});

test("every multiplayer family and mode starts with a valid game payload", () => {
  let roomIndex = 0;

  for (const [gameFamily, modes] of Object.entries(MULTIPLAYER_GAME_FAMILY_MODE_IDS)) {
    for (const gameMode of modes) {
      roomIndex += 1;
      const playerId = `runtime-host-${roomIndex}`;
      const created = createRoom({
        playerId,
        playerName: `Host ${roomIndex}`,
        roomName: `Runtime lobby ${roomIndex}`,
        visibility: "public",
        gameMode,
        gameFamily,
        difficulty: "normal",
        roundCount: 3,
      });
      assert.equal(created.ok, true, `${gameFamily}/${gameMode} create`);

      const started = startRoomGame({
        roomCode: created.data.room.code,
        playerId,
      });
      assert.equal(started.ok, true, `${gameFamily}/${gameMode} start`);

      const modeConfig = GAME_MODE_CONFIG[gameMode];
      const expectedRoundCount = modeConfig?.roundCount || 3;
      assert.equal(started.data.game.roundCount, expectedRoundCount);
      assert.equal(started.data.game.targetColors.length, expectedRoundCount);
      assert.equal(
        started.data.game.difficulty,
        modeConfig?.lockedDifficulty || "normal",
      );
    }
  }
});

test("pattern multiplayer scores the repaired shared board", () => {
  const playerId = `pattern-multiplayer-${Date.now()}`;
  const created = createRoom({
    playerId,
    playerName: "Pattern tester",
    roomName: "Pattern lobby",
    visibility: "public",
    gameMode: GAME_MODES.PATTERN,
    gameFamily: GAME_FAMILIES.PERCEPTION,
    difficulty: DIFFICULTIES.NORMAL,
    roundCount: 1,
  });
  assert.equal(created.ok, true);
  assert.equal(startRoomGame({ roomCode: created.data.room.code, playerId }).ok, true);

  const room = getRoom(created.data.room.code);
  const target = room.game.targetColors[0];
  const submitted = submitRoundGuess(room, {
    playerId,
    roundIndex: 0,
    patternBoard: Array.from({ length: target.board.length }, (_, index) => index),
    remainingMs: 5000,
    swaps: 2,
  });
  assert.equal(submitted.ok, true);
  assert.equal(submitted.data.result.solved, true);
  assert.equal(submitted.data.result.score, 10);
});

test("odd always creates six tiles with exactly one different tone and a shrinking gap", () => {
  const first = createOddPuzzle(() => 0.37, { difficulty: "normal", level: 0 });
  const later = createOddPuzzle(() => 0.37, { difficulty: "normal", level: 20 });

  assert.equal(first.colors.length, 6);
  assert.match(first.hex, /^#[0-9a-f]{6}$/i);
  assert.ok(first.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color)));
  assert.equal(first.colors.filter((color) => color === first.oddColor).length, 1);
  assert.equal(first.colors.filter((color) => color === first.baseColor).length, 5);
  assert.equal(isOddSelectionCorrect(first, first.oddIndex), true);
  assert.equal(isOddSelectionCorrect(first, (first.oddIndex + 1) % 6), false);
  assert.ok(later.difference < first.difference);
  assert.ok(getOddDifference(0, "easy") >= 18);
  assert.ok(getOddDifference(10, "easy") > 7);
  assert.ok(getOddDifference(15, "normal") > 3);
  assert.ok(getOddDifference(20, "normal") > 2);
  assert.ok(getOddDifference(30, "hard") > 1);
  assert.ok(getOddDifference(1000, "hard") >= 0.65);
});

test("multiplayer odd expands after correct choices and ends each player on a miss", () => {
  const playerId = `odd-${Date.now()}`;
  const created = createRoom({
    playerId,
    playerName: "Odd tester",
    roomName: "Odd lobby",
    visibility: "public",
    gameMode: GAME_MODES.ODD,
    gameFamily: GAME_FAMILIES.PERCEPTION,
    difficulty: DIFFICULTIES.NORMAL,
    roundCount: 5,
  });
  assert.equal(created.ok, true);
  assert.equal(startRoomGame({ roomCode: created.data.room.code, playerId }).ok, true);

  const room = getRoom(created.data.room.code);
  const first = room.game.targetColors[0];
  const correct = submitRoundGuess(room, {
    playerId,
    roundIndex: 0,
    oddSelection: first.oddIndex,
  });
  assert.equal(correct.ok, true);
  assert.equal(correct.data.result.oddPassed, true);
  assert.equal(correct.data.result.score, 0);
  assert.equal(correct.data.result.guess.hex, first.colors[first.oddIndex]);
  assert.ok(correct.data.nextTargetColor);
  assert.equal(room.status, "in_game");

  const second = room.game.targetColors[1];
  const wrong = submitRoundGuess(room, {
    playerId,
    roundIndex: 1,
    oddSelection: (second.oddIndex + 1) % 6,
  });
  assert.equal(wrong.ok, true);
  assert.equal(wrong.data.result.oddPassed, false);
  assert.equal(wrong.data.result.score, 0);
  assert.equal(room.status, "completed");
  assert.ok(wrong.data.leaderboard);
  assert.equal(wrong.data.leaderboard.leaderboard[0].totalScore, 0);
  assert.equal(wrong.data.leaderboard.leaderboard[0].oddLevelsCleared, 1);
});

test("every multiplayer family has a room route", () => {
  for (const family of Object.keys(MULTIPLAYER_GAME_FAMILY_MODE_IDS)) {
    assert.equal(
      existsSync(`src/app/${family}/[roomCode]/page.jsx`),
      true,
      `Missing room route for ${family}`,
    );
  }
});

test("the server rejects cross-family modes", () => {
  assert.equal(validateGameModeForFamily("endless", GAME_FAMILIES.COLOR).ok, false);
  assert.equal(validateGameModeForFamily(GAME_MODES.GRADIENT, GAME_FAMILIES.FLAG).ok, false);
  assert.equal(validateGameModeForFamily(GAME_MODES.SEQUENCE, GAME_FAMILIES.BRAND).ok, false);
});

test("every family/mode combination generates deterministic targets", () => {
  for (const [family, modes] of Object.entries(GAME_FAMILY_MODE_IDS)) {
    if (family === "perception") continue;
    for (const mode of modes) {
      const input = {
        seed: `test-${family}-${mode}`,
        difficulty: "normal",
        roundCount: 3,
        gameMode: mode,
        gameFamily: family,
      };
      const first = generateTargetColors(input);
      const second = generateTargetColors(input);
      assert.equal(first.length, 3);
      assert.deepEqual(first, second);

      if (family === "flag") assert.ok(first.every((target) => target.flagId));
      if (family === "cartoon") assert.ok(first.every((target) => target.cartoonId));
      if (family === "brand") assert.ok(first.every((target) => target.brandId && !target.teamId));
      if (family === "team") assert.ok(first.every((target) => target.teamId));
    }
  }
});

test("pattern puzzles move the requested number of tiles and remain solvable", () => {
  for (const misplacedCount of [2, 3, 4]) {
    const puzzle = createPatternPuzzle(() => 0.37, { misplacedCount, variant: 2 });
    assert.equal(countMisplacedPatternTiles(puzzle.board), misplacedCount);
    assert.equal(isPatternSolved(puzzle.board), false);

    let board = [...puzzle.board];
    while (!isPatternSolved(board)) {
      const firstWrong = board.findIndex((tile, index) => tile !== index);
      const tileForPosition = board.findIndex((tile) => tile === firstWrong);
      board = swapPatternTiles(board, firstWrong, tileForPosition);
    }
    assert.equal(isPatternSolved(board), true);
  }
});

test("pattern difficulty increases the board density", () => {
  const grids = ["easy", "normal", "hard"].map((difficulty) =>
    createPatternPuzzle(() => 0.37, { difficulty, variant: 2 }),
  );

  assert.deepEqual(
    grids.map(({ rows, columns }) => ({ rows, columns })),
    ["easy", "normal", "hard"].map((difficulty) => PATTERN_DIFFICULTY_GRIDS[difficulty]),
  );
  assert.ok(grids[0].board.length < grids[1].board.length);
  assert.ok(grids[1].board.length < grids[2].board.length);
  assert.deepEqual(
    grids.map(({ board }) => countMisplacedPatternTiles(board)),
    ["easy", "normal", "hard"].map(
      (difficulty) => PATTERN_DIFFICULTY_MISPLACED_COUNTS[difficulty],
    ),
  );
});

test("pattern scoring follows repaired puzzle progress", () => {
  assert.equal(scorePatternRound({ initialMisplaced: 8, remainingMisplaced: 0 }), 10);
  assert.equal(scorePatternRound({ initialMisplaced: 8, remainingMisplaced: 2 }), 7.5);
  assert.equal(scorePatternRound({ initialMisplaced: 8, remainingMisplaced: 8 }), 0);
});

test("every visual catalog entry has its runtime assets", () => {
  for (const flag of FLAG_ITEMS) {
    assertGeneratedAssets("public/game-modes/flag/generated", flag.id);
  }

  for (const cartoon of CARTOON_ITEMS) {
    const normalizedSource = cartoon.sourcePath?.replaceAll("\\", "/") || "";
    const pack = normalizedSource.match(/^public\/game-modes\/cartoon\/([^/]+)\//)?.[1] || "ben-10";
    assertGeneratedAssets(`public/game-modes/cartoon/${pack}/generated`, cartoon.id);
  }

  for (const brand of BRAND_ITEMS) {
    assert.equal(existsSync(`public/game-modes/brand/brand-logos/${brand.assetFile}`), true);
    assertGeneratedAssets("public/game-modes/brand/generated", brand.id);
  }

  for (const team of TEAM_ITEMS) {
    assert.equal(existsSync(`public/game-modes/team/team-logos/${team.assetFile}`), true);
    assertGeneratedAssets("public/game-modes/team/generated", team.id);
  }
});
