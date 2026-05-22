import { hexToRgb } from "./color";
import { MAX_ROUND_SCORE } from "./constants";

export const SCORE_TUNING = {
  distanceForZero: 0.48,
  curve: 1.42,
  decimals: 2,
};

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function hexToOklab(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linearRed = srgbToLinear(r);
  const linearGreen = srgbToLinear(g);
  const linearBlue = srgbToLinear(b);

  const l =
    0.4122214708 * linearRed +
    0.5363325363 * linearGreen +
    0.0514459929 * linearBlue;
  const m =
    0.2119034982 * linearRed +
    0.6806995451 * linearGreen +
    0.1073969566 * linearBlue;
  const s =
    0.0883024619 * linearRed +
    0.2817188376 * linearGreen +
    0.6299787005 * linearBlue;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function oklabDistance(firstHex, secondHex) {
  const first = hexToOklab(firstHex);
  const second = hexToOklab(secondHex);

  return Math.sqrt(
    (first.l - second.l) ** 2 +
      (first.a - second.a) ** 2 +
      (first.b - second.b) ** 2,
  );
}

export function calculateColorScore(targetHex, guessHex) {
  const distance = oklabDistance(targetHex, guessHex);
  const normalized = Math.min(distance / SCORE_TUNING.distanceForZero, 1);
  const score = MAX_ROUND_SCORE * (1 - normalized) ** SCORE_TUNING.curve;
  const precision = 10 ** SCORE_TUNING.decimals;

  return Math.max(
    0,
    Math.min(MAX_ROUND_SCORE, Math.round(score * precision) / precision),
  );
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
