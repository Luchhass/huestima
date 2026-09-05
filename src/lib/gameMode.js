import {
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import {
  getDefaultGameModeForFamily,
  isGameModeInFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";

export function isGameModeAvailable(option) {
  return Boolean(option);
}

export function getAvailableGameModeOptions(options = GAME_MODE_OPTIONS, gameFamily = null, configuration = null) {
  const cleanFamily = gameFamily ? normalizeGameFamily(gameFamily) : null;

  return options.filter(
    (option) =>
      isGameModeAvailable(option) &&
      (!cleanFamily || isGameModeInFamily(option.id, cleanFamily)) &&
      (!cleanFamily || configuration?.[cleanFamily]?.enabled !== false) &&
      (!cleanFamily || configuration?.[cleanFamily]?.modes?.[option.id] !== false),
  );
}

export function getGameModeOption(id, options = GAME_MODE_OPTIONS, gameFamily = null, configuration = null) {
  const availableOptions = getAvailableGameModeOptions(options, gameFamily, configuration);
  const fallbackId = gameFamily
    ? getDefaultGameModeForFamily(gameFamily)
    : DEFAULT_GAME_MODE_ID;

  return (
    availableOptions.find((option) => option.id === id) ||
    availableOptions.find((option) => option.id === fallbackId) ||
    availableOptions[0]
  );
}
