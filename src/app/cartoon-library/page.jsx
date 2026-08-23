import { Suspense } from "react";
import CartoonLibraryPage from "@/components/sections/cartoon-library/CartoonLibraryPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("cartoonLibrary");

export default function CartoonLibraryRoute() {
  return (
    <Suspense fallback={null}>
      <CartoonLibraryPage />
    </Suspense>
  );
}
