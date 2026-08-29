import { DIFFICULTY_CONFIG, GAME_MODES } from "../constants.js";
import { DEFAULT_CARTOON_ID, CARTOON_OPTIONS, getCartoonOption } from "./cartoons.js";
import { DEFAULT_FLAG_ID, FLAG_OPTIONS, getFlagOption } from "./flags.js";
import { BRAND_OPTIONS, DEFAULT_BRAND_ID, getBrandOption } from "./brands.js";
import { DEFAULT_TEAM_ID, getTeamOption, TEAM_OPTIONS } from "./teams.js";

const GRADIENT_FIXED_COLOR = {
  s: 82,
  v: 78,
};

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function clampHsv({ h, s, v }) {
  const normalizedHue = Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;

  return {
    h: normalizedHue,
    s: clamp(Number.isFinite(s) ? s : 0, 0, 100),
    v: clamp(Number.isFinite(v) ? v : 0, 0, 100),
  };
}

export function hsvToRgb(input) {
  const { h, s, v } = clampHsv(input);
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hsvToHex(hsv) {
  return rgbToHex(hsvToRgb(hsv));
}

export function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : normalized;
  const number = Number.parseInt(value, 16);

  if (!Number.isFinite(number)) return { r: 0, g: 0, b: 0 };

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

export function withHex(hsv) {
  const cleanHsv = clampHsv(hsv);
  return {
    ...hsv,
    ...cleanHsv,
    hex: hsvToHex(cleanHsv),
  };
}

export function isGradientColor(color) {
  return Boolean(color?.left && color?.right);
}

export function isFlagColor(color) {
  return color?.type === GAME_MODES.FLAG && Boolean(color?.flagId);
}

export function isCartoonColor(color) {
  return color?.type === GAME_MODES.CARTOON && Boolean(color?.cartoonId);
}

export function isBrandColor(color) {
  return color?.type === "brand" && Boolean(color?.brandId);
}

function averageRgbHex(firstHex, secondHex) {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);

  return rgbToHex({
    r: (first.r + second.r) / 2,
    g: (first.g + second.g) / 2,
    b: (first.b + second.b) / 2,
  });
}

export function withGradientHex(color) {
  const left = withHex({
    ...GRADIENT_FIXED_COLOR,
    ...(color?.left || {}),
  });
  const right = withHex({
    ...GRADIENT_FIXED_COLOR,
    ...(color?.right || {}),
  });

  return {
    type: GAME_MODES.GRADIENT,
    left,
    right,
    hex: left.hex,
    gradient: `linear-gradient(90deg, ${left.hex}, ${right.hex})`,
    toneHex: averageRgbHex(left.hex, right.hex),
  };
}

export function withFlagHex(color) {
  const flag = getFlagOption(color?.flagId || DEFAULT_FLAG_ID);
  const cleanColor = withHex({ ...(flag?.paint || {}), ...(color || {}) });

  return {
    type: GAME_MODES.FLAG,
    flagId: flag.id,
    flagLabel: flag.label,
    paintLabel: flag.paintLabel,
    originalScenePath: flag.originalScenePath,
    baseScenePath: flag.baseScenePath,
    scenePath: flag.scenePath,
    imagePath: flag.imagePath,
    maskPath: flag.maskPath,
    assetPath: flag.assetPath || flag.imagePath,
    paintBase: flag.paint,
    layers: flag.layers,
    activeSlotId: "main",
    slots: [{ id: "main", ...cleanColor }],
    h: cleanColor.h,
    s: cleanColor.s,
    v: cleanColor.v,
    hex: cleanColor.hex,
    toneHex: cleanColor.hex,
  };
}

function mergeCartoonPaint(cartoon, color) {
  const paint = { ...cartoon.paint };

  if (Number.isFinite(color?.h)) paint.h = color.h;
  if (Number.isFinite(color?.s)) paint.s = color.s;
  if (Number.isFinite(color?.v)) paint.v = color.v;

  return paint;
}

