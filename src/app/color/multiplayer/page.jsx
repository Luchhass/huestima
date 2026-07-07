import HomeCard from "@/components/sections/home/HomeCard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("colorMultiplayer");

export default function ColorMultiplayerPage() {
  return <HomeCard initialView="multiplayer" gameFamily="color" />;
}
