import {
  BRAND_ITEMS,
  DEFAULT_BRAND_ID,
  getBrandItem,
} from "../../shared/brandCatalog.mjs";

const BRAND_ASSET_ROOT = "/game-modes/brand/generated";
const BRAND_BACKGROUND_HEX = "#ebe7df";
const BRAND_BASE_SCENE_PATH = `${BRAND_ASSET_ROOT}/brand-transparent-base.png`;

export const BRAND_OPTIONS = BRAND_ITEMS.map((brand) => ({
  ...brand,
  labels: { en: brand.label, tr: brand.label },
  backgroundHex: BRAND_BACKGROUND_HEX,
  baseScenePath: BRAND_BASE_SCENE_PATH,
  originalScenePath: BRAND_BASE_SCENE_PATH,
  logoPath: `${BRAND_ASSET_ROOT}/${brand.id}-logo.png`,
  imagePath: `${BRAND_ASSET_ROOT}/${brand.id}-logo.png`,
  assetPath: `${BRAND_ASSET_ROOT}/${brand.id}-logo.png`,
  maskPath: `${BRAND_ASSET_ROOT}/${brand.id}-mask.png`,
  layers: [
    {
      id: "logo",
      label: "logo",
      sourcePath: `${BRAND_ASSET_ROOT}/${brand.id}-logo.png`,
      maskPath: `${BRAND_ASSET_ROOT}/${brand.id}-mask.png`,
      base: brand.paint,
    },
  ],
}));

export { DEFAULT_BRAND_ID };

export function getBrandOption(brandId = DEFAULT_BRAND_ID) {
  const brand = getBrandItem(brandId);

  return BRAND_OPTIONS.find((option) => option.id === brand.id) || BRAND_OPTIONS[0];
}
