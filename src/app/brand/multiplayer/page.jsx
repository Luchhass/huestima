import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("brandMultiplayer");

export default async function BrandMultiplayerPage({ searchParams }) {
  const setup = resolveMultiplayerSetupRoute(await searchParams, "brand");

  return <HomeCard initialView="multiplayer" gameFamily="brand" initialDifficulty={setup.difficulty} initialGameMode={setup.gameMode} initialRoundCount={setup.roundCount} initialHintsEnabled={setup.hintsEnabled} />;
}
