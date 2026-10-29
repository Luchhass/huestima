import { Suspense } from "react";
import { FullScreenPageLoading } from "@/components/sections/footer-pages/FooterPageShell";
import HowItWorksPage from "@/components/sections/how-it-works/HowItWorksPage";

export const metadata = {
  title: "How it works",
  description:
    "How Huestima uses masks and color-delta rendering for cartoon color memory.",
};

export default function Page() {
  return (
    <Suspense fallback={<FullScreenPageLoading />}>
      <HowItWorksPage />
    </Suspense>
  );
}
