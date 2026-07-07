import HomeCard from "@/components/sections/home/HomeCard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("flagMultiplayer");

export default function FlagMultiplayerPage() {
  return <HomeCard initialView="multiplayer" gameFamily="flag" />;
}
