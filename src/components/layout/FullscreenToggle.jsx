"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { FULLSCREEN_LOCK_CHANGE_EVENT } from "@/hooks/useFlagFullscreenLock";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { useTranslation } from "@/hooks/useLanguage";

function readFullscreenLock() {
  if (typeof document === "undefined") return false;

  return document.documentElement.dataset.fullscreenLocked === "true";
}

export default function FullscreenToggle({ disabled = false }) {
  const { t } = useTranslation();
  const { isFullscreen, toggleFullscreen } = useFullscreenMode();
  const [isLocked, setIsLocked] = useState(false);
  const Icon = isFullscreen ? Minimize2 : Maximize2;
  const isDisabled = disabled || isLocked;
  const label = disabled
    ? t("toggles.fullscreenUnavailable")
    : isLocked
    ? t("toggles.fullscreenLocked")
    : isFullscreen
    ? t("toggles.fullscreenExit")
    : t("toggles.fullscreenEnter");

  useEffect(() => {
    const syncLock = () => setIsLocked(readFullscreenLock());

    syncLock();
    window.addEventListener(FULLSCREEN_LOCK_CHANGE_EVENT, syncLock);

    const observer = new MutationObserver(syncLock);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-fullscreen-locked"],
    });

    return () => {
      window.removeEventListener(FULLSCREEN_LOCK_CHANGE_EVENT, syncLock);
      observer.disconnect();
    };
  }, []);

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={label}
      aria-pressed={isFullscreen}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      title={label}
      onClick={() => {
        if (isDisabled) return;
        toggleFullscreen();
      }}
      className={`fullscreen-toggle grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 ${
        isDisabled
          ? "cursor-not-allowed opacity-30"
          : "hover:scale-[1.04] hover:opacity-70 active:scale-[0.96]"
      }`}
    >
      <span className="sr-only">{t("toggles.fullscreenToggle")}</span>
      <Icon className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
