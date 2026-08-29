import { FLAG_ITEMS } from "../../../shared/flagCatalog.mjs";
import {
  FLAG_DIFFICULTY_IDS,
  FLAG_DIFFICULTY_OPTIONS,
  getFlagDifficulty,
  getFlagsForDifficulty,
} from "../../../shared/flagDifficulty.mjs";

const GENERATED_ROOT = "/game-modes/flag/generated";

export const FLAG_OPTIONS = FLAG_ITEMS.map((item) => ({
  ...item,
  paintLabel: "flag",
  originalScenePath: `${GENERATED_ROOT}/${item.id}-original.webp`,
  baseScenePath: `${GENERATED_ROOT}/${item.id}-scene.webp`,
  scenePath: `${GENERATED_ROOT}/${item.id}-scene.webp`,
  imagePath: `${GENERATED_ROOT}/${item.id}-scene.webp`,
  maskPath: `${GENERATED_ROOT}/${item.id}-scene-mask.png`,
  assetPath: `${GENERATED_ROOT}/${item.id}-scene.webp`,
  difficulty: getFlagDifficulty(item.id),
  layers: [
    {
      id: "main",
      label: "flag",
      sourcePath: `${GENERATED_ROOT}/${item.id}-main-layer.png`,
      maskPath: `${GENERATED_ROOT}/${item.id}-scene-mask.png`,
      base: item.paint,
    },
  ],
}));

export { FLAG_DIFFICULTY_IDS, FLAG_DIFFICULTY_OPTIONS, getFlagsForDifficulty };

export const DEFAULT_FLAG_ID = FLAG_OPTIONS[0]?.id || null;

export function getFlagOption(flagId = DEFAULT_FLAG_ID) {
  return FLAG_OPTIONS.find((flag) => flag.id === flagId) || FLAG_OPTIONS[0];
}
