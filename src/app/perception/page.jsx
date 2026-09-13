import GameLandingPage from "@/components/seo/GameLandingPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("perception");

export default function PerceptionPage() {
  return <GameLandingPage family="perception" />;
}
