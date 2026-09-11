export const BLEND_SOURCE_HUES = Object.freeze([0, 120, 240]);
export const BLEND_DEFAULT_INTENSITY = 65;
export const BLEND_MIN_VISIBLE_INTENSITY = 30;

export function normalizeBlendIntensity(value, fallback = BLEND_DEFAULT_INTENSITY) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : fallback;

  return Math.min(100, Math.max(0, safeValue));
}

export function blendSourcesToHex(sources) {
  const channels = BLEND_SOURCE_HUES.map((_, index) =>
    Math.round((normalizeBlendIntensity(sources?.[index]?.v) / 100) * 255),
  );

  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function createBlendTargetIntensities(random = Math.random) {
  const intensities = BLEND_SOURCE_HUES.map(() => {
    const sample = Number(random());
    const normalizedSample = Number.isFinite(sample)
      ? Math.min(1, Math.max(0, sample))
      : 0.5;

    return Math.round(normalizedSample * 100);
  });
  const strongestIntensity = Math.max(...intensities);

  if (strongestIntensity < BLEND_MIN_VISIBLE_INTENSITY) {
    const strongestIndex = intensities.indexOf(strongestIntensity);
    intensities[strongestIndex] = BLEND_MIN_VISIBLE_INTENSITY;
  }

  return intensities;
}
