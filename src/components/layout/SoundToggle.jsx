"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useSoundPreference } from "@/hooks/useSoundPreference";

export default function SoundToggle() {
  const { t } = useTranslation();
  const { isSoundEnabled, toggleSound } = useSoundPreference();
  const Icon = isSoundEnabled ? Volume2 : VolumeX;

  return (
    <button
      type="button"
      aria-label={isSoundEnabled ? t("toggles.soundOff") : t("toggles.soundOn")}
      aria-pressed={isSoundEnabled}
      onClick={toggleSound}
      className="grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:opacity-70 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span className="sr-only">{t("toggles.soundToggle")}</span>
      <Icon className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
