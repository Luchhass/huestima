import GameLandingPage from "@/components/seo/GameLandingPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("cartoon");

export default function Page() {
  return <GameLandingPage family="cartoon" />;
}