export function withCartoonHex(color) {
  const cartoon = getCartoonOption(color?.cartoonId || DEFAULT_CARTOON_ID);

  if (!cartoon) {
    return withHex({
      h: color?.h ?? 210,
      s: color?.s ?? 22,
      v: color?.v ?? 76,
    });
  }

  const cleanColor = withHex(mergeCartoonPaint(cartoon, color));

  return {
    type: GAME_MODES.CARTOON,
    cartoonId: cartoon.id,
    cartoonLabel: cartoon.label,
    cartoonSeries: cartoon.series,
    paintLabel: cartoon.paintLabel,
    originalScenePath: cartoon.originalScenePath,
    baseScenePath: cartoon.baseScenePath,
    scenePath: cartoon.scenePath,
    imagePath: cartoon.imagePath,
    maskPath: cartoon.maskPath,
    assetPath: cartoon.assetPath || cartoon.imagePath,
    paintBase: cartoon.paint,
    layers: cartoon.layers,
    h: cleanColor.h,
    s: cleanColor.s,
    v: cleanColor.v,
    hex: cleanColor.hex,
    toneHex: cleanColor.hex,
  };
}

export function withBrandHex(color) {
  const brand = getBrandOption(color?.brandId || DEFAULT_BRAND_ID);
  const cleanColor = withHex({ ...brand.paint, ...(color || {}) });

  return {
    type: "brand",
    brandId: brand.id,
    brandLabel: brand.label,
    brandLabels: brand.labels,
    backgroundHex: brand.backgroundHex,
    baseScenePath: brand.baseScenePath,
    originalScenePath: brand.originalScenePath,
    logoPath: brand.logoPath,
    logoLayerPath: brand.logoLayerPath,
    imagePath: brand.imagePath,
    assetPath: brand.assetPath,
    maskPath: brand.maskPath,
    paintBase: brand.paint,
    layers: brand.layers,
    h: cleanColor.h,
    s: cleanColor.s,
    v: cleanColor.v,
    hex: cleanColor.hex,
    toneHex: brand.backgroundHex,
  };
}

export function randomBrandTargetColors(count, random = Math.random) {
  const result = [];

  while (result.length < count) {
    const shuffled = [...BRAND_OPTIONS].sort(() => random() - 0.5);
    for (const brand of shuffled) {
      if (result.length >= count) break;
      result.push(withBrandHex({ brandId: brand.id }));
    }
  }

  return result;
}

export function withTeamHex(color) {
  const team = getTeamOption(color?.teamId || DEFAULT_TEAM_ID);
  const cleanColor = withHex({ ...team.paint, ...(color || {}) });
  return {
    type: "brand",
    teamId: team.id,
    brandId: team.id,
    brandLabel: team.label,
    brandLabels: team.labels,
    backgroundHex: team.backgroundHex,
    baseScenePath: team.baseScenePath,
    originalScenePath: team.originalScenePath,
    logoPath: team.logoPath,
    logoLayerPath: team.logoLayerPath,
    imagePath: team.imagePath,
    assetPath: team.assetPath,
    maskPath: team.maskPath,
    paintBase: team.paint,
    layers: team.layers,
    h: cleanColor.h,
    s: cleanColor.s,
    v: cleanColor.v,
    hex: cleanColor.hex,
    toneHex: team.backgroundHex,
  };
}

export function randomTeamTargetColors(count, random = Math.random, teamIds = null) {
  const result = [];
  const pool = Array.isArray(teamIds) && teamIds.length
    ? TEAM_OPTIONS.filter((team) => teamIds.includes(team.id))
    : TEAM_OPTIONS;
  while (result.length < count) {
    for (const team of [...(pool.length ? pool : TEAM_OPTIONS)].sort(() => random() - 0.5)) {
      if (result.length >= count) break;
      result.push(withTeamHex({ teamId: team.id }));
    }
  }
  return result;
}

