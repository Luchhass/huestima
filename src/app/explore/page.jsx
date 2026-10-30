import { Suspense } from "react";
import { FooterCardLoading } from "@/components/sections/footer-pages/FooterCardSurface";
import { FullScreenPageLoading } from "@/components/sections/footer-pages/FooterPageShell";
import ExplorePage from "@/components/sections/explore/ExplorePage";
import PageIntro from "@/components/layout/PageIntro";

export const metadata = {
  title: "Explore Huestima",
  description: "Browse the cartoon image pool and learn how Huestima works.",
};

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const returningFromChild = resolvedSearchParams?.via === "child";

  return (
    <>
      <PageIntro />
      <Suspense fallback={returningFromChild ? <FullScreenPageLoading /> : <FooterCardLoading />}>
        <ExplorePage />
      </Suspense>
    </>
  );
}
