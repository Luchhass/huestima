import HomeCard from "@/components/sections/home/HomeCard";
import { resolveMultiplayerSetupRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("pokemonMultiplayer");

export default async function PokemonMultiplayerPage({ searchParams }) {
  const setup = resolveMultiplayerSetupRoute(await searchParams, "pokemon");
  return (
    <HomeCard
      initialView="multiplayer"
      gameFamily="pokemon"
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
      initialHintsEnabled={setup.hintsEnabled}
    />
  );
}
