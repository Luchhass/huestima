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
  ROUND_COUNT_OPTIONS,
} from "../server/src/constants.js";
import { generateTargetColors } from "../server/src/game/colorGenerator.js";
import {
  validateGameModeForFamily,
  validateRoundCount,
} from "../server/src/rooms/roomValidation.js";

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
