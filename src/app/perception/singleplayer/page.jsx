import PatternGame from "@/components/sections/play/PatternGame";
import OddGame from "@/components/sections/play/OddGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("perceptionSingleplayer");

export default async function PerceptionSingleplayerPage({ searchParams }) {
  const setup = resolveSingleplayerRoute(await searchParams, "perception");
  if (setup.gameMode === "odd") {
    return <OddGame difficulty={setup.difficulty} />;
  }
  return <PatternGame difficulty={setup.difficulty} roundCount={setup.roundCount} />;
}
