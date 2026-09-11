export const ELIMINATION_THRESHOLDS = Object.freeze([
  2,
  3,
  4.2,
  5.4,
  6.4,
  7.2,
  7.9,
  8.5,
  9,
  9.4,
  9.7,
  9.9,
  9.97,
]);

export function getEliminationThreshold(roundIndex = 0) {
  const normalizedRoundIndex = Math.max(0, Math.floor(Number(roundIndex) || 0));

  if (normalizedRoundIndex < ELIMINATION_THRESHOLDS.length) {
    return ELIMINATION_THRESHOLDS[normalizedRoundIndex];
  }

  const roundsAfterCurve = normalizedRoundIndex - ELIMINATION_THRESHOLDS.length + 1;
  const remainingDistance = 0.03 * (0.5 ** roundsAfterCurve);
  return Math.round((10 - remainingDistance) * 10000) / 10000;
}

export function passesEliminationThreshold(score, roundIndex = 0) {
  return Number(score) >= getEliminationThreshold(roundIndex);
}
