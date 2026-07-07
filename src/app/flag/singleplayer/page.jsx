import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("flagSingleplayer");

export default async function FlagSingleplayerPage({ searchParams }) {
  const params = await searchParams;
  const setup = resolveSingleplayerRoute(params, "flag");

  return (
    <SingleplayerGame
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
    />
  );
}
