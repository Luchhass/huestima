import { Suspense } from "react";
import { FullScreenPageLoading } from "@/components/sections/footer-pages/FooterPageShell";
import CartoonListPage from "@/components/sections/explore/CartoonListPage";

export const metadata = {
  title: "Cartoon list | Huestima Explore",
  description: "Browse all cartoon pool images in Huestima.",
};

export default function Page() {
  return (
    <Suspense fallback={<FullScreenPageLoading />}>
      <CartoonListPage />
    </Suspense>
  );
}
