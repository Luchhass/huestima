import { Suspense } from "react";
import BrandLibraryPage from "@/components/sections/brand-library/BrandLibraryPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("brandLibrary");

export default function BrandLibraryRoute() {
  return (
    <Suspense fallback={null}>
      <BrandLibraryPage />
    </Suspense>
  );
}
