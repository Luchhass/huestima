import { CARTOON_ITEMS } from "../../shared/cartoonCatalog.mjs";

const ASSET_ROOT = "/game-modes/cartoon/adventure-time/generated";

function cartoon({ id, label, series, paintLabel, paint }) {
  const scenePath = `${ASSET_ROOT}/${id}-scene.webp`;
  const originalScenePath = `${ASSET_ROOT}/${id}-original.webp`;
  const maskPath = `${ASSET_ROOT}/${id}-scene-mask.png`;
  const mainLayerPath = `${ASSET_ROOT}/${id}-main-layer.png`;

  return {
    id,
    label,
    series,
    paintLabel,
    originalScenePath,
    baseScenePath: scenePath,
    scenePath,
    imagePath: scenePath,
    maskPath,
    assetPath: scenePath,
    paint,
    layers: [
      {
        id: "main",
        label: paintLabel || "main",
        sourcePath: mainLayerPath,
        maskPath,
        base: paint,
      },
    ],
  };
}

export const CARTOON_OPTIONS = CARTOON_ITEMS.map(cartoon);

export const HAS_CARTOON_OPTIONS = CARTOON_OPTIONS.length > 0;

export const DEFAULT_CARTOON_ID = CARTOON_OPTIONS[0]?.id || null;

export function getCartoonOption(cartoonId) {
  return (
    CARTOON_OPTIONS.find((cartoonOption) => cartoonOption.id === cartoonId) ||
    CARTOON_OPTIONS.find((cartoonOption) => cartoonOption.id === DEFAULT_CARTOON_ID) ||
    null
  );
}
