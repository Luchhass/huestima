import { MAX_ROUND_SCORE } from "@/lib/constants";
import { normalizeRoundCount } from "@/lib/roundCount";

export const PERFECT_HINT_SCORE = MAX_ROUND_SCORE;

export function getInitialHintCount(roundCountValue) {
  const roundCount = normalizeRoundCount(roundCountValue);

  if (roundCount >= 10) return 3;
  if (roundCount >= 5) return 2;
  if (roundCount >= 3) return 1;

  return 0;
}

export function normalizeHintsEnabled(value, fallback = true) {
  if (value === false || value === "off" || value === "false" || value === "0") {
    return false;
  }

  if (value === true || value === "on" || value === "true" || value === "1") {
    return true;
  }

  return fallback;
}

export function serializeHintsEnabled(enabled) {
  return enabled ? "on" : "off";
}

export function earnsHint(score) {
  return Number(score) >= PERFECT_HINT_SCORE;
}
