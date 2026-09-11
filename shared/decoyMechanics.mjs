export const DECOY_POSITIONS = Object.freeze(["top", "bottom"]);
export const DECOY_MIN_HUE_DISTANCE = 60;

function normalizedRandomSample(random) {
  const sample = Number(random());
  return Number.isFinite(sample) ? Math.min(1, Math.max(0, sample)) : 0.5;
}

export function createDecoyHue(targetHue, random = Math.random) {
  const normalizedTargetHue = ((Number(targetHue) || 0) % 360 + 360) % 360;
  const offsetRange = 360 - DECOY_MIN_HUE_DISTANCE * 2;
  const offset = DECOY_MIN_HUE_DISTANCE + Math.floor(normalizedRandomSample(random) * offsetRange);

  return (normalizedTargetHue + offset) % 360;
}

export function createDecoyTargetPosition(random = Math.random) {
  return normalizedRandomSample(random) < 0.5
    ? DECOY_POSITIONS[0]
    : DECOY_POSITIONS[1];
}
