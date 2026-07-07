import { GAME_MODE_IDS } from "./constants";

export const GAME_FAMILY_IDS = {
  COLOR: "color",
  FLAG: "flag",
  CARTOON: "cartoon",
};

export const GAME_FAMILY_OPTIONS = [
  {
    id: GAME_FAMILY_IDS.COLOR,
    label: "Color",
    href: "/color",
  },
  {
    id: GAME_FAMILY_IDS.FLAG,
    label: "Flag",
    href: "/flag",
  },
  {
    id: GAME_FAMILY_IDS.CARTOON,
    label: "Cartoon",
    href: "/cartoon",
  },
];

export const GAME_FAMILY_MODE_IDS = {
  [GAME_FAMILY_IDS.COLOR]: [
    GAME_MODE_IDS.NORMAL,
    GAME_MODE_IDS.ENDLESS,
    GAME_MODE_IDS.FLASH,
    GAME_MODE_IDS.SEQUENCE,
    GAME_MODE_IDS.TIMED,
    GAME_MODE_IDS.GRADIENT,
    GAME_MODE_IDS.DUEL,
  ],
  [GAME_FAMILY_IDS.FLAG]: [GAME_MODE_IDS.FLAG],
  [GAME_FAMILY_IDS.CARTOON]: [GAME_MODE_IDS.CARTOON],
};

export const DEFAULT_GAME_MODE_BY_FAMILY = {
  [GAME_FAMILY_IDS.COLOR]: GAME_MODE_IDS.NORMAL,
  [GAME_FAMILY_IDS.FLAG]: GAME_MODE_IDS.FLAG,
  [GAME_FAMILY_IDS.CARTOON]: GAME_MODE_IDS.CARTOON,
};

export function normalizeGameFamily(gameFamily) {
  return GAME_FAMILY_MODE_IDS[gameFamily] ? gameFamily : GAME_FAMILY_IDS.COLOR;
}

export function getDefaultGameModeForFamily(gameFamily) {
  return DEFAULT_GAME_MODE_BY_FAMILY[normalizeGameFamily(gameFamily)];
}

export function getGameFamilyByMode(gameModeId) {
  return (
    Object.entries(GAME_FAMILY_MODE_IDS).find(([, modeIds]) =>
      modeIds.includes(gameModeId),
    )?.[0] || GAME_FAMILY_IDS.COLOR
  );
}

export function isGameModeInFamily(gameModeId, gameFamily) {
  return GAME_FAMILY_MODE_IDS[normalizeGameFamily(gameFamily)].includes(gameModeId);
}

export function getGameFamilyHref(gameFamily, suffix = "") {
  const cleanFamily = normalizeGameFamily(gameFamily);
  const cleanSuffix = suffix ? `/${suffix.replace(/^\/+/, "")}` : "";

  return `/${cleanFamily}${cleanSuffix}`;
}
