"use client";

import { Lightbulb } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";

export default function HintToggleButton({
  enabled = true,
  onToggle,
  disabled = false,
  compact = false,
  className = "",
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? t("setup.hintsEnabled") : t("setup.hintsDisabled")}
      title={enabled ? t("setup.hintsEnabled") : t("setup.hintsDisabled")}
      disabled={disabled}
      onClick={() => onToggle?.(!enabled)}
      className={`card-action-height inline-flex min-w-0 items-center justify-center gap-2 rounded-full border-2 px-3 text-sm font-semibold leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-45 ${
        enabled
          ? "border-white bg-white text-zinc-950 shadow-[0_14px_26px_rgba(255,255,255,0.12)]"
          : "border-white/28 bg-transparent text-white/58 hover:border-white/46 hover:text-white/80"
      } ${compact ? "card-action-size px-0" : ""} ${className}`}
    >
      <Lightbulb className="relative z-10 size-4 shrink-0" strokeWidth={2.35} />
      {!compact && (
        <span className="relative z-10 min-w-0 truncate">
          {enabled ? t("setup.hintsOn") : t("setup.hintsOff")}
        </span>
      )}
    </button>
  );
}
