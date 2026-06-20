import { hexToRgb, isFlagColor, isGradientColor } from "./color";
import { MAX_ROUND_SCORE } from "./constants";

export const SCORE_TUNING = {
  distanceForZero: 60,
  curve: 1.35,
  decimals: 2,
};

const REF_X = 0.95047;
const REF_Y = 1;
const REF_Z = 1.08883;
const LAB_DELTA = 6 / 29;

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function labPivot(value) {
  return value > LAB_DELTA ** 3
    ? Math.cbrt(value)
    : value / (3 * LAB_DELTA ** 2) + 4 / 29;
}

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function normalizeHueDegrees(value) {
  return ((value % 360) + 360) % 360;
}

export function hexToLab(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linearRed = srgbToLinear(r);
  const linearGreen = srgbToLinear(g);
  const linearBlue = srgbToLinear(b);

  const x =
    0.4124564 * linearRed +
    0.3575761 * linearGreen +
    0.1804375 * linearBlue;
  const y =
    0.2126729 * linearRed +
    0.7151522 * linearGreen +
    0.072175 * linearBlue;
  const z =
    0.0193339 * linearRed +
    0.119192 * linearGreen +
    0.9503041 * linearBlue;

  const fx = labPivot(x / REF_X);
  const fy = labPivot(y / REF_Y);
  const fz = labPivot(z / REF_Z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function ciede2000Distance(firstHex, secondHex) {
  const first = hexToLab(firstHex);
  const second = hexToLab(secondHex);
  const c1 = Math.sqrt(first.a ** 2 + first.b ** 2);
  const c2 = Math.sqrt(second.a ** 2 + second.b ** 2);
  const cAverage = (c1 + c2) / 2;
  const cAverage7 = cAverage ** 7;
  const g = 0.5 * (1 - Math.sqrt(cAverage7 / (cAverage7 + 25 ** 7)));
  const a1Prime = (1 + g) * first.a;
  const a2Prime = (1 + g) * second.a;
  const c1Prime = Math.sqrt(a1Prime ** 2 + first.b ** 2);
  const c2Prime = Math.sqrt(a2Prime ** 2 + second.b ** 2);
  const h1Prime = c1Prime
    ? normalizeHueDegrees(radiansToDegrees(Math.atan2(first.b, a1Prime)))
    : 0;
  const h2Prime = c2Prime
    ? normalizeHueDegrees(radiansToDegrees(Math.atan2(second.b, a2Prime)))
    : 0;

  const deltaLPrime = second.l - first.l;
  const deltaCPrime = c2Prime - c1Prime;
  let deltaHPrime = h2Prime - h1Prime;

  if (c1Prime * c2Prime === 0) {
    deltaHPrime = 0;
  } else if (deltaHPrime > 180) {
    deltaHPrime -= 360;
  } else if (deltaHPrime < -180) {
    deltaHPrime += 360;
  }

  const deltaCapitalHPrime =
    2 *
    Math.sqrt(c1Prime * c2Prime) *
    Math.sin(degreesToRadians(deltaHPrime / 2));

  const lAveragePrime = (first.l + second.l) / 2;
  const cAveragePrime = (c1Prime + c2Prime) / 2;
  let hAveragePrime = h1Prime + h2Prime;

  if (c1Prime * c2Prime !== 0) {
    const hueDifference = Math.abs(h1Prime - h2Prime);

    if (hueDifference <= 180) {
      hAveragePrime = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      hAveragePrime = (h1Prime + h2Prime + 360) / 2;
    } else {
      hAveragePrime = (h1Prime + h2Prime - 360) / 2;
    }
  }

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(hAveragePrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * hAveragePrime)) +
    0.32 * Math.cos(degreesToRadians(3 * hAveragePrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * hAveragePrime - 63));
  const deltaTheta =
    30 * Math.exp(-1 * ((hAveragePrime - 275) / 25) ** 2);
  const cAveragePrime7 = cAveragePrime ** 7;
  const rC =
    2 * Math.sqrt(cAveragePrime7 / (cAveragePrime7 + 25 ** 7));
  const sL =
    1 +
    (0.015 * (lAveragePrime - 50) ** 2) /
      Math.sqrt(20 + (lAveragePrime - 50) ** 2);
  const sC = 1 + 0.045 * cAveragePrime;
  const sH = 1 + 0.015 * cAveragePrime * t;
  const rT = -Math.sin(degreesToRadians(2 * deltaTheta)) * rC;
  const lightness = deltaLPrime / sL;
  const chroma = deltaCPrime / sC;
  const hue = deltaCapitalHPrime / sH;
  const difference =
    lightness ** 2 + chroma ** 2 + hue ** 2 + rT * chroma * hue;

  return Math.sqrt(Math.max(0, difference));
}

export function calculateColorScore(targetHex, guessHex) {
  const distance = ciede2000Distance(targetHex, guessHex);
  const normalized = Math.min(distance / SCORE_TUNING.distanceForZero, 1);
  const score = MAX_ROUND_SCORE * (1 - normalized) ** SCORE_TUNING.curve;
  const precision = 10 ** SCORE_TUNING.decimals;

  return Math.max(
    0,
    Math.min(MAX_ROUND_SCORE, Math.round(score * precision) / precision),
  );
}

function averageFlagSlotScore(target, guess, scoreFn) {
  const targetSlots = Array.isArray(target?.slots) ? target.slots : [];
  const guessSlots = Array.isArray(guess?.slots) ? guess.slots : [];

  if (!targetSlots.length || !guessSlots.length) {
    return scoreFn(target.hex, guess.hex);
  }

  const scores = targetSlots.map((targetSlot) => {
    const guessSlot =
      guessSlots.find((slotColor) => slotColor.id === targetSlot.id) || guessSlots[0];

    return scoreFn(targetSlot.hex, guessSlot.hex);
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function calculateColorMatchScore(target, guess) {
  if (isGradientColor(target) && isGradientColor(guess)) {
    return (
      calculateColorScore(target.left.hex, guess.left.hex) +
      calculateColorScore(target.right.hex, guess.right.hex)
    ) / 2;
  }

  if (isFlagColor(target) && isFlagColor(guess)) {
    return averageFlagSlotScore(target, guess, calculateColorScore);
  }

  return calculateColorScore(target.hex, guess.hex);
}

export function calculateColorMatchDistance(target, guess) {
  if (isGradientColor(target) && isGradientColor(guess)) {
    return (
      ciede2000Distance(target.left.hex, guess.left.hex) +
      ciede2000Distance(target.right.hex, guess.right.hex)
    ) / 2;
  }

  if (isFlagColor(target) && isFlagColor(guess)) {
    return averageFlagSlotScore(target, guess, ciede2000Distance);
  }

  return ciede2000Distance(target.hex, guess.hex);
}

export function getGradeLabel(score) {
  if (score >= 9.5) return "Perfect";
  if (score >= 8.5) return "Excellent";
  if (score >= 7) return "Very close";
  if (score >= 5) return "Solid";
  if (score >= 2.5) return "Off";
  return "Way off";
}

export function getFinalAssessment(averageScore) {
  if (averageScore >= 9) return "A rare eye for subtle color. That was sharp.";
  if (averageScore >= 7.5)
    return "Excellent memory with only a few shades drifting away.";
  if (averageScore >= 6)
    return "A steady run. Your eye stayed close more often than not.";
  if (averageScore >= 4)
    return "Some colors stuck, some slipped. Worth another pass.";
  return "The spectrum kept moving. Try again and chase the closer match.";
}

export function formatScore(score, decimals = SCORE_TUNING.decimals) {
  return Number(score).toFixed(decimals);
}
