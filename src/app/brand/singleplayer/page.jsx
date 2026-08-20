import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("brandSingleplayer");

export default async function BrandSingleplayerPage({ searchParams }) {
  const setup = resolveSingleplayerRoute(await searchParams, "brand");

  return <SingleplayerGame {...{
    initialDifficulty: setup.difficulty,
    initialGameMode: setup.gameMode,
    initialRoundCount: setup.roundCount,
    initialHintsEnabled: setup.hintsEnabled,
    gameFamily: "brand",
  }} />;
}
