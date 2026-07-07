import HomeCard from "@/components/sections/home/HomeCard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("cartoonMultiplayer");

export default function CartoonMultiplayerPage() {
  return <HomeCard initialView="multiplayer" gameFamily="cartoon" />;
}
