import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("teamMultiplayer");

export default async function TeamMultiplayerPage({ searchParams }) {
  const setup = resolveMultiplayerSetupRoute(await searchParams, "team");
  return (
    <HomeCard
      initialView="multiplayer"
      gameFamily="team"
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
