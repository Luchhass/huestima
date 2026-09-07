import GameGuidePage from "@/components/seo/GameGuidePage";
import { LANDING_FAMILIES } from "../../../shared/landingRoutes.mjs";

export const metadata = {
  title: "Game guide | Huestima",
  description: "How to play Huestima color, flag, cartoon, brand and team memory games.",
};

export default async function GameGuideRoute({ searchParams }) {
  const params = await searchParams;
  const family = LANDING_FAMILIES.includes(params?.from) ? params.from : "color";
  return <GameGuidePage family={family} />;
}
