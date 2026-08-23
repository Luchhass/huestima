import { Suspense } from "react";
import PrivacyPolicyPage from "@/components/sections/privacy/PrivacyPolicyPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("privacyPolicy");

export default function PrivacyPolicyRoute() {
  return (
    <Suspense fallback={null}>
      <PrivacyPolicyPage />
    </Suspense>
  );
}
