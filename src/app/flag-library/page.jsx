import { Suspense } from "react";
import FlagLibraryPage from "@/components/sections/flag-library/FlagLibraryPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("flagLibrary");

export default function FlagLibraryRoute() {
  return (
    <Suspense fallback={null}>
      <FlagLibraryPage />
    </Suspense>
  );
}
