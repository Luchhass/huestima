"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import FlagOverlay from "@/components/ui/game/FlagOverlay";
import { getVisualLabel, withFlagHex } from "@/lib/color";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function FlagPreviewCard({ color }) {
  const { locale } = useTranslation();

  return (
    <article className="flex flex-col gap-3">
      <div className="relative aspect-[3/2] overflow-hidden rounded-[22px] bg-black shadow-[0_14px_34px_rgba(31,25,20,0.16),0_6px_14px_rgba(31,25,20,0.08)]">
        <FlagOverlay color={color} />
      </div>
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-bold text-zinc-900">
          {getVisualLabel(color, locale)}
        </h2>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {color.slots.length} slot
        </span>
      </div>
    </article>
  );
}

export default function FlagTester({ flags }) {
  const [hue, setHue] = useState(210);
  const renderHue = useDeferredValue(hue);
  const paintColor = `hsl(${hue} 95% 52%)`;

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

  const orderedFlags = useMemo(
    () => [...flags].sort((left, right) => left.label.localeCompare(right.label)),
    [flags],
  );

  const previewFlags = useMemo(
    () =>
      orderedFlags.map((flag) => {
        const baseColor = withFlagHex({ flagId: flag.id });
        const activeSlotId = baseColor.slots[0]?.id;

        return withFlagHex({
          flagId: flag.id,
          activeSlotId,
          h: renderHue,
          s: baseColor.s,
          v: baseColor.v,
        });
      }),
    [orderedFlags, renderHue],
  );

  return (
    <div className="w-full overflow-x-hidden bg-white text-zinc-950">
      <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
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

        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Flag Test
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Project Flag Library
            </h1>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {previewFlags.length} flags
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {previewFlags.map((flag) => (
            <FlagPreviewCard key={flag.flagId} color={flag} />
          ))}
        </div>
      </div>
    </div>
  );
}
