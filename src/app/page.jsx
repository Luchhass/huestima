import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("home");

export default function Home() {
  return (
    <>
      <HomeCard />
      <PageIntro />
    </>
  );
}
