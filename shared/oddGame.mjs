const TILE_COUNT = 6;

const STARTING_DIFFERENCE = Object.freeze({
  easy: 18,
  normal: 15,
  hard: 12,
});

const DIFFERENCE_DECAY = Object.freeze({
  easy: 0.91,
  normal: 0.9,
  hard: 0.89,
});

const MINIMUM_DIFFERENCE = 0.65;
const WARMUP_FACTORS = Object.freeze([1, 0.94, 0.88, 0.82]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hslToHex(h, s, l) {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const sector = Math.floor(h / 60) % 6;
  const channels = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][sector];

  return `#${channels
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getOddDifference(level = 0, difficulty = "normal") {
  const start = STARTING_DIFFERENCE[difficulty] || STARTING_DIFFERENCE.normal;
  const decay = DIFFERENCE_DECAY[difficulty] || DIFFERENCE_DECAY.normal;
  const safeLevel = Math.max(0, level);

  if (safeLevel < WARMUP_FACTORS.length) {
    return start * WARMUP_FACTORS[safeLevel];
  }

  const warmupEnd = start * WARMUP_FACTORS[WARMUP_FACTORS.length - 1];
  return MINIMUM_DIFFERENCE +
    (warmupEnd - MINIMUM_DIFFERENCE) *
      Math.pow(decay, safeLevel - (WARMUP_FACTORS.length - 1));
}

export function createOddPuzzle(random = Math.random, { difficulty = "normal", level = 0 } = {}) {
  const hue = random() * 360;
  const saturation = 58 + random() * 28;
  const lightness = 39 + random() * 22;
  const difference = getOddDifference(level, difficulty);
  const direction = lightness + difference <= 72 ? 1 : -1;
  const oddLightness = clamp(lightness + difference * direction, 24, 78);
  const oddIndex = Math.floor(random() * TILE_COUNT);
  const baseColor = hslToHex(hue, saturation, lightness);
  const oddColor = hslToHex(hue, saturation, oddLightness);
  const colors = Array.from({ length: TILE_COUNT }, (_, index) =>
    index === oddIndex ? oddColor : baseColor,
  );

  return {
    type: "odd",
    hex: baseColor,
    toneHex: baseColor,
    level,
    colors,
    oddIndex,
    baseColor,
    oddColor,
    difference,
  };
}

export function isOddSelectionCorrect(puzzle, selection) {
  return Number.isInteger(selection) && selection === puzzle?.oddIndex;
}
