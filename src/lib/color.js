import { GAME_MODE_IDS } from "./constants";
import { getDifficultyOption, hasDifficultyControl } from "./difficulty";
import { DEFAULT_FLAG_ID, FLAG_OPTIONS, getFlagOption } from "./flags";

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
  const normalized = hex.replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  const number = Number.parseInt(value, 16);

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
  return color?.type === GAME_MODE_IDS.FLAG && Boolean(color?.flagId);
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

export function gradientBackground(color) {
  if (isFlagColor(color)) return color.hex;
  if (!isGradientColor(color)) return color?.hex || color;

  return `linear-gradient(90deg, ${color.left.hex}, ${color.right.hex})`;
}

export function colorToneHex(color) {
  if (isFlagColor(color)) return color.hex;
  if (!isGradientColor(color)) return color?.hex || color || "#000000";

  return color.toneHex || averageRgbHex(color.left.hex, color.right.hex);
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
    type: GAME_MODE_IDS.GRADIENT,
    left,
    right,
    hex: left.hex,
    gradient: `linear-gradient(90deg, ${left.hex}, ${right.hex})`,
    toneHex: averageRgbHex(left.hex, right.hex),
  };
}

export function createDefaultGradientGuess() {
  return withGradientHex({
    left: { h: 210 },
    right: { h: 30 },
  });
}

export function randomGradientTargetColor(random = Math.random) {
  return withGradientHex({
    left: { h: Math.floor(random() * 360) },
    right: { h: Math.floor(random() * 360) },
  });
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
    type: GAME_MODE_IDS.FLAG,
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

const FLAG_GUESS_START_HUES = [210, 22, 132, 286, 48, 342, 172];

function createRandomFlagGuessSlot(slotColor, index, random) {
  const hueBase = FLAG_GUESS_START_HUES[index % FLAG_GUESS_START_HUES.length];

  return {
    id: slotColor.id,
    h: (hueBase + Math.floor(random() * 44) - 22 + 360) % 360,
    s: Math.floor(48 + random() * 42),
    v: Math.floor(50 + random() * 40),
  };
}

export function createDefaultFlagGuess(flagId = DEFAULT_FLAG_ID, random = Math.random) {
  const flag = getFlagOption(flagId);

  return withFlagHex({
    flagId,
    slots: (flag.slots || [{ id: "base" }]).map((slotColor, index) =>
      createRandomFlagGuessSlot(slotColor, index, random),
    ),
  });
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

export function randomTargetColor(difficultyId, gameModeId = GAME_MODE_IDS.NORMAL) {
  if (gameModeId === GAME_MODE_IDS.GRADIENT) {
    return randomGradientTargetColor();
  }

  if (gameModeId === GAME_MODE_IDS.FLAG) {
    return randomFlagTargetColor();
  }

  const difficulty = getDifficultyOption(difficultyId);

  return withHex({
    h: Math.floor(Math.random() * 360),
    s: hasDifficultyControl(difficulty, "s")
      ? Math.floor(54 + Math.random() * 38)
      : difficulty.fixed.s,
    v: hasDifficultyControl(difficulty, "v")
      ? Math.floor(46 + Math.random() * 42)
      : difficulty.fixed.v,
  });
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function readableTone(hex) {
  return relativeLuminance(hex) > 0.42 ? "dark" : "light";
}

export function hueGradient() {
  return "linear-gradient(to top, #f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%)";
}

export function saturationGradient(hue, value = 100) {
  const left = hsvToHex({ h: hue, s: 0, v: value });
  const right = hsvToHex({ h: hue, s: 100, v: value });
  return `linear-gradient(to top, ${left}, ${right})`;
}

export function valueGradient(hue, saturation) {
  const top = hsvToHex({ h: hue, s: saturation, v: 100 });
  return `linear-gradient(to top, #050505, ${top})`;
}
