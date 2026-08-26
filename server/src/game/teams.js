import { TEAM_ITEMS } from "../../../shared/brandCatalog.mjs";

const ASSET_ROOT = "/game-modes/team/team-logos";
const GENERATED_ROOT = "/game-modes/team/generated";
const BACKGROUND_HEX = "#e3e3e3";

export const TEAM_OPTIONS = TEAM_ITEMS.map((team, index) => ({
  ...team,
  catalogNumber: index + 1,
  labels: { en: team.label, tr: team.label },
  backgroundHex: BACKGROUND_HEX,
  logoPath: `${ASSET_ROOT}/${team.assetFile}`,
  logoLayerPath: `${GENERATED_ROOT}/${team.id}-main-layer.png`,
  baseScenePath: `${GENERATED_ROOT}/${team.id}-scene.webp`,
  originalScenePath: `${GENERATED_ROOT}/${team.id}-original.webp`,
  scenePath: `${GENERATED_ROOT}/${team.id}-scene.webp`,
  imagePath: `${GENERATED_ROOT}/${team.id}-scene.webp`,
  assetPath: `${GENERATED_ROOT}/${team.id}-scene.webp`,
  maskPath: `${GENERATED_ROOT}/${team.id}-scene-mask.png`,
  layers: [{
    id: "logo",
    label: "logo",
    sourcePath: `${GENERATED_ROOT}/${team.id}-main-layer.png`,
    maskPath: `${GENERATED_ROOT}/${team.id}-scene-mask.png`,
    base: team.paint,
  }],
}));

export const DEFAULT_TEAM_ID = TEAM_OPTIONS[0]?.id;

export function getTeamOption(teamId = DEFAULT_TEAM_ID) {
  return TEAM_OPTIONS.find((team) => team.id === teamId) || TEAM_OPTIONS[0];
}
