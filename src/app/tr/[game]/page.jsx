import { notFound } from "next/navigation";
import GameLandingPage from "@/components/seo/GameLandingPage";
import { createPageMetadata } from "@/lib/seo";
import { LANDING_FAMILIES } from "../../../../shared/landingRoutes.mjs";

export const dynamicParams = false;
export function generateStaticParams() {
  return LANDING_FAMILIES.map((game) => ({ game }));
}
export async function generateMetadata({ params }) {
  const { game } = await params;
  if (!LANDING_FAMILIES.includes(game)) notFound();
  return createPageMetadata(game, { locale: "tr" });
}
export default async function TurkishGamePage({ params }) {
  const { game } = await params;
  if (!LANDING_FAMILIES.includes(game)) notFound();
  return <GameLandingPage family={game} locale="tr" />;
}
