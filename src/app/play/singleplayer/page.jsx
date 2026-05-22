import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_GAME_MODE_ID,
  DIFFICULTY_OPTIONS,
  GAME_MODE_OPTIONS,
} from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("singleplayer");

export default async function SingleplayerPage({ searchParams }) {
  const params = await searchParams;
  const legacyMode = typeof params?.mode === "string" ? params.mode : "";
  const requestedDifficulty =
    typeof params?.difficulty === "string" ? params.difficulty : legacyMode;
  const requestedGameMode =
    typeof params?.gameMode === "string" ? params.gameMode : legacyMode;

  const difficulty = DIFFICULTY_OPTIONS.some(
    (option) => option.id === requestedDifficulty,
  )
    ? requestedDifficulty
    : DEFAULT_DIFFICULTY_ID;

  const gameMode = GAME_MODE_OPTIONS.some(
    (option) => option.id === requestedGameMode,
  )
    ? requestedGameMode
    : DEFAULT_GAME_MODE_ID;

  return (
    <SingleplayerGame
      initialDifficulty={difficulty}
      initialGameMode={gameMode}
    />
  );
}
