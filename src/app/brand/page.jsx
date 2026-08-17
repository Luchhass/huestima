import HomeCard from "@/components/sections/home/HomeCard";
import PageIntro from "@/components/layout/PageIntro";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("brand");

export default function BrandPage() {
  return (
    <>
      <HomeCard gameFamily="brand" />
      <PageIntro />
    </>
  );
}
