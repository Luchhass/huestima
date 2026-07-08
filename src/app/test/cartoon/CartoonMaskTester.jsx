"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import CartoonOverlay from "@/components/ui/game/CartoonOverlay";
import { GAME_MODE_IDS } from "@/lib/constants";
import { hsvToHex } from "@/lib/color";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function CartoonPreviewCard({ color }) {
  const cardRef = useRef(null);
  const [canUseCanvas, setCanUseCanvas] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    if (!("IntersectionObserver" in window)) {
      const fallbackId = window.setTimeout(() => {
        setCanUseCanvas(true);
      }, 0);

      return () => window.clearTimeout(fallbackId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCanUseCanvas(entry.isIntersecting);
      },
      { rootMargin: "640px" },
    );

    observer.observe(card);

    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      className="relative aspect-video overflow-hidden rounded-[22px] bg-black shadow-[0_14px_34px_rgba(31,25,20,0.16),0_6px_14px_rgba(31,25,20,0.08)]"
    >
      <CartoonOverlay color={color} useCanvas={canUseCanvas} />
    </article>
  );
}

export default function CartoonMaskTester({ cartoons }) {
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
    <main className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-white text-zinc-950">
      <aside className="fixed left-7 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-5 sm:left-10">
        <div
          aria-label="Hue"
          aria-orientation="vertical"
          aria-valuemax="359"
          aria-valuemin="0"
          aria-valuenow={hue}
          role="slider"
          tabIndex={0}
          onKeyDown={handleHueKeyDown}
          onPointerDown={handleHuePointerDown}
          onPointerMove={(event) => {
            if (event.buttons === 1) updateHueFromPointer(event);
          }}
          className="guess-picker-track relative h-50.5 w-10 touch-none overflow-hidden rounded-full border border-white/28 bg-[linear-gradient(to_top,#ff2a00_0%,#ffd400_14%,#b7ff00_26%,#00ff5a_38%,#00f6ff_50%,#005cff_61%,#5900ff_74%,#ff00c8_87%,#ff0038_100%)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_14px_28px_rgba(0,0,0,0.18)] outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/45 sm:h-57.5 sm:w-11"
        >
          <span
            aria-hidden="true"
            className="guess-picker-thumb pointer-events-none absolute left-1/2 grid size-8 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_8px_22px_rgba(0,0,0,0.26)]"
            style={{
              bottom: `${(hue / 359) * 100}%`,
            }}
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
          className="grid size-10 place-items-center rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.24)]"
        >
          <span
            aria-hidden="true"
            className="size-7 rounded-full"
            style={{ backgroundColor: paintColor }}
          />
        </div>
      </aside>

      <div className="min-h-dvh w-full px-5 py-10 pl-[104px] sm:px-8 sm:py-12 sm:pl-[132px]">
        <div className="mx-auto flex w-full max-w-[70rem] flex-col gap-10">
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
                {items.map((cartoon) => (
                  <CartoonPreviewCard
                    key={cartoon.id}
                    color={cardColorFor(cartoon)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
