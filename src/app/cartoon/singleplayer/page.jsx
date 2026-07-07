import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("cartoonSingleplayer");

export default async function CartoonSingleplayerPage({ searchParams }) {
  const params = await searchParams;
  const setup = resolveSingleplayerRoute(params, "cartoon");

  return (
    <SingleplayerGame
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
    />
  );
}
