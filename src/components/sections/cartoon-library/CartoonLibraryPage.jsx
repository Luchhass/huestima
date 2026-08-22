"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CARTOON_OPTIONS } from "@/lib/cartoons";
import { useTranslation } from "@/hooks/useLanguage";

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
      items: [...items].sort((left, right) => left.label.localeCompare(right.label)),
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
  const [activeSeries, setActiveSeries] = useState(ALL_SERIES_KEY);

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
    <main className="h-dvh overflow-y-auto px-5 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-7">
        <section className="flex flex-col gap-5 border-b border-black/8 pb-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-black/38">
              Huestima
            </p>
            <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-black sm:text-[2.35rem]">
              {t("cartoonLibrary.title")}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {[ALL_SERIES_KEY, ...CARTOON_GROUPS.map((group) => group.series)].map((series) => {
              const isActive = series === activeSeries;

              return (
                <button
                  key={series}
                  type="button"
                  onClick={() => setActiveSeries(series)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-black bg-black text-white"
                      : "border-black/8 bg-transparent text-black/58 hover:border-black/14 hover:bg-black/[0.035] hover:text-black"
                  }`}
                >
                  {getSeriesLabel(series)}
                </button>
              );
            })}
          </div>
        </section>

        {activeGroup ? (
          <section className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-black sm:text-3xl">
                {getSeriesLabel(activeGroup.series)}
              </h2>
              <p className="mt-1 text-sm font-medium text-black/45">
                {t("cartoonLibrary.imageCount", { count: activeGroup.items.length })}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {activeGroup.items.map((item) => (
                <article key={item.id} className="relative overflow-hidden rounded-[24px] bg-neutral-200">
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={item.sourceImagePath || item.originalScenePath || item.scenePath}
                      alt={item.labels?.[locale] || item.labels?.tr || item.label}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/66 via-transparent to-transparent" />
                    <h3 className="absolute bottom-4 left-4 right-4 truncate text-lg font-semibold text-white">
                      {item.labels?.[locale] || item.labels?.tr || item.label}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
