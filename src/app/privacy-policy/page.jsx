import { Suspense } from "react";
import { FooterCardLoading } from "@/components/sections/footer-pages/FooterCardSurface";
import PrivacyPolicyPage from "@/components/sections/privacy/PrivacyPolicyPage";
import { createPageMetadata } from "@/lib/seo";
import PageIntro from "@/components/layout/PageIntro";

export const metadata = createPageMetadata("privacyPolicy");

export default function PrivacyPolicyRoute() {
  return (
    <>
      <PageIntro />
      <Suspense fallback={<FooterCardLoading />}>
        <PrivacyPolicyPage />
      </Suspense>
    </>
  );
}
