import { Suspense } from "react";
import BrandLibraryPage from "@/components/sections/brand-library/BrandLibraryPage";
import { TEAM_OPTIONS } from "@/lib/teams";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("teamLibrary");

export default function TeamLibraryRoute() {
  return <Suspense fallback={null}><BrandLibraryPage items={TEAM_OPTIONS} isTeam /></Suspense>;
}
