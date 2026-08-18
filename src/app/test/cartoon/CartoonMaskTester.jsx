"use client";

import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import CartoonOverlay from "@/components/ui/game/CartoonOverlay";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_MODE_IDS } from "@/lib/constants";
import { hsvToHex } from "@/lib/color";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function CartoonPreviewCard({ color }) {
  return (
    <article className="relative aspect-video overflow-hidden rounded-[22px] bg-black shadow-[0_14px_34px_rgba(31,25,20,0.16),0_6px_14px_rgba(31,25,20,0.08)]">
      <CartoonOverlay color={color} useCanvas />
    </article>
  );
}

function CartoonOriginalCard({ cartoon }) {
  const { locale } = useTranslation();
  const title = cartoon.labels?.[locale] || cartoon.labels?.en || cartoon.label;

  return (
    <article className="overflow-hidden rounded-[20px] border border-zinc-200 bg-white">
      <div className="relative aspect-video bg-zinc-100">
        {cartoon.sourceImagePath ? (
          <Image
            src={cartoon.sourceImagePath}
            alt={cartoon.label}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-zinc-900">
            {title}
          </p>
          <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
            {cartoon.sourceTitle || cartoon.id}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          original
        </span>
      </div>
    </article>
  );
}

function TesterTabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
        active
          ? "bg-zinc-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function CartoonMaskTester({ cartoons }) {
  const [view, setView] = useState("paintable");
  const [hue, setHue] = useState(210);
  const renderHue = useDeferredValue(hue);
  const paintColor = `hsl(${hue} 95% 52%)`;
  const cardColorFor = (cartoon) => {
    const hsv = {
      h: renderHue,
      s: cartoon.paint?.s ?? 95,
      v: cartoon.paint?.v ?? 82,
    };
    const hex = hsvToHex(hsv);

    return {
      type: GAME_MODE_IDS.CARTOON,
      cartoonId: cartoon.id,
      cartoonLabel: "",
      cartoonSeries: cartoon.series,
      paintLabel: cartoon.paintLabel,
      originalScenePath: cartoon.originalScenePath,
      baseScenePath: cartoon.baseScenePath,
      scenePath: cartoon.scenePath,
      imagePath: cartoon.imagePath,
      maskPath: cartoon.maskPath,
      assetPath: cartoon.assetPath,
      paintBase: cartoon.paint,
      layers: cartoon.layers,
      ...hsv,
      hex,
      toneHex: hex,
    };
  };

  function updateHueFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    setHue(Math.round((1 - position) * 359));
  }

  function handleHuePointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateHueFromPointer(event);
  }

  function handleHueKeyDown(event) {
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      setHue((currentHue) => clamp(currentHue + 4, 0, 359));
    }

    if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      setHue((currentHue) => clamp(currentHue - 4, 0, 359));
    }
  }

  const orderedCartoons = useMemo(
    () =>
      [...cartoons].sort((left, right) => {
        const seriesSort = (left.series || "").localeCompare(right.series || "");

        return seriesSort || left.id.localeCompare(right.id);
      }),
    [cartoons],
  );
  const groupedCartoons = useMemo(() => {
    const groups = new Map();

    orderedCartoons.forEach((cartoon) => {
      const series = cartoon.series || "Other";
      const currentGroup = groups.get(series) || [];
      currentGroup.push(cartoon);
      groups.set(series, currentGroup);
    });

    return Array.from(groups, ([series, items]) => ({ series, items }));
  }, [orderedCartoons]);

  return (
    <div className="w-full overflow-x-hidden bg-white text-zinc-950">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center gap-3">
            <TesterTabButton
              active={view === "paintable"}
              onClick={() => setView("paintable")}
            >
              Paintable
            </TesterTabButton>
            <TesterTabButton
              active={view === "originals"}
              onClick={() => setView("originals")}
            >
              Originals
            </TesterTabButton>
          </div>

          {view === "paintable" ? (
            <div className="max-w-[34rem]">
              <div className="flex items-center gap-4">
                <div
                  aria-label="Hue"
                  aria-orientation="horizontal"
                  aria-valuemax="359"
                  aria-valuemin="0"
                  aria-valuenow={hue}
                  role="slider"
                  tabIndex={0}
                  onKeyDown={handleHueKeyDown}
                  onPointerDown={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const position = clamp((event.clientX - rect.left) / rect.width, 0, 1);
                    setHue(Math.round(position * 359));
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const position = clamp((event.clientX - rect.left) / rect.width, 0, 1);
                      setHue(Math.round(position * 359));
                    }
                  }}
                  className="guess-picker-track relative h-11 w-full touch-none overflow-hidden rounded-full border border-white/28 bg-[linear-gradient(to_right,#ff2a00_0%,#ffd400_14%,#b7ff00_26%,#00ff5a_38%,#00f6ff_50%,#005cff_61%,#5900ff_74%,#ff00c8_87%,#ff0038_100%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_14px_28px_rgba(0,0,0,0.18)] outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/45"
                >
                  <span
                    aria-hidden="true"
                    className="guess-picker-thumb pointer-events-none absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_8px_22px_rgba(0,0,0,0.26)]"
                    style={{ left: `${(hue / 359) * 100}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-5 rounded-full"
                      style={{ backgroundColor: paintColor }}
                    />
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.24)]"
                >
                  <span
                    aria-hidden="true"
                    className="size-7 rounded-full"
                    style={{ backgroundColor: paintColor }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {groupedCartoons.map(({ series, items }) => (
            <section key={series} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  {series}
                </h2>
                <span className="text-xs font-bold text-zinc-300">
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((cartoon) =>
                  view === "paintable" ? (
                    <CartoonPreviewCard
                      key={cartoon.id}
                      color={cardColorFor(cartoon)}
                    />
                  ) : (
                    <CartoonOriginalCard key={cartoon.id} cartoon={cartoon} />
                  ),
                )}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
