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
  DUEL_MAX_ROUNDS,
  SPRINT_MAX_ROUNDS,
  ROUND_COUNT_OPTIONS,
} from "../server/src/constants.js";
import { generateTargetColors } from "../server/src/game/colorGenerator.js";
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
  for (const mode of ["normal", "flash", "sequence", "timed", "gradient", "sprint", "duel"]) {
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
  assert.equal(GAME_MODE_CONFIG.sprint.roundCount, SPRINT_MAX_ROUNDS);
  assert.equal(GAME_MODE_CONFIG.duel.roundCount, DUEL_MAX_ROUNDS);
  assert.equal(isFixedMultiplayerRoundMode("sprint"), true);
  assert.equal(isFixedMultiplayerRoundMode("duel"), true);
  assert.equal(isFixedMultiplayerRoundMode("normal"), false);
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

      if (gameMode === GAME_MODES.DUEL) {
        const joined = joinRoom({
          roomCode: created.data.room.code,
          playerId: `runtime-guest-${roomIndex}`,
          playerName: `Guest ${roomIndex}`,
        });
        assert.equal(joined.ok, true, `${gameFamily}/${gameMode} join`);
      }

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
  assert.equal(validateGameModeForFamily(GAME_MODES.DUEL, GAME_FAMILIES.TEAM).ok, false);
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
