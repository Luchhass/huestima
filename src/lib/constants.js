export const APP_NAME = "Huestima";

export const HOME_PARAGRAPHS = [
  "A color appears for five seconds. Memorize the shade, estimate its hue, and keep the tone in your head before it disappears.",
  "Recreate it from memory with hue, saturation, and brightness controls. Play one, three, five, or ten levels to test your eye.",
];

export const ROUND_COUNT_OPTIONS = [1, 3, 5, 10, 20];
export const DEFAULT_ROUND_COUNT = 5;
export const ROUND_COUNT = DEFAULT_ROUND_COUNT;
export const DUEL_MAX_ROUNDS = 64;
export const MEMORIZE_DURATION_MS = 5000;
export const FLASH_MEMORIZE_DURATION_MS = 1000;
export const SEQUENCE_MEMORIZE_DURATION_MS = 3000;
export const TIMED_MEMORIZE_DURATION_MS = 3000;
export const TIMED_GUESS_DURATION_MS = 3000;
export const SPRINT_DURATION_MS = 30000;
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

export const DEFAULT_DIFFICULTY_ID = DIFFICULTY_IDS.EASY;

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
  ENDLESS: "endless",
  FLASH: "flash",
  SEQUENCE: "sequence",
  TIMED: "timed",
  GRADIENT: "gradient",
  FLAG: "flag",
  SPRINT: "sprint",
  CARTOON: "cartoon",
  DUEL: "duel",
};

export const DEFAULT_GAME_MODE_ID = GAME_MODE_IDS.NORMAL;

export const GAME_MODE_OPTIONS = [
  {
    id: GAME_MODE_IDS.NORMAL,
    label: "Classic",
    description: "Five seconds to memorize each color.",
    revealDurationMs: MEMORIZE_DURATION_MS,
  },
  {
    id: GAME_MODE_IDS.ENDLESS,
    label: "Endless",
    description: "Classic five-second rounds with no final limit.",
    revealDurationMs: MEMORIZE_DURATION_MS,
    isEndless: true,
    singleplayerOnly: true,
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
    description: "Colors appear back-to-back, three seconds each.",
    revealDurationMs: SEQUENCE_MEMORIZE_DURATION_MS,
  },
  {
    id: GAME_MODE_IDS.TIMED,
    label: "Time Attack",
    description: "Beat the clock: three seconds to memorize, three seconds to choose.",
    revealDurationMs: TIMED_MEMORIZE_DURATION_MS,
    guessDurationMs: TIMED_GUESS_DURATION_MS,
    lockedDifficultyId: DIFFICULTY_IDS.EASY,
  },
  {
    id: GAME_MODE_IDS.GRADIENT,
    label: "Gradient",
    description: "Match the left and right hue of a two-color blend.",
    revealDurationMs: MEMORIZE_DURATION_MS,
    lockedDifficultyId: DIFFICULTY_IDS.EASY,
  },
  {
    id: GAME_MODE_IDS.FLAG,
    label: "Classic",
    description: "Keep the emblem fixed and match the flag background color.",
    revealDurationMs: MEMORIZE_DURATION_MS,
  },
  {
    id: GAME_MODE_IDS.SPRINT,
    label: "Sprint",
    description: "Race through rapid-fire rounds before the clock runs out.",
    revealDurationMs: MEMORIZE_DURATION_MS,
    sprintDurationMs: SPRINT_DURATION_MS,
    isSprint: true,
    lockedDifficultyId: DIFFICULTY_IDS.EASY,
  },
  {
    id: GAME_MODE_IDS.DUEL,
    label: "Duel",
    description: "Endless PvP survival. Weak rounds eliminate only when the gap opens.",
    revealDurationMs: MEMORIZE_DURATION_MS,
    multiplayerOnly: true,
    isElimination: true,
  },
];

export const GAME_MODE_CARD_COPY = {
  singleplayer: {
    [GAME_MODE_IDS.NORMAL]:
      "Memorize each color for five seconds, then rebuild it across your selected levels.",
    [GAME_MODE_IDS.ENDLESS]:
      "Classic five-second colors keep coming until you finish the run.",
    [GAME_MODE_IDS.FLASH]:
      "Catch each one-second flash, then trust your first read.",
    [GAME_MODE_IDS.SEQUENCE]:
      "Study the colors in order, then recreate the sequence one by one.",
    [GAME_MODE_IDS.TIMED]:
      "Memorize each color for three seconds, then lock your guess in three seconds.",
    [GAME_MODE_IDS.GRADIENT]:
      "Match both sides of a two-color gradient using the left and right hue bars.",
    [GAME_MODE_IDS.FLAG]:
      "Read the flag shape, then tune the background color behind its fixed emblem.",
    [GAME_MODE_IDS.SPRINT]:
      "Complete as many levels as possible during thirty seconds of active play.",
    [GAME_MODE_IDS.DUEL]:
      "Duel is a multiplayer-only survival mode. Create a lobby to play it.",
  },
  multiplayer: {
    [GAME_MODE_IDS.NORMAL]:
      "Everyone sees the same five-second colors. Closest guesses climb the room.",
    [GAME_MODE_IDS.ENDLESS]:
      "Classic rounds keep going without a fixed finish line. Keep matching as long as the room survives.",
    [GAME_MODE_IDS.FLASH]:
      "Everyone gets the same one-second flashes. Fast eyes win.",
    [GAME_MODE_IDS.SEQUENCE]:
      "Everyone studies the same color sequence, then rebuilds it in order.",
    [GAME_MODE_IDS.TIMED]:
      "Everyone gets three seconds to memorize and three seconds to choose.",
    [GAME_MODE_IDS.GRADIENT]:
      "Everyone gets the same two-color gradient. Left and right hue accuracy decide the room.",
    [GAME_MODE_IDS.FLAG]:
      "Everyone sees the same flag. The fixed emblem stays put while background accuracy wins.",
    [GAME_MODE_IDS.SPRINT]:
      "Everyone completes as many levels as possible during thirty seconds of active play.",
    [GAME_MODE_IDS.DUEL]:
      "Endless PvP rounds. The last player is eliminated only when the score gap is wide enough.",
  },
};

export const THEME_STORAGE_KEY = "huestima-theme";
export const SOUND_STORAGE_KEY = "huestima-sound";
export const MUSIC_STORAGE_KEY = "huestima-music";
export const FULLSCREEN_STORAGE_KEY = "huestima-fullscreen-mode";
export const LANGUAGE_STORAGE_KEY = "huestima-language";
