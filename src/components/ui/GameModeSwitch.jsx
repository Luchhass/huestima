"use client";

import { useState } from "react";
import { Eye, Layers, Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { GAME_MODE_OPTIONS } from "@/lib/constants";
import { playGameModeSelect } from "@/lib/sound";

const GAME_MODE_ICONS = {
  normal: Eye,
  flash: Zap,
  sequence: Layers,
};

export default function GameModeSwitch({
  value,
  onChange,
  ariaLabel,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [hoverIndex, setHoverIndex] = useState(null);

  const selectedIndex = Math.max(
    GAME_MODE_OPTIONS.findIndex((option) => option.id === value),
    0,
  );
  const visualIndex = disabled ? selectedIndex : hoverIndex ?? selectedIndex;

  const handleSelect = (optionId, optionIndex) => {
    if (disabled || optionId === value) return;

    playGameModeSelect(optionId, optionIndex);
    onChange(optionId);
  };

  return (
    <div
      className="game-mode-switch card-control-frame card-action-height grid min-w-0 grid-cols-3 overflow-hidden p-1"
      aria-label={ariaLabel || t("gameMode.label")}
      onPointerLeave={() => setHoverIndex(null)}
      style={{ "--game-mode-index": visualIndex }}
    >
      <span className="game-mode-switch__thumb" aria-hidden="true" />

      {GAME_MODE_OPTIONS.map((option, optionIndex) => {
        const selected = value === option.id;
        const visuallyActive = optionIndex === visualIndex;
        const Icon = GAME_MODE_ICONS[option.id];
        const optionLabel = t(`gameMode.${option.id}`);

        return (
          <button
            key={option.id}
            type="button"
            title={optionLabel}
            aria-label={optionLabel}
            aria-pressed={selected}
            disabled={disabled}
            onPointerEnter={() => setHoverIndex(optionIndex)}
            onFocus={() => setHoverIndex(optionIndex)}
            onBlur={() => setHoverIndex(null)}
            onClick={() => handleSelect(option.id, optionIndex)}
            className={`relative z-10 grid min-w-0 place-items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
              visuallyActive ? "text-zinc-950" : "text-white/62"
            } ${disabled ? "cursor-default" : ""}`}
          >
            <Icon className="size-4.5 sm:size-5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
