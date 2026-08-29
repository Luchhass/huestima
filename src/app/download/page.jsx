import { Suspense } from "react";
import DownloadPage from "@/components/sections/download/DownloadPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("download");

export default function DownloadRoute() {
  return <Suspense fallback={null}><DownloadPage /></Suspense>;
}
