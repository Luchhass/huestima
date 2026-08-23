import { GAME_MODE_IDS } from "./constants";
import {
  DEFAULT_CARTOON_ID,
  CARTOON_OPTIONS,
  getCartoonOption,
} from "./cartoons";
import { getDifficultyOption, hasDifficultyControl } from "./difficulty";
import { DEFAULT_FLAG_ID, FLAG_OPTIONS, getFlagOption } from "./flags";
import { BRAND_OPTIONS, DEFAULT_BRAND_ID, getBrandOption } from "./brands";

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
          .map((digit) => digit + digit)
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

export function isCartoonColor(color) {
  return color?.type === GAME_MODE_IDS.CARTOON && Boolean(color?.cartoonId);
}

export function isBrandColor(color) {
  return color?.type === "brand" && Boolean(color?.brandId);
}

function difficultyControls(difficulty) {
  const option =
    typeof difficulty === "string"
      ? getDifficultyOption(difficulty)
      : difficulty || getDifficultyOption();

  return Array.isArray(option?.controls) ? option.controls : [];
}

function hasChannelControl(difficulty, channel) {
  return difficultyControls(difficulty).includes(channel);
}

function channelValue({ difficulty, channel, targetValue, guessValue, fallbackValue }) {
  if (!hasChannelControl(difficulty, channel)) {
    return Number.isFinite(targetValue) ? targetValue : fallbackValue;
  }

  if (Number.isFinite(guessValue)) return guessValue;
  if (Number.isFinite(targetValue)) return targetValue;
  return fallbackValue;
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
  if (isBrandColor(color)) return color.backgroundHex || "#7f7f7f";
  if (isCartoonColor(color)) {
    return "#000000";
  }
  if (!isGradientColor(color)) return color?.hex || color;

  return `linear-gradient(90deg, ${color.left.hex}, ${color.right.hex})`;
}

export function colorToneHex(color) {
  if (isFlagColor(color)) return color.hex;
  if (isBrandColor(color)) return color.backgroundHex || "#7f7f7f";
  if (isCartoonColor(color)) return color.toneHex || color.hex || "#000000";
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
  const cleanColor = withHex({
    ...(flag?.paint || {}),
    ...(color || {}),
  });

  if (!flag) {
    return cleanColor;
  }

  return {
    type: GAME_MODE_IDS.FLAG,
    flagId: flag.id,
    flagLabel: flag.label,
    flagLabels: flag.labels,
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
    slots: [
      {
        id: "main",
        h: cleanColor.h,
        s: cleanColor.s,
        v: cleanColor.v,
        hex: cleanColor.hex,
      },
    ],
    h: cleanColor.h,
    s: cleanColor.s,
    v: cleanColor.v,
    hex: cleanColor.hex,
    toneHex: cleanColor.hex,
  };
}

