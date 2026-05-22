"use client";

import { useCallback, useRef } from "react";
import { clamp } from "@/lib/color";
import { playSliderRatchet } from "@/lib/sound";

export default function ColorSlider({
  label,
  value,
  min = 0,
  max = 100,
  gradient,
  onChange,
  valueText,
  trackClassName = "",
  handleClassName = "",
  showLabel = true,
}) {
  const trackRef = useRef(null);
  const lastSoundStepRef = useRef(null);
  const playChangeSound = useCallback(
    (nextValue) => {
      const range = max - min;
      if (range <= 0) return;
      if (Math.abs(nextValue - value) < range / 600) return;

      const position = (nextValue - min) / range;
      const soundStep = Math.round(position * 52);
      if (lastSoundStepRef.current === soundStep) return;

      lastSoundStepRef.current = soundStep;
      playSliderRatchet(position);
    },
    [max, min, value],
  );

  const updateFromPointer = useCallback(
    (event) => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const percent = clamp((rect.bottom - event.clientY) / rect.height, 0, 1);
      const nextValue = min + percent * (max - min);
      playChangeSound(nextValue);
      onChange(nextValue);
    },
    [max, min, onChange, playChangeSound],
  );

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  };

  const handleKeyDown = (event) => {
    const fineStep = max > 100 ? 2 : 1;
    const coarseStep = fineStep * 10;
    let nextValue = value;

    if (event.key === "ArrowUp" || event.key === "ArrowRight") nextValue += fineStep;
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") nextValue -= fineStep;
    if (event.key === "PageUp") nextValue += coarseStep;
    if (event.key === "PageDown") nextValue -= coarseStep;
    if (event.key === "Home") nextValue = min;
    if (event.key === "End") nextValue = max;

    const clampedValue = clamp(nextValue, min, max);

    if (clampedValue !== value) {
      event.preventDefault();
      playChangeSound(clampedValue);
      onChange(clampedValue);
    }
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        aria-valuetext={valueText || String(Math.round(value))}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateFromPointer(event);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`relative h-50.5 w-10 touch-none rounded-full border border-white/28 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_14px_28px_rgba(0,0,0,0.18)] outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:h-57.5 sm:w-11 ${trackClassName}`}
        style={{ background: gradient }}
      >
        <span
          className={`absolute left-1/2 grid size-8 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_8px_22px_rgba(0,0,0,0.26)] ${handleClassName}`}
          style={{ bottom: `${percentage}%` }}
          aria-hidden="true"
        >
          <span className="hidden" />
        </span>
      </div>
      {showLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/72">
          {label}
        </span>
      )}
    </div>
  );
}
