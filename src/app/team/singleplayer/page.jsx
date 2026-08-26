import SingleplayerGame from "@/components/sections/play/SingleplayerGame";
import { resolveSingleplayerRoute } from "@/lib/gameRoute";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("teamSingleplayer");

export default async function TeamSingleplayerPage({ searchParams }) {
  const setup = resolveSingleplayerRoute(await searchParams, "team");
  return <SingleplayerGame {...setup} gameFamily="team" />;
}
