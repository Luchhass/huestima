import { Suspense } from "react";
import { FooterCardLoading } from "@/components/sections/footer-pages/FooterCardSurface";
import HowItWorksPage from "@/components/sections/how-it-works/HowItWorksPage";

export const metadata = {
  title: "How it works",
  description:
    "How Huestima uses masks and color-delta rendering for cartoon color memory.",
};

export default function Page() {
  return (
    <Suspense fallback={<FooterCardLoading />}>
      <HowItWorksPage />
    </Suspense>
  );
}
