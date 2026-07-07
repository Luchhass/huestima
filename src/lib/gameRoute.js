import {
  DEFAULT_DIFFICULTY_ID,
  DIFFICULTY_OPTIONS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import {
  getDefaultGameModeForFamily,
  getGameFamilyByMode,
  getGameFamilyHref,
  normalizeGameFamily,
} from "@/lib/gameFamily";
import { getAvailableGameModeOptions } from "@/lib/gameMode";
import { normalizeRoundCount } from "@/lib/roundCount";

export function resolveSingleplayerRoute(searchParams, gameFamily = "color") {
  const cleanFamily = normalizeGameFamily(gameFamily);
  const legacyMode = typeof searchParams?.mode === "string" ? searchParams.mode : "";
  const requestedDifficulty =
    typeof searchParams?.difficulty === "string" ? searchParams.difficulty : legacyMode;
  const requestedGameMode =
    typeof searchParams?.gameMode === "string" ? searchParams.gameMode : legacyMode;

  const validatedDifficulty = DIFFICULTY_OPTIONS.some(
    (option) => option.id === requestedDifficulty,
  )
    ? requestedDifficulty
    : DEFAULT_DIFFICULTY_ID;

  const availableGameModeOptions = getAvailableGameModeOptions(
    GAME_MODE_OPTIONS.filter((option) => !option.multiplayerOnly),
    cleanFamily,
  );
  const defaultGameMode = getDefaultGameModeForFamily(cleanFamily);
  const gameMode = availableGameModeOptions.some(
    (option) => option.id === requestedGameMode && !option.multiplayerOnly,
  )
    ? requestedGameMode
    : defaultGameMode;
  const gameModeOption =
    availableGameModeOptions.find((option) => option.id === gameMode) ||
    availableGameModeOptions[0];
  const difficulty = gameModeOption?.lockedDifficultyId || validatedDifficulty;
  const roundCount = normalizeRoundCount(searchParams?.roundCount ?? searchParams?.levels);

  return {
    difficulty,
    gameMode,
    roundCount,
  };
}

export function getLegacySingleplayerRedirectPath(searchParams) {
  const requestedGameMode =
    typeof searchParams?.gameMode === "string"
      ? searchParams.gameMode
      : typeof searchParams?.mode === "string"
        ? searchParams.mode
        : "";
  const gameFamily = getGameFamilyByMode(requestedGameMode);
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (typeof value === "string") query.set(key, value);
  }

  const suffix = query.toString();

  return `${getGameFamilyHref(gameFamily, "singleplayer")}${suffix ? `?${suffix}` : ""}`;
}
