import {
  BRAND_ITEMS,
  DEFAULT_BRAND_ID,
  getBrandItem,
} from "../../shared/brandCatalog.mjs";

const BRAND_ASSET_ROOT = "/game-modes/brand/brand-logos";
const BRAND_GENERATED_ROOT = "/game-modes/brand/generated";
const BRAND_BACKGROUND_HEX = "#e3e3e3";

export const BRAND_OPTIONS = BRAND_ITEMS.map((brand, index) => ({
  ...brand,
  catalogNumber: index + 1,
  labels: { en: brand.label, tr: brand.label },
  backgroundHex: BRAND_BACKGROUND_HEX,
  logoPath: `${BRAND_ASSET_ROOT}/${brand.assetFile}`,
  logoLayerPath: `${BRAND_GENERATED_ROOT}/${brand.id}-main-layer.png`,
  baseScenePath: `${BRAND_GENERATED_ROOT}/${brand.id}-scene.webp`,
  originalScenePath: `${BRAND_GENERATED_ROOT}/${brand.id}-original.webp`,
  scenePath: `${BRAND_GENERATED_ROOT}/${brand.id}-scene.webp`,
  imagePath: `${BRAND_GENERATED_ROOT}/${brand.id}-scene.webp`,
  assetPath: `${BRAND_GENERATED_ROOT}/${brand.id}-scene.webp`,
  maskPath: `${BRAND_GENERATED_ROOT}/${brand.id}-scene-mask.png`,
  layers: [
    {
      id: "logo",
      label: "logo",
      sourcePath: `${BRAND_GENERATED_ROOT}/${brand.id}-main-layer.png`,
      maskPath: `${BRAND_GENERATED_ROOT}/${brand.id}-scene-mask.png`,
      base: brand.paint,
    },
  ],
}));

export { DEFAULT_BRAND_ID };

export function getBrandOption(brandId = DEFAULT_BRAND_ID) {
  const brand = getBrandItem(brandId);

  return BRAND_OPTIONS.find((option) => option.id === brand.id) || BRAND_OPTIONS[0];
}
