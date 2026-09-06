import { normalizeRoundCount } from "@/lib/roundCount";

export function getInitialHintCount(roundCountValue) {
  const roundCount = normalizeRoundCount(roundCountValue);

  if (roundCount >= 20) return 4;
  if (roundCount >= 10) return 3;
  if (roundCount >= 5) return 2;
  if (roundCount >= 3) return 1;

  return 0;
}

export function normalizeHintsEnabled() {
  return true;
}

export function serializeHintsEnabled() {
  return "on";
}
