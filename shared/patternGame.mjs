export const PATTERN_GRID_ROWS = 4;
export const PATTERN_GRID_COLUMNS = 5;
export const PATTERN_DURATION_MS = 10000;
export const PATTERN_DIFFICULTY_DURATIONS_MS = Object.freeze({
  easy: 10000,
  normal: 15000,
  hard: 20000,
});

export function getPatternDurationMs(difficulty = "easy") {
  return PATTERN_DIFFICULTY_DURATIONS_MS[difficulty] || PATTERN_DURATION_MS;
}

export const PATTERN_DIFFICULTY_GRIDS = Object.freeze({
  easy: Object.freeze({ rows: 4, columns: 5 }),
  normal: Object.freeze({ rows: 5, columns: 7 }),
  hard: Object.freeze({ rows: 7, columns: 9 }),
});

export const PATTERN_DIFFICULTY_MISPLACED_COUNTS = Object.freeze({
  easy: 4,
  normal: 6,
  hard: 8,
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomIndex(random, length) {
  return Math.min(Math.floor(random() * length), length - 1);
}

export function createPatternRandom(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createPatternColors(
  rows = PATTERN_GRID_ROWS,
  columns = PATTERN_GRID_COLUMNS,
  variant = 0,
) {
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const hue = (332 - column * 17 - row * 7 + variant * 29 + 360) % 360;
    const saturation = clamp(78 - row * 2 + column, 56, 84);
    const lightness = clamp(80 - row * 4 - column * 2, 36, 82);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  });
}

function chooseMisplacedPositions(random, tileCount, count, columns) {
  const positions = [];
  const candidates = Array.from({ length: tileCount }, (_, index) => index);

  while (positions.length < count && candidates.length) {
    const candidateIndex = randomIndex(random, candidates.length);
    const candidate = candidates.splice(candidateIndex, 1)[0];
    const row = Math.floor(candidate / columns);
    const column = candidate % columns;
    const farEnough = positions.every((position) => {
      const otherRow = Math.floor(position / columns);
      const otherColumn = position % columns;
      return Math.abs(row - otherRow) + Math.abs(column - otherColumn) >= 3;
    });
    if (farEnough || candidates.length < count - positions.length) positions.push(candidate);
  }

  return positions;
}

export function createPatternPuzzle(random = Math.random, options = {}) {
  const difficultyGrid = PATTERN_DIFFICULTY_GRIDS[options.difficulty] || null;
  const rows = options.rows || options.size || difficultyGrid?.rows || PATTERN_GRID_ROWS;
  const columns = options.columns || options.size || difficultyGrid?.columns || PATTERN_GRID_COLUMNS;
  const misplacedCount =
    options.misplacedCount ??
    PATTERN_DIFFICULTY_MISPLACED_COUNTS[options.difficulty] ??
    PATTERN_DIFFICULTY_MISPLACED_COUNTS.easy;
  const tileCount = rows * columns;
  const colors = createPatternColors(
    rows,
    columns,
    options.variant || randomIndex(random, 12),
  );
  const board = Array.from({ length: tileCount }, (_, index) => index);
  const misplacedPositions = chooseMisplacedPositions(
    random,
    tileCount,
    misplacedCount,
    columns,
  );
  const displacedTiles = misplacedPositions.map((position) => board[position]);

  misplacedPositions.forEach((position, index) => {
    board[position] = displacedTiles[(index + 1) % displacedTiles.length];
  });

  return { rows, columns, colors, board, misplacedPositions };
}

export function swapPatternTiles(board, first, second) {
  if (first === second || board[first] === undefined || board[second] === undefined) return board;
  const next = [...board];
  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

export function countMisplacedPatternTiles(board) {
  return board.reduce((count, tile, index) => count + (tile === index ? 0 : 1), 0);
}

export function isPatternSolved(board) {
  return countMisplacedPatternTiles(board) === 0;
}

export function scorePatternRound({ initialMisplaced = 0, remainingMisplaced = 0 }) {
  if (initialMisplaced <= 0) return 0;
  const repairedRatio = clamp(
    (initialMisplaced - Math.max(0, remainingMisplaced)) / initialMisplaced,
    0,
    1,
  );
  return Math.round(repairedRatio * 10 * 100) / 100;
}
