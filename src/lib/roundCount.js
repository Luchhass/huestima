import { DEFAULT_ROUND_COUNT, ROUND_COUNT_OPTIONS } from "@/lib/constants";

export function normalizeRoundCount(value) {
  const roundCount = Number(value);

  return ROUND_COUNT_OPTIONS.includes(roundCount)
    ? roundCount
    : DEFAULT_ROUND_COUNT;
}
