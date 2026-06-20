"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { DEFAULT_ROUND_COUNT, ROUND_COUNT_OPTIONS } from "@/lib/constants";
import { normalizeRoundCount } from "@/lib/roundCount";

export default function LevelCountPicker({
  value = DEFAULT_ROUND_COUNT,
  onChange,
  disabled = false,
  className = "",
}) {
  const { t } = useTranslation();
  const [hoverIndex, setHoverIndex] = useState(null);
  const selectedRoundCount = normalizeRoundCount(value);
  const selectedIndex = Math.max(
    ROUND_COUNT_OPTIONS.findIndex((option) => option === selectedRoundCount),
    0,
  );
  const visualIndex = disabled ? selectedIndex : hoverIndex ?? selectedIndex;

  const commitIndex = (nextIndex) => {
    if (disabled) return;

    const nextRoundCount = ROUND_COUNT_OPTIONS[nextIndex];
    if (!nextRoundCount || nextRoundCount === selectedRoundCount) return;

    onChange?.(nextRoundCount);
  };

  return (
    <div
      className={`level-count-picker card-control-frame card-action-height grid w-full min-w-0 grid-cols-4 items-center overflow-hidden p-1 text-white ${
        disabled ? "opacity-45" : ""
      } ${className}`}
      aria-label={t("levelCount.label")}
      aria-disabled={disabled}
      onPointerLeave={() => setHoverIndex(null)}
      style={{ "--level-count-index": visualIndex }}
    >
      <span className="level-count-picker__thumb" aria-hidden="true" />
      {ROUND_COUNT_OPTIONS.map((option, optionIndex) => {
        const selected = option === selectedRoundCount;
        const visuallyActive = optionIndex === visualIndex;

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={t("levelCount.option", { count: option })}
            onPointerEnter={() => setHoverIndex(optionIndex)}
            onFocus={() => setHoverIndex(optionIndex)}
            onBlur={() => setHoverIndex(null)}
            onClick={() => commitIndex(optionIndex)}
            className={`relative z-10 h-full min-w-0 rounded-full text-[0.92rem] font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed sm:text-base ${
              visuallyActive
                ? "text-zinc-950"
                : disabled
                  ? "text-white/24"
                  : "text-white/62"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
