import { normalizeRoundCount } from "@/lib/roundCount";

export function getInitialHintCount(roundCountValue) {
  const roundCount = normalizeRoundCount(roundCountValue);

  if (roundCount >= 20) return 4;
  if (roundCount >= 10) return 3;
  if (roundCount >= 5) return 2;
  if (roundCount >= 3) return 1;

  return 0;
}

export function normalizeHintsEnabled(value, fallback = true) {
  if (value === false || value === "off" || value === "false") return false;
  if (value === true || value === "on" || value === "true") return true;
  return fallback;
}

export function serializeHintsEnabled(value) {
  return normalizeHintsEnabled(value) ? "on" : "off";
}
