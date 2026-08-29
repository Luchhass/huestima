import DownloadPage from "@/components/sections/download/DownloadPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("download");

export default async function DownloadRoute({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <DownloadPage
      initialFrom={resolvedSearchParams?.from || ""}
      initialPlatform={resolvedSearchParams?.platform || ""}
    />
  );
}
