import assert from "node:assert/strict";
import { BRAND_ITEMS, TEAM_ITEMS } from "../shared/brandCatalog.mjs";
import { FLAG_ITEMS } from "../shared/flagCatalog.mjs";
import { BRAND_PAINT, TEAM_PAINT } from "../shared/visualPaintCatalog.mjs";
import { resolveGuessChannels } from "../shared/colorMechanics.mjs";
import { FLAG_OPTIONS as SERVER_FLAG_OPTIONS } from "../server/src/game/flags.js";

const difficulties = {
  easy: { controls: ["h"] },
  normal: { controls: ["h", "s"] },
  hard: { controls: ["h", "s", "v"] },
};
const target = { h: 12, s: 34, v: 56 };
const guess = { h: 210, s: 67, v: 78 };

assert.deepEqual(
  resolveGuessChannels({ guess, target, difficulty: difficulties.easy }),
  { h: 210, s: 34, v: 56 },
  "Easy must only expose hue.",
);
assert.deepEqual(
  resolveGuessChannels({ guess, target, difficulty: difficulties.normal }),
  { h: 210, s: 67, v: 56 },
  "Normal must expose hue and saturation.",
);
assert.deepEqual(
  resolveGuessChannels({ guess, target, difficulty: difficulties.hard }),
  guess,
  "Hard must expose all HSV channels.",
);

function assertPaintCatalog(items, paintCatalog, label) {
  assert.equal(Object.keys(paintCatalog).length, items.length, `${label} paint count is stale.`);
  for (const item of items) {
    const paint = paintCatalog[item.id];
    assert.ok(paint, `${label} ${item.id} has no measured paint.`);
    assert.ok(Number.isFinite(paint.h) && paint.h >= 0 && paint.h < 360);
    assert.ok(Number.isFinite(paint.s) && paint.s >= 0 && paint.s <= 100);
    assert.ok(Number.isFinite(paint.v) && paint.v >= 0 && paint.v <= 100);
  }
}

assertPaintCatalog(BRAND_ITEMS, BRAND_PAINT, "Brand");
assertPaintCatalog(TEAM_ITEMS, TEAM_PAINT, "Team");

const clientFlagIds = FLAG_ITEMS.map((flag) => flag.id);
const serverFlagIds = SERVER_FLAG_OPTIONS.map((flag) => flag.id);
assert.deepEqual(serverFlagIds, clientFlagIds, "Client and server flag catalogs differ.");
for (const flag of FLAG_ITEMS) {
  assert.ok(Number.isFinite(flag.paint?.h), `Flag ${flag.id} has no measured hue.`);
  assert.ok(Number.isFinite(flag.paint?.s), `Flag ${flag.id} has no measured saturation.`);
  assert.ok(Number.isFinite(flag.paint?.v), `Flag ${flag.id} has no measured value.`);
}

console.log(
  `Color mechanics healthy: ${BRAND_ITEMS.length} brands, ${TEAM_ITEMS.length} teams, ` +
    `${FLAG_ITEMS.length} shared flags, 3 difficulty contracts.`,
);