export function withFlagDifficultyHex(guessColor, targetColor, difficulty) {
  if (!targetColor || !isFlagColor(targetColor)) {
    return withFlagHex(guessColor);
  }

  return withFlagHex({
    flagId: targetColor.flagId,
    h: channelValue({
      difficulty,
      channel: "h",
      targetValue: targetColor.h,
      guessValue: guessColor?.h,
      fallbackValue: 210,
    }),
    s: channelValue({
      difficulty,
      channel: "s",
      targetValue: targetColor.s,
      guessValue: guessColor?.s,
      fallbackValue: 50,
    }),
    v: channelValue({
      difficulty,
      channel: "v",
      targetValue: targetColor.v,
      guessValue: guessColor?.v,
      fallbackValue: 78,
    }),
  });
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
    type: GAME_MODE_IDS.CARTOON,
    cartoonId: cartoon.id,
    cartoonLabel: cartoon.label,
    cartoonLabels: cartoon.labels,
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

export function withCartoonDifficultyHex(guessColor, targetColor, difficulty) {
  if (!targetColor || !isCartoonColor(targetColor)) {
    return withCartoonHex(guessColor);
  }

  return withCartoonHex({
    ...guessColor,
    cartoonId: targetColor.cartoonId,
    h: channelValue({
      difficulty,
      channel: "h",
      targetValue: targetColor.h,
      guessValue: guessColor?.h,
      fallbackValue: 210,
    }),
    s: channelValue({
      difficulty,
      channel: "s",
      targetValue: targetColor.s,
      guessValue: guessColor?.s,
      fallbackValue: 50,
    }),
    v: channelValue({
      difficulty,
      channel: "v",
      targetValue: targetColor.v,
      guessValue: guessColor?.v,
      fallbackValue: 78,
    }),
  });
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

export function withBrandDifficultyHex(guessColor, targetColor, difficulty) {
  if (!targetColor || !isBrandColor(targetColor)) return withBrandHex(guessColor);

  return withBrandHex({
    brandId: targetColor.brandId,
    h: channelValue({ difficulty, channel: "h", targetValue: targetColor.h, guessValue: guessColor?.h, fallbackValue: 210 }),
    s: channelValue({ difficulty, channel: "s", targetValue: targetColor.s, guessValue: guessColor?.s, fallbackValue: 50 }),
    v: channelValue({ difficulty, channel: "v", targetValue: targetColor.v, guessValue: guessColor?.v, fallbackValue: 78 }),
  });
}

export function createDefaultBrandGuess(targetOrBrandId = DEFAULT_BRAND_ID, difficulty) {
  const targetColor = targetOrBrandId && typeof targetOrBrandId === "object" ? targetOrBrandId : null;
  const defaultGuess = getDifficultyOption(typeof difficulty === "string" ? difficulty : difficulty?.id)?.defaultGuess;

  return withBrandDifficultyHex({
    brandId: targetColor?.brandId || targetOrBrandId || DEFAULT_BRAND_ID,
    h: defaultGuess?.h ?? 210,
    s: defaultGuess?.s ?? 50,
    v: defaultGuess?.v ?? 78,
  }, targetColor, difficulty);
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

export function createDefaultCartoonGuess(
  targetOrCartoonId = DEFAULT_CARTOON_ID,
  difficulty,
) {
  const targetColor =
    targetOrCartoonId && typeof targetOrCartoonId === "object"
      ? targetOrCartoonId
      : null;
  const cartoonId = targetColor?.cartoonId || targetOrCartoonId || DEFAULT_CARTOON_ID;
  const defaultGuess = getDifficultyOption(
    typeof difficulty === "string" ? difficulty : difficulty?.id,
  )?.defaultGuess;
  const guessColor = {
    cartoonId,
    h: defaultGuess?.h ?? 210,
    s: channelValue({
      difficulty,
      channel: "s",
      targetValue: targetColor?.s,
      guessValue: defaultGuess?.s,
      fallbackValue: 50,
    }),
    v: channelValue({
      difficulty,
      channel: "v",
      targetValue: targetColor?.v,
      guessValue: defaultGuess?.v,
      fallbackValue: 78,
    }),
  };

  if (!DEFAULT_CARTOON_ID) {
    return withHex({
      h: guessColor.h,
      s: guessColor.s,
      v: guessColor.v,
    });
  }

  return withCartoonDifficultyHex(guessColor, targetColor, difficulty);
}

export function createDefaultFlagGuess(
  targetOrFlagId = DEFAULT_FLAG_ID,
  difficultyOrRandom,
  random = Math.random,
) {
  const targetColor =
    targetOrFlagId && typeof targetOrFlagId === "object" ? targetOrFlagId : null;
  const difficulty =
    typeof difficultyOrRandom === "function" ? undefined : difficultyOrRandom;
  const randomFn =
    typeof difficultyOrRandom === "function" ? difficultyOrRandom : random;

  return withFlagDifficultyHex({
    flagId: targetColor?.flagId || targetOrFlagId || DEFAULT_FLAG_ID,
    h: Math.floor(randomFn() * 360),
    s: Math.floor(48 + randomFn() * 42),
    v: Math.floor(50 + randomFn() * 40),
  }, targetColor, difficulty);
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

export function randomCartoonTargetColor(random = Math.random) {
  if (!CARTOON_OPTIONS.length) {
    return withHex({
      h: Math.floor(random() * 360),
      s: Math.floor(54 + random() * 38),
      v: Math.floor(46 + random() * 42),
    });
  }

  const cartoon = CARTOON_OPTIONS[Math.floor(random() * CARTOON_OPTIONS.length)];

  return withCartoonHex({
    cartoonId: cartoon.id,
  });
}

export function randomCartoonTargetColors(count, random = Math.random) {
  if (!CARTOON_OPTIONS.length) {
    return Array.from({ length: count }, () => randomCartoonTargetColor(random));
  }

  const result = [];

  while (result.length < count) {
    const shuffled = [...CARTOON_OPTIONS];

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

export function randomTargetColor(difficultyId, gameModeId = GAME_MODE_IDS.NORMAL) {
  if (gameModeId === GAME_MODE_IDS.GRADIENT) {
    return randomGradientTargetColor();
  }

  if (gameModeId === GAME_MODE_IDS.FLAG) {
    return randomFlagTargetColor();
  }

  if (gameModeId === GAME_MODE_IDS.CARTOON) {
    return randomCartoonTargetColor();
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

export function readableOverlayTone(hex) {
  return relativeLuminance(hex) > 0.58 ? "dark" : "light";
}

export function pickLocalizedLabel(labels, locale, fallback = "") {
  if (!labels || typeof labels !== "object") return fallback;

  if (locale === "tr" && labels.tr) return labels.tr;
  if (labels.en) return labels.en;

  return Object.values(labels).find(Boolean) || fallback;
}

export function getVisualLabel(color, locale = "en") {
  if (isFlagColor(color)) {
    return pickLocalizedLabel(color.flagLabels, locale, color.flagLabel || "");
  }

  if (isCartoonColor(color)) {
    return pickLocalizedLabel(
      color.cartoonLabels,
      locale,
      color.cartoonLabel || "",
    );
  }

  if (isBrandColor(color)) {
    return pickLocalizedLabel(color.brandLabels, locale, color.brandLabel || "");
  }

  return "";
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
