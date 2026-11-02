import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("pokemonSingleplayer");

export default async function PokemonSingleplayerPage({ searchParams }) {
  const setup = resolveSingleplayerRoute(await searchParams, "pokemon");
  return (
    <SingleplayerGame
      initialDifficulty={setup.difficulty}
      initialGameMode={setup.gameMode}
      initialRoundCount={setup.roundCount}
      initialHintsEnabled={setup.hintsEnabled}
      gameFamily="pokemon"
    />
  );
}
