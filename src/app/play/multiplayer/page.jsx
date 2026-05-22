import { createPageMetadata } from "@/lib/seo";
import HomeCard from "@/components/sections/home/HomeCard";

export const metadata = createPageMetadata("multiplayer", {
  robots: {
    index: false,
    follow: true,
  },
});

export default function MultiplayerPage() {
  return <HomeCard initialView="multiplayer" />;
}
