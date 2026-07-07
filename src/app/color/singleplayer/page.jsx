import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("colorSingleplayer");

export default async function ColorSingleplayerPage({ searchParams }) {
  const params = await searchParams;
  const setup = resolveSingleplayerRoute(params, "color");

  return (
    <SingleplayerGame
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
    />
  );
}
