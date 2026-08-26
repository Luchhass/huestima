import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("team");

export default function TeamPage() {
  return <><PageIntro /><HomeCard gameFamily="team" /></>;
}
