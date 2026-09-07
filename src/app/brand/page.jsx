import GameLandingPage from "@/components/seo/GameLandingPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("brand");

export default function Page() {
  return <GameLandingPage family="brand" />;
}
