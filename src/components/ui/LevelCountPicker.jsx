"use client";

import { useId, useRef } from "react";
import { Infinity } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { DEFAULT_ROUND_COUNT, ROUND_COUNT_OPTIONS } from "@/lib/constants";
import { normalizeRoundCount } from "@/lib/roundCount";
import { playLevelCountStep } from "@/lib/sound";

function clampIndex(index) {
  return Math.min(
    Math.max(index, 0),
    Math.max(ROUND_COUNT_OPTIONS.length - 1, 0),
  );
}

export default function LevelCountPicker({
  value = DEFAULT_ROUND_COUNT,
  onChange,
  isEndless = false,
  disabled = false,
  className = "",
  onImpact,
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const pickerRef = useRef(null);
  const selectedRoundCount = normalizeRoundCount(value);
  const selectedIndex = clampIndex(
    ROUND_COUNT_OPTIONS.findIndex((option) => option === selectedRoundCount),
  );
  const thumbProgress =
    isEndless
      ? 1
      : ROUND_COUNT_OPTIONS.length > 1
      ? selectedIndex / (ROUND_COUNT_OPTIONS.length - 1)
      : 0;
  const thumbLeft = `calc(${thumbProgress} * (100% - var(--level-count-thumb-size)) + (var(--level-count-thumb-size) / 2))`;
  const railProgress = `${thumbProgress * 100}%`;

  const handleIndexChange = (nextIndex) => {
    if (disabled || isEndless) return;

    const clampedIndex = clampIndex(nextIndex);
    const nextRoundCount = ROUND_COUNT_OPTIONS[clampedIndex];
    if (!nextRoundCount || nextRoundCount === selectedRoundCount) return;

    const direction = Math.sign(clampedIndex - selectedIndex) || 1;
    const rect = pickerRef.current?.getBoundingClientRect();
    const progress = ROUND_COUNT_OPTIONS.length > 1
      ? clampedIndex / (ROUND_COUNT_OPTIONS.length - 1)
      : 0;
    onImpact?.({
      index: clampedIndex,
      count: nextRoundCount,
      direction,
      clientX: rect ? rect.left + rect.width * progress : undefined,
      clientY: rect ? rect.top + rect.height / 2 : undefined,
    });
    playLevelCountStep(clampedIndex, ROUND_COUNT_OPTIONS.length);
    onChange?.(nextRoundCount);
  };

  return (
    <div
      ref={pickerRef}
      className={`level-count-picker card-control-frame card-action-height relative w-full min-w-0 overflow-hidden rounded-full p-1 text-white ${
        disabled ? "opacity-45" : ""
      } ${className}`}
      aria-disabled={disabled}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("levelCount.label")}
      </label>

      <div className="relative h-full w-full">
        <div className="relative h-full w-full">
          <div
            aria-hidden="true"
            className="level-count-picker__rail"
          >
            <span className="level-count-picker__rail-track" />
            <span
              className="level-count-picker__rail-progress transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: railProgress }}
            />
          </div>

          <input
            id={inputId}
            type="range"
          min="0"
          max={String(ROUND_COUNT_OPTIONS.length - 1)}
          step="1"
          value={selectedIndex}
          disabled={disabled || isEndless}
          onChange={(event) => {
            handleIndexChange(Number(event.target.value));
          }}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-label={t("levelCount.label")}
          aria-valuetext={
            isEndless
              ? t("levelCount.infinity")
              : t("levelCount.option", { count: selectedRoundCount })
          }
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            aria-hidden="true"
            className="level-count-picker__thumb absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[1.02rem] font-black leading-none text-zinc-950 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: thumbLeft }}
          >
              {isEndless ? <Infinity className="size-[1.1em]" strokeWidth={2.4} /> : selectedRoundCount}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
