import { Suspense } from "react";
import { FooterCardLoading } from "@/components/sections/footer-pages/FooterCardSurface";
import CreditsPage from "@/components/sections/credits/CreditsPage";

export const metadata = {
  title: "Credits | Huestima",
  description: "Thanks to everyone who helped shape Huestima.",
};

export default function Page() {
  return (
    <Suspense fallback={<FooterCardLoading />}>
      <CreditsPage />
    </Suspense>
  );
}
