import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("flag");

export default function FlagPage() {
  return (
    <>
      <HomeCard gameFamily="flag" />
      <PageIntro />
    </>
  );
}
