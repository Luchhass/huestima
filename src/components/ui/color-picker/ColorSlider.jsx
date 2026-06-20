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
  orientation = "vertical",
}) {
  const trackRef = useRef(null);
  const lastSoundStepRef = useRef(null);
  const isHorizontal = orientation === "horizontal";
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
      const percent = isHorizontal
        ? clamp((event.clientX - rect.left) / rect.width, 0, 1)
        : clamp((rect.bottom - event.clientY) / rect.height, 0, 1);
      const nextValue = min + percent * (max - min);
      playChangeSound(nextValue);
      onChange(nextValue);
    },
    [isHorizontal, max, min, onChange, playChangeSound],
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
  const orientedGradient = isHorizontal
    ? String(gradient).replace("to top", "to right")
    : gradient;
  const handlePositionStyle = isHorizontal
    ? { left: `${percentage}%` }
    : { bottom: `${percentage}%` };

  return (
    <div className={isHorizontal ? "flex w-full flex-col gap-2" : "flex h-full w-full flex-col items-center gap-3"}>
      <div
        ref={trackRef}
        role="slider"
        aria-orientation={isHorizontal ? "horizontal" : "vertical"}
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
        style={{ background: orientedGradient }}
      >
        <span
          className={`absolute grid size-8 place-items-center rounded-full bg-white shadow-[0_8px_22px_rgba(0,0,0,0.26)] ${
            isHorizontal
              ? "top-1/2 -translate-x-1/2 -translate-y-1/2"
              : "left-1/2 -translate-x-1/2 translate-y-1/2"
          } ${handleClassName}`}
          style={handlePositionStyle}
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
