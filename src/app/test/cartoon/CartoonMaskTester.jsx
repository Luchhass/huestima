"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GameCardShell from "@/components/ui/game/GameCardShell";
import { GAME_MODE_IDS } from "@/lib/constants";
import { hsvToHex } from "@/lib/color";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function CartoonMaskTester({ cartoons }) {
  const [hue, setHue] = useState(210);
  const [pageIndex, setPageIndex] = useState(0);
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
  const currentIndex = orderedCartoons.length
    ? clamp(pageIndex, 0, orderedCartoons.length - 1)
    : 0;
  const currentCartoon = orderedCartoons[currentIndex];

  function goToPrevious() {
    setPageIndex((index) =>
      orderedCartoons.length ? (index - 1 + orderedCartoons.length) % orderedCartoons.length : 0,
    );
  }

  function goToNext() {
    setPageIndex((index) =>
      orderedCartoons.length ? (index + 1) % orderedCartoons.length : 0,
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-white text-zinc-950">
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

      <div className="flex h-dvh w-full items-center justify-center px-6 pl-[104px] sm:px-10 sm:pl-[132px]">
        {currentCartoon && (
          <section
            className="relative h-dvh w-full max-w-125"
            style={{
              "--test-card-height": "clamp(320px, calc(100dvh - 132px), 390px)",
            }}
          >
            <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2">
              <GameCardShell
                key={currentCartoon.id}
                color={cardColorFor(currentCartoon)}
              />
            </div>

            <div
              className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-4"
              style={{
                top: "calc(50% + (var(--test-card-height) / 2) + 1.25rem)",
              }}
            >
              <button
                type="button"
                aria-label="Previous cartoon"
                title="Previous cartoon"
                onClick={goToPrevious}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:scale-[1.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/15"
              >
                <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} />
              </button>

              <div className="min-w-16 text-center text-base font-semibold text-zinc-500">
                {currentIndex + 1}/{orderedCartoons.length}
              </div>

              <button
                type="button"
                aria-label="Next cartoon"
                title="Next cartoon"
                onClick={goToNext}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:scale-[1.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/15"
              >
                <ChevronRight aria-hidden="true" size={22} strokeWidth={2.5} />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
