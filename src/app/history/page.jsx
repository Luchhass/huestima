import HistoryPage from "@/components/sections/history/HistoryPage";
import { decodeSharedMatchEntry } from "@/lib/matchHistoryShare";

export default async function HistoryRoute({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const sharedMatch = decodeSharedMatchEntry(resolvedSearchParams?.share || "");
  const selectedMatchId = resolvedSearchParams?.match || "";
  const initialView = resolvedSearchParams?.view || "";

  return (
    <HistoryPage
      sharedMatch={sharedMatch}
      selectedMatchId={selectedMatchId}
      initialView={initialView}
    />
  );
}
