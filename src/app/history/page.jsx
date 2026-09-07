import HistoryPage from "@/components/sections/history/HistoryPage";
import { decodeSharedMatchEntry } from "@/lib/matchHistoryShare";

export const metadata = { title: "Match history", robots: { index: false, follow: false } };

export default async function HistoryRoute({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const sharedMatch = decodeSharedMatchEntry(
    resolvedSearchParams?.s || resolvedSearchParams?.share || "",
  );
  const selectedMatchId = resolvedSearchParams?.match || "";
  const initialView = resolvedSearchParams?.view || "";
  const initialFrom = resolvedSearchParams?.from || "color";

  return (
    <HistoryPage
      sharedMatch={sharedMatch}
      selectedMatchId={selectedMatchId}
      initialView={initialView}
      initialFrom={initialFrom}
    />
  );
}
