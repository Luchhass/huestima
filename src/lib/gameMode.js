import {
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_IDS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import { HAS_CARTOON_OPTIONS } from "@/lib/cartoons";
import {
  getDefaultGameModeForFamily,
  isGameModeInFamily,
  normalizeGameFamily,
} from "@/lib/gameFamily";

export function isGameModeAvailable(option) {
  return option.id !== GAME_MODE_IDS.CARTOON || HAS_CARTOON_OPTIONS;
}

export function getAvailableGameModeOptions(options = GAME_MODE_OPTIONS, gameFamily = null) {
  const cleanFamily = gameFamily ? normalizeGameFamily(gameFamily) : null;

  return options.filter(
    (option) =>
      isGameModeAvailable(option) &&
      (!cleanFamily || isGameModeInFamily(option.id, cleanFamily)),
  );
}

export function getGameModeOption(id, options = GAME_MODE_OPTIONS, gameFamily = null) {
  const availableOptions = getAvailableGameModeOptions(options, gameFamily);
  const fallbackId = gameFamily
    ? getDefaultGameModeForFamily(gameFamily)
    : DEFAULT_GAME_MODE_ID;

  return (
    availableOptions.find((option) => option.id === id) ||
    availableOptions.find((option) => option.id === fallbackId) ||
    availableOptions[0]
  );
}
