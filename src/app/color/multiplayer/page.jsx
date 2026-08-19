import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("colorMultiplayer");

export default async function ColorMultiplayerPage({ searchParams }) {
  const params = await searchParams;
  const setup = resolveMultiplayerSetupRoute(params, "color");

  return (
    <HomeCard
      initialView="multiplayer"
      gameFamily="color"
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
      initialHintsEnabled={setup.hintsEnabled}
    />
  );
}
