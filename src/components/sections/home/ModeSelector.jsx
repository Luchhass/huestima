"use client";

import { useState } from "react";
import { User, UsersRound } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";

export default function ModeSelector({ onSingleplayer, onMultiplayer }) {
  const { t } = useTranslation();
  const [labelKey, setLabelKey] = useState("home.modeDefault");
  const defaultLabelKey = "home.modeDefault";

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="h-4 text-left text-[10px] font-semibold uppercase tracking-widest text-white">
        {t(labelKey)}
      </p>

      <div className="flex items-end justify-start gap-4">
        <div
          onPointerEnter={() => setLabelKey("home.modeSingle")}
          onPointerLeave={() => setLabelKey(defaultLabelKey)}
          onFocus={() => setLabelKey("home.modeSingle")}
          onBlur={() => setLabelKey(defaultLabelKey)}
        >
          <button
            type="button"
            onClick={onSingleplayer}
            aria-label={t("home.singleAria")}
            title={t("home.singleTitle")}
            className="rgb-hover-button card-action-size grid place-items-center rounded-full bg-white text-zinc-950 shadow-[0_16px_30px_rgba(0,0,0,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <User className="relative z-10" size={27} strokeWidth={2.15} />
          </button>
        </div>

        <div
          onPointerEnter={() => setLabelKey("home.modeMulti")}
          onPointerLeave={() => setLabelKey(defaultLabelKey)}
          onFocus={() => setLabelKey("home.modeMulti")}
          onBlur={() => setLabelKey(defaultLabelKey)}
        >
          <button
            type="button"
            onClick={onMultiplayer}
            aria-label={t("home.multiAria")}
            title={t("home.multiTitle")}
            className="rgb-hover-button card-action-size grid place-items-center rounded-full bg-white text-zinc-950 shadow-[0_16px_30px_rgba(0,0,0,0.24)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <UsersRound className="relative z-10" size={28} strokeWidth={2.1} />
          </button>
        </div>
      </div>
    </div>
  );
}
