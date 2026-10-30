import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("colorMultiplayer");

export default async function ColorMultiplayerPage({ searchParams }) {
  const setup = resolveMultiplayerSetupRoute(await searchParams, "color");
  return (
    <HomeCard
      initialView="multiplayer"
      gameFamily="color"
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
      initialHintsEnabled={setup.hintsEnabled}
      initialFlagDifficulty={setup.flagDifficulty}
      initialFlagDifficulties={setup.flagDifficulties}
      initialCartoonIds={setup.cartoonIds}
      initialTeamIds={setup.teamIds}
    />
  );
}
