"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND_OPTIONS } from "@/lib/brands";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import LibraryPageShell, {
  LibraryFilterButton,
} from "@/components/sections/library/LibraryPageShell";

const ALL_GROUP_KEY = "all";

function groupBrands(brands) {
  const groups = new Map();

  brands.forEach((brand) => {
    const groupKey = (brand.label || "#").trim().charAt(0).toUpperCase();
    const current = groups.get(groupKey) || [];
    current.push(brand);
    groups.set(groupKey, current);
  });

  return Array.from(groups.entries())
    .map(([group, items]) => ({
      group,
      items: [...items].sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.group.localeCompare(right.group));
}

const BRAND_GROUPS = groupBrands(BRAND_OPTIONS);

export default function BrandLibraryPage({ items = BRAND_OPTIONS, isTeam = false }) {
  const { locale } = useTranslation();
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const [activeGroup, setActiveGroup] = useState(ALL_GROUP_KEY);
  const leavePage = useFooterPageTransition(mainRef);
  const from = searchParams.get("from");
  const testLabPath = from ? `/test-lab?from=${from}` : "/test-lab";
  const groups = useMemo(() => {
    if (!isTeam) return groupBrands(items);
    const leagues = new Map();
    items.forEach((item) => {
      const current = leagues.get(item.league || "Other") || [];
      current.push(item);
      leagues.set(item.league || "Other", current);
    });
    return Array.from(leagues.entries()).map(([group, leagueItems]) => ({
      group,
      items: leagueItems.sort((left, right) => left.label.localeCompare(right.label)),
    }));
  }, [isTeam, items]);

  const handleBack = async (event) => {
    event.preventDefault();
    await leavePage(testLabPath, { returnToHome: false });
  };

  const selectedGroup = useMemo(() => {
    if (activeGroup === ALL_GROUP_KEY) {
      return {
        group: ALL_GROUP_KEY,
        items: groups.flatMap((group) => group.items),
      };
    }

    return groups.find((group) => group.group === activeGroup) || groups[0] || null;
  }, [activeGroup, groups]);

  return (
    <LibraryPageShell
      mainRef={mainRef}
      backHref={testLabPath}
      onBack={handleBack}
      backLabel={locale === "tr" ? "Test Page'e dön" : "Back to Test Page"}
      title={isTeam ? (locale === "tr" ? "Takımlar" : "Teams") : (locale === "tr" ? "Markalar" : "Brands")}
      count={selectedGroup ? `${selectedGroup.items.length} logo` : ""}
      filters={[ALL_GROUP_KEY, ...groups.map((group) => group.group)].map((group) => (
        <LibraryFilterButton
          key={group}
          active={group === activeGroup}
          onClick={() => setActiveGroup(group)}
        >
          {group === ALL_GROUP_KEY ? (locale === "tr" ? "Tümü" : "All") : group}
        </LibraryFilterButton>
      ))}
    >
      {selectedGroup ? (
        <div className="mx-auto grid w-full max-w-[68rem] grid-cols-1 gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {selectedGroup.items.map((item) => (
            <article key={item.id}>
              <div
                className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[18px] border border-foreground/8 p-8"
                style={{ backgroundColor: "#000000" }}
              >
                <div className="relative h-[62%] w-[78%]">
                  <Image
                    src={item.logoPath}
                    alt={item.labels?.[locale] || item.label}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 px-1">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {item.labels?.[locale] || item.label}
                </h2>
                <span className="shrink-0 text-xs font-medium text-foreground/38">
                  #{item.catalogNumber}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </LibraryPageShell>
  );
}
