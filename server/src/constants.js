export const ROOM_STATUSES = {
  LOBBY: "lobby",
  STARTING: "starting",
  IN_GAME: "in_game",
  COMPLETED: "completed",
  CLOSED: "closed",
};

export const GAME_MODES = {
  NORMAL: "normal",
  FLASH: "flash",
  SEQUENCE: "sequence",
  TIMED: "timed",
  GRADIENT: "gradient",
  FLAG: "flag",
  DUEL: "duel",
};

export const DIFFICULTIES = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
};

export const ROUND_COUNT_OPTIONS = [1, 3, 5, 10];
export const DEFAULT_ROUND_COUNT = 5;
export const ROUND_COUNT = DEFAULT_ROUND_COUNT;
export const DUEL_MAX_ROUNDS = 64;
export const PLAYER_NAME_MIN_LENGTH = 2;
export const PLAYER_NAME_MAX_LENGTH = 18;
export const ROOM_NAME_MIN_LENGTH = 2;
export const ROOM_NAME_MAX_LENGTH = 28;
export const ROOM_PASSWORD_MIN_LENGTH = 3;
export const ROOM_PASSWORD_MAX_LENGTH = 32;
export const MAX_ROUND_SCORE = 10;

export const ROOM_VISIBILITIES = {
  PUBLIC: "public",
  PRIVATE: "private",
};

export const GAME_MODE_CONFIG = {
  [GAME_MODES.NORMAL]: {
    revealDurationMs: 5000,
  },
  [GAME_MODES.FLASH]: {
    revealDurationMs: 1000,
  },
  [GAME_MODES.SEQUENCE]: {
    revealDurationMs: 3000,
  },
  [GAME_MODES.TIMED]: {
    revealDurationMs: 3000,
    guessDurationMs: 3000,
    lockedDifficulty: DIFFICULTIES.EASY,
  },
  [GAME_MODES.GRADIENT]: {
    revealDurationMs: 5000,
    lockedDifficulty: DIFFICULTIES.EASY,
  },
  [GAME_MODES.FLAG]: {
    revealDurationMs: 5000,
    lockedDifficulty: DIFFICULTIES.HARD,
  },
  [GAME_MODES.DUEL]: {
    revealDurationMs: 5000,
    roundCount: DUEL_MAX_ROUNDS,
    elimination: true,
  },
};

export const DIFFICULTY_CONFIG = {
  [DIFFICULTIES.EASY]: {
    controls: ["h"],
    defaultGuess: { h: 210, s: 82, v: 78 },
    fixed: { s: 82, v: 78 },
  },
  [DIFFICULTIES.NORMAL]: {
    controls: ["h", "s"],
    defaultGuess: { h: 210, s: 50, v: 78 },
    fixed: { v: 78 },
  },
  [DIFFICULTIES.HARD]: {
    controls: ["h", "s", "v"],
    defaultGuess: { h: 210, s: 18, v: 72 },
    fixed: {},
  },
};
