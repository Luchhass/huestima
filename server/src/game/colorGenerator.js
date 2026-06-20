import { DIFFICULTY_CONFIG, GAME_MODES } from "../constants.js";
import { DEFAULT_FLAG_ID, FLAG_OPTIONS, getFlagOption } from "./flags.js";

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
          .map((character) => character + character)
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

function averageRgbHex(firstHex, secondHex) {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);

  return rgbToHex({
    r: (first.r + second.r) / 2,
    g: (first.g + second.g) / 2,
    b: (first.b + second.b) / 2,
  });
}

function averageManyRgbHex(hexValues) {
  const colors = hexValues.filter(Boolean).map(hexToRgb);

  if (!colors.length) return "#000000";

  return rgbToHex({
    r: colors.reduce((sum, color) => sum + color.r, 0) / colors.length,
    g: colors.reduce((sum, color) => sum + color.g, 0) / colors.length,
    b: colors.reduce((sum, color) => sum + color.b, 0) / colors.length,
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
  const slotDefinitions = flag.slots?.length
    ? flag.slots
    : [{ id: "base", ...flag.background }];
  const incomingSlots = Array.isArray(color?.slots) ? color.slots : [];
  const requestedSlotId =
    color?.activeSlotId ||
    incomingSlots.find((slotColor) => slotDefinitions.some((slot) => slot.id === slotColor.id))?.id ||
    slotDefinitions[0].id;

  const cleanSlots = slotDefinitions.map((slotDefinition, index) => {
    const incomingSlot = incomingSlots.find((slotColor) => slotColor.id === slotDefinition.id);
    const shouldApplyDirectColor =
      slotDefinition.id === requestedSlotId &&
      [color?.h, color?.s, color?.v].some(Number.isFinite);

    return withHex({
      ...slotDefinition,
      ...(incomingSlot || {}),
      ...(shouldApplyDirectColor || (!incomingSlots.length && index === 0) ? color || {} : {}),
      id: slotDefinition.id,
    });
  });

  const activeSlot =
    cleanSlots.find((slotColor) => slotColor.id === requestedSlotId) || cleanSlots[0];
  const toneHex = averageManyRgbHex(cleanSlots.map((slotColor) => slotColor.hex));

  return {
    type: GAME_MODES.FLAG,
    flagId: flag.id,
    flagLabel: flag.label,
    motif: flag.motif,
    motifColor: flag.motifColor || "#ffffff",
    activeSlotId: activeSlot.id,
    slots: cleanSlots,
    h: activeSlot.h,
    s: activeSlot.s,
    v: activeSlot.v,
    hex: activeSlot.hex,
    toneHex,
  };
}

export function randomFlagTargetColor(random = Math.random) {
  const flag = FLAG_OPTIONS[Math.floor(random() * FLAG_OPTIONS.length)];

  return withFlagHex({
    flagId: flag.id,
  });
}

export function randomFlagTargetColors(count, random = Math.random) {
  const result = [];

  while (result.length < count) {
    const shuffled = [...FLAG_OPTIONS];

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

export function applyDifficultyConstraints(hsv, difficultyId) {
  if (isGradientColor(hsv)) {
    return withGradientHex(hsv);
  }

  if (isFlagColor(hsv)) {
    return withFlagHex(hsv);
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

export function generateTargetColors({ seed, difficulty, roundCount, gameMode }) {
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

  if (gameMode === GAME_MODES.FLAG) {
    return randomFlagTargetColors(roundCount, random);
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
