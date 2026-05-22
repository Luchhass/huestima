"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { useTranslation } from "@/hooks/useLanguage";

export default function FullscreenToggle() {
  const { t } = useTranslation();
  const { isFullscreen, toggleFullscreen } = useFullscreenMode();
  const Icon = isFullscreen ? Minimize2 : Maximize2;
  const label = isFullscreen
    ? t("toggles.fullscreenExit")
    : t("toggles.fullscreenEnter");

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={label}
      aria-pressed={isFullscreen}
      title={label}
      onClick={toggleFullscreen}
      className="grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition-transform duration-200 hover:scale-[1.06] active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span className="sr-only">{t("toggles.fullscreenToggle")}</span>
      <Icon className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
