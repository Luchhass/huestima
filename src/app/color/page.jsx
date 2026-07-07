import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("color");

export default function ColorPage() {
  return (
    <>
      <HomeCard gameFamily="color" />
      <PageIntro />
    </>
  );
}
