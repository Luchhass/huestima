import { Suspense } from "react";
import TestLabPage from "@/components/sections/test-lab/TestLabPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("testLab");

export default function TestRoute() {
  return (
    <Suspense fallback={null}>
      <TestLabPage />
    </Suspense>
  );
}
