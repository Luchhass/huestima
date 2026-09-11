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
  GAME_FAMILIES,
  GAME_MODES,
  GAME_MODE_CONFIG,
  DIFFICULTIES,
  RUSH_MAX_ROUNDS,
  ROUND_COUNT_OPTIONS,
} from "../server/src/constants.js";
import { generateTargetColors } from "../server/src/game/colorGenerator.js";
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
  for (const mode of ["normal", "flash", "sequence", "timed", "gradient", "rush"]) {
    assert.equal(shouldMemorizeMultiplayerRound(mode, "color"), true, mode);
  }

  assert.equal(shouldMemorizeMultiplayerRound("spot", "color"), false);
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
  const hostMiss = submitRoundGuess(room, {
    playerId: hostId,
    roundIndex: 0,
    guessColor: { h: 0, s: 0, v: 0 },
  });
  assert.equal(hostMiss.ok, true);
  assert.equal(hostMiss.data.leaderboard, null);
  assert.equal(room.status, "in_game");
  assert.equal(room.game.activePlayerIds.has(hostId), false);
  assert.equal(room.game.activePlayerIds.has(guestId), true);

  const guestMiss = submitRoundGuess(room, {
    playerId: guestId,
    roundIndex: 0,
    guessColor: { h: 0, s: 0, v: 0 },
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
