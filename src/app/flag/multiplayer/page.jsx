import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("flagMultiplayer");

export default async function FlagMultiplayerPage({ searchParams }) {
  const setup = resolveMultiplayerSetupRoute(await searchParams, "flag");
  return (
    <HomeCard
      initialView="multiplayer"
      gameFamily="flag"
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
