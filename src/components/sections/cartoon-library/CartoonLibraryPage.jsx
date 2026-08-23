"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CARTOON_OPTIONS } from "@/lib/cartoons";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import LibraryPageShell, {
  LibraryFilterButton,
} from "@/components/sections/library/LibraryPageShell";

function groupCartoonsBySeries(cartoons) {
  const groups = new Map();

  cartoons.forEach((cartoon) => {
    const seriesKey = cartoon.series || "Unknown";
    const current = groups.get(seriesKey) || [];
    current.push(cartoon);
    groups.set(seriesKey, current);
  });

  return Array.from(groups.entries())
    .map(([series, items]) => ({
      series,
      items: [...items].sort((left, right) => (left.catalogNumber || 0) - (right.catalogNumber || 0)),
    }))
    .sort((left, right) => left.series.localeCompare(right.series));
}

const CARTOON_GROUPS = groupCartoonsBySeries(CARTOON_OPTIONS);
const SERIES_TRANSLATION_KEYS = {
  "Adventure Time": "adventureTime",
  "Ben 10": "ben10",
  "Regular Show": "regularShow",
};
const ALL_SERIES_KEY = "all";

export default function CartoonLibraryPage() {
  const { locale, t } = useTranslation();
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const [activeSeries, setActiveSeries] = useState(ALL_SERIES_KEY);
  const leavePage = useFooterPageTransition(mainRef);
  const from = searchParams.get("from");
  const testLabPath = from ? `/test-lab?from=${from}` : "/test-lab";

  const handleBack = async (event) => {
    event.preventDefault();
    await leavePage(testLabPath, { returnToHome: false });
  };

  const activeGroup = useMemo(
    () => {
      if (activeSeries === ALL_SERIES_KEY) {
        return {
          series: ALL_SERIES_KEY,
          items: CARTOON_GROUPS.flatMap((group) => group.items),
        };
      }

      return CARTOON_GROUPS.find((group) => group.series === activeSeries) || CARTOON_GROUPS[0] || null;
    },
    [activeSeries],
  );

  const getSeriesLabel = (series) => {
    if (series === ALL_SERIES_KEY) return t("cartoonLibrary.series.all");

    const key = SERIES_TRANSLATION_KEYS[series];

    return key ? t(`cartoonLibrary.series.${key}`) : series;
  };

  return (
    <LibraryPageShell
      mainRef={mainRef}
      backHref={testLabPath}
      onBack={handleBack}
      backLabel={locale === "tr" ? "Test Lab'a dön" : "Back to Test Lab"}
      title={t("cartoonLibrary.title")}
      count={activeGroup ? t("cartoonLibrary.imageCount", { count: activeGroup.items.length }) : ""}
      filters={[ALL_SERIES_KEY, ...CARTOON_GROUPS.map((group) => group.series)].map((series) => (
        <LibraryFilterButton
          key={series}
          active={series === activeSeries}
          onClick={() => setActiveSeries(series)}
        >
          {getSeriesLabel(series)}
        </LibraryFilterButton>
      ))}
    >
      {activeGroup ? (
        <div className="mx-auto grid w-full max-w-[68rem] grid-cols-1 gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {activeGroup.items.map((item) => (
            <article key={item.id}>
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[18px] bg-foreground/6">
                <Image
                  src={item.sourceImagePath || item.originalScenePath || item.scenePath}
                  alt={item.labels?.[locale] || item.labels?.tr || item.label}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 px-1">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {item.labels?.[locale] || item.labels?.tr || item.label}
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