export function randomFlagTargetColor(random = Math.random, flagDifficulty) {
  const difficulties = Array.isArray(flagDifficulty)
    ? flagDifficulty
    : flagDifficulty
      ? [flagDifficulty]
      : [];
  const pool = difficulties.length
    ? FLAG_OPTIONS.filter((flag) => difficulties.includes(flag.difficulty))
    : FLAG_OPTIONS;
  const flags = pool.length ? pool : FLAG_OPTIONS;
  const flag = flags[Math.floor(random() * flags.length)];

  return withFlagHex({
    flagId: flag.id,
  });
}

export function randomFlagTargetColors(count, random = Math.random, flagDifficulty) {
  const result = [];
  const difficulties = Array.isArray(flagDifficulty) ? flagDifficulty : flagDifficulty ? [flagDifficulty] : [];
  const pool = difficulties.length ? FLAG_OPTIONS.filter((flag) => difficulties.includes(flag.difficulty)) : FLAG_OPTIONS;
  const flags = pool.length ? pool : FLAG_OPTIONS;

  while (result.length < count) {
    const shuffled = [...flags];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    for (const flag of shuffled) {
      if (result.length >= count) break;

      result.push(withFlagHex({
        flagId: flag.id,
      }));
    }
  }

  return result;
}

export function randomCartoonTargetColors(count, random = Math.random, cartoonIds = null) {
  if (!CARTOON_OPTIONS.length) {
    return Array.from({ length: count }, () =>
      withHex({
        h: Math.floor(random() * 360),
        s: Math.floor(54 + random() * 38),
        v: Math.floor(46 + random() * 42),
      }),
    );
  }

  const result = [];

  while (result.length < count) {
    const pool = Array.isArray(cartoonIds) && cartoonIds.length
      ? CARTOON_OPTIONS.filter((item) => cartoonIds.includes(item.id))
      : CARTOON_OPTIONS;
    const shuffled = [...(pool.length ? pool : CARTOON_OPTIONS)];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    for (const cartoon of shuffled) {
      if (result.length >= count) break;

      result.push(withCartoonHex({
        cartoonId: cartoon.id,
      }));
    }
  }

  return result;
}

export function applyDifficultyConstraints(hsv, difficultyId) {
  if (isGradientColor(hsv)) {
    return withGradientHex(hsv);
  }

  if (isFlagColor(hsv)) {
    return withFlagHex(hsv);
  }

  if (isCartoonColor(hsv)) {
    return withCartoonHex(hsv);
  }

  if (isBrandColor(hsv)) {
    return withBrandHex(hsv);
  }

  const difficulty = DIFFICULTY_CONFIG[difficultyId] || DIFFICULTY_CONFIG.normal;
  return {
    ...hsv,
    ...difficulty.fixed,
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed) {
  return mulberry32(hashSeed(seed));
}

export function generateTargetColors({ seed, difficulty, roundCount, gameMode, gameFamily, flagDifficulty, flagDifficulties, cartoonIds, teamIds }) {
  const random = createSeededRandom(seed);
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;

  if (gameMode === GAME_MODES.GRADIENT) {
    return Array.from({ length: roundCount }, () =>
      withGradientHex({
        left: { h: Math.floor(random() * 360) },
        right: { h: Math.floor(random() * 360) },
      }),
    );
  }

  if (gameFamily === "flag" || gameMode === GAME_MODES.FLAG) {
    return randomFlagTargetColors(roundCount, random, flagDifficulties || flagDifficulty);
  }

  if (gameFamily === "cartoon") {
    return randomCartoonTargetColors(roundCount, random, cartoonIds);
  }

  if (gameFamily === "team") {
    return randomTeamTargetColors(roundCount, random, teamIds);
  }

  if (gameFamily === "brand") {
    return randomBrandTargetColors(roundCount, random);
  }

  return Array.from({ length: roundCount }, () =>
    withHex({
      h: Math.floor(random() * 360),
      s: difficultyConfig.controls.includes("s")
        ? Math.floor(54 + random() * 38)
        : difficultyConfig.fixed.s,
      v: difficultyConfig.controls.includes("v")
        ? Math.floor(46 + random() * 42)
        : difficultyConfig.fixed.v,
    }),
  );
}
