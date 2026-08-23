"use client";

import { Music4 } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useMusicPreference } from "@/hooks/useMusicPreference";

export default function MusicToggle() {
  const { t } = useTranslation();
  const { isMusicEnabled, toggleMusic } = useMusicPreference();

  return (
    <button
      type="button"
      aria-label={isMusicEnabled ? t("toggles.musicOff") : t("toggles.musicOn")}
      aria-pressed={isMusicEnabled}
      onClick={toggleMusic}
      className="grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:opacity-70 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span className="sr-only">{t("toggles.musicToggle")}</span>
      <span className="relative grid place-items-center">
        <Music4 className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
        {!isMusicEnabled && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-[2px] w-7 rotate-[-45deg] rounded-full bg-current"
          />
        )}
      </span>
    </button>
  );
}
