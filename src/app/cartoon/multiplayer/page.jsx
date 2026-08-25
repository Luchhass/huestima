import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("cartoonMultiplayer");

export default async function CartoonMultiplayerPage({ searchParams }) {
  const params = await searchParams;
  const setup = resolveMultiplayerSetupRoute(params, "cartoon");

  return (
    <HomeCard
      initialView="multiplayer"
      gameFamily="cartoon"
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
      initialHintsEnabled={setup.hintsEnabled}
      initialCartoonIds={setup.cartoonIds}
    />
  );
}
