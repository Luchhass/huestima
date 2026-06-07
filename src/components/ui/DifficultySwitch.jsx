"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { DIFFICULTY_OPTIONS } from "@/lib/constants";
import { playDifficultySelect } from "@/lib/sound";

export default function DifficultySwitch({
  value,
  onChange,
  onSelectFeedback,
  ariaLabel,
  disabled = false,
  className = "",
}) {
  const { t } = useTranslation();
  const [hoverIndex, setHoverIndex] = useState(null);
  const difficultyIndex = Math.max(
    DIFFICULTY_OPTIONS.findIndex((option) => option.id === value),
    0,
  );
  const visualIndex = disabled ? difficultyIndex : hoverIndex ?? difficultyIndex;

  const handleSelect = (optionId, optionIndex) => {
    if (disabled) return;

    playDifficultySelect(optionId, optionIndex);
    onSelectFeedback?.(optionId, optionIndex);

    if (optionId !== value) {
      onChange(optionId);
    }
  };

  return (
    <div
      className={`difficulty-switch card-control-frame card-action-height grid min-w-0 grid-cols-3 overflow-hidden p-1 ${
        disabled ? "difficulty-switch--locked" : ""
      } ${className}`}
      aria-label={ariaLabel || t("difficulty.label")}
      aria-disabled={disabled}
      onPointerLeave={() => setHoverIndex(null)}
      style={{ "--difficulty-index": visualIndex }}
    >
      <span className="difficulty-switch__thumb" aria-hidden="true" />
      {DIFFICULTY_OPTIONS.map((option, optionIndex) => {
        const selected = value === option.id;
        const visuallyActive = optionIndex === visualIndex;

        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onPointerEnter={() => setHoverIndex(optionIndex)}
            onFocus={() => setHoverIndex(optionIndex)}
            onBlur={() => setHoverIndex(null)}
            onClick={() => handleSelect(option.id, optionIndex)}
            className={`relative z-10 min-w-0 rounded-full px-0 text-[9px] font-semibold uppercase tracking-[0.035em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-2 sm:text-[11px] sm:tracking-[0.08em] ${
              visuallyActive
                ? "text-zinc-950"
                : disabled
                  ? "text-white/24"
                  : "text-white/62"
            } ${disabled ? "cursor-not-allowed" : ""}`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <span>{t(`difficulty.${option.id}`)}</span>
              {disabled && selected && (
                <Lock
                  className="size-2.5 shrink-0 sm:size-3"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
