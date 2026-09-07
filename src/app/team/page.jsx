import GameLandingPage from "@/components/seo/GameLandingPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("team");

export default function Page() {
  return <GameLandingPage family="team" />;
}
