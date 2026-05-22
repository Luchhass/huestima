import {
  DEFAULT_GAME_MODE_ID,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";

export function getGameModeOption(id) {
  return (
    GAME_MODE_OPTIONS.find((option) => option.id === id) ||
    GAME_MODE_OPTIONS.find((option) => option.id === DEFAULT_GAME_MODE_ID)
  );
}
