import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("cartoon");

export default function CartoonPage() {
  return (
    <>
      <HomeCard gameFamily="cartoon" />
      <PageIntro />
    </>
  );
}
