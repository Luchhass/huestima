export const APP_NAME = "Huestima";

export const HOME_PARAGRAPHS = [
  "A color appears for five seconds. Memorize the exact shade before it disappears.",
  "Recreate it from memory with hue, saturation, and brightness controls. You get five rounds to prove your eye.",
];

export const ROUND_COUNT = 5;
export const MEMORIZE_DURATION_MS = 5000;
export const FLASH_MEMORIZE_DURATION_MS = 1000;
export const SEQUENCE_MEMORIZE_DURATION_MS = 3000;
export const MAX_ROUND_SCORE = 10;

export const DEFAULT_GUESS_HSV = {
  h: 210,
  s: 18,
  v: 72,
};

export const DIFFICULTY_IDS = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
};

export const DEFAULT_DIFFICULTY_ID = DIFFICULTY_IDS.NORMAL;

export const DIFFICULTY_OPTIONS = [
  {
    id: DIFFICULTY_IDS.EASY,
    label: "Easy",
    controls: ["h"],
    defaultGuess: { h: 210, s: 82, v: 78 },
    fixed: { s: 82, v: 78 },
  },
  {
    id: DIFFICULTY_IDS.NORMAL,
    label: "Normal",
    controls: ["h", "s"],
    defaultGuess: { h: 210, s: 50, v: 78 },
    fixed: { v: 78 },
  },
  {
    id: DIFFICULTY_IDS.HARD,
    label: "Hard",
    controls: ["h", "s", "v"],
    defaultGuess: DEFAULT_GUESS_HSV,
    fixed: {},
  },
];

export const GAME_MODE_IDS = {
  NORMAL: "normal",
  FLASH: "flash",
  SEQUENCE: "sequence",
};

export const DEFAULT_GAME_MODE_ID = GAME_MODE_IDS.NORMAL;

export const GAME_MODE_OPTIONS = [
  {
    id: GAME_MODE_IDS.NORMAL,
    label: "Normal",
    description: "Five seconds to memorize each color.",
    revealDurationMs: MEMORIZE_DURATION_MS,
  },
  {
    id: GAME_MODE_IDS.FLASH,
    label: "Flash",
    description: "One second to catch each color.",
    revealDurationMs: FLASH_MEMORIZE_DURATION_MS,
  },
  {
    id: GAME_MODE_IDS.SEQUENCE,
    label: "Sequence",
    description: "Five colors appear back-to-back, three seconds each.",
    revealDurationMs: SEQUENCE_MEMORIZE_DURATION_MS,
  },
];

export const GAME_MODE_CARD_COPY = {
  singleplayer: {
    [GAME_MODE_IDS.NORMAL]:
      "Memorize each color for five seconds, then rebuild it across five rounds.",
    [GAME_MODE_IDS.FLASH]:
      "Catch each one-second flash, then trust your first read.",
    [GAME_MODE_IDS.SEQUENCE]:
      "Study five colors in order, then recreate the sequence one by one.",
  },
  multiplayer: {
    [GAME_MODE_IDS.NORMAL]:
      "Everyone sees the same five-second colors. Closest guesses climb the room.",
    [GAME_MODE_IDS.FLASH]:
      "Everyone gets the same one-second flashes. Fast eyes win.",
    [GAME_MODE_IDS.SEQUENCE]:
      "Everyone studies the same five-color sequence, then rebuilds it in order.",
  },
};

export const THEME_STORAGE_KEY = "huestima-theme";
export const SOUND_STORAGE_KEY = "huestima-sound";
export const FULLSCREEN_STORAGE_KEY = "huestima-fullscreen-mode";
export const LANGUAGE_STORAGE_KEY = "huestima-language";
