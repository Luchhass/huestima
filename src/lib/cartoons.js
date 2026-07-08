import { CARTOON_ITEMS } from "../../shared/cartoonCatalog.mjs";

const DEFAULT_CARTOON_PACK = "adventure-time";

function getGeneratedRoot(item) {
  const sourcePath = item.sourcePath?.replaceAll("\\", "/") || "";
  const packMatch = sourcePath.match(/^public\/game-modes\/cartoon\/([^/]+)\//);
  const pack = packMatch?.[1] || DEFAULT_CARTOON_PACK;

  return `/game-modes/cartoon/${pack}/generated`;
}

function cartoon(item) {
  const { id, label, series, paintLabel, paint } = item;
  const assetRoot = getGeneratedRoot(item);
  const scenePath = `${assetRoot}/${id}-scene.webp`;
  const originalScenePath = `${assetRoot}/${id}-original.webp`;
  const maskPath = `${assetRoot}/${id}-scene-mask.png`;
  const mainLayerPath = `${assetRoot}/${id}-main-layer.png`;

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
