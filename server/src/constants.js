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
};

export const DIFFICULTIES = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
};

export const ROUND_COUNT = 5;
export const PLAYER_NAME_MIN_LENGTH = 2;
export const PLAYER_NAME_MAX_LENGTH = 18;
export const MAX_ROUND_SCORE = 10;

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
