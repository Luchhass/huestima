import GameLandingPage from "@/components/seo/GameLandingPage";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("pokemon");
export default function Page() { return <GameLandingPage family="pokemon" />; }
