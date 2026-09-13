import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("perceptionMultiplayer");

export default async function PerceptionMultiplayerPage({ searchParams }) {
  const setup = resolveMultiplayerSetupRoute(await searchParams, "perception");

  return <HomeCard initialView="multiplayer" gameFamily="perception" initialDifficulty={setup.difficulty} initialGameMode={setup.gameMode} initialRoundCount={setup.roundCount} initialHintsEnabled={setup.hintsEnabled} />;
}
