"use client";

import { useRef } from "react";
import GameCardShell from "@/components/ui/game/GameCardShell";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import { useTranslation } from "@/hooks/useLanguage";

export default function MaintenancePage() {
  const { locale, t } = useTranslation();
  const scopeRef = useRef(null);

  useScreenReveal(scopeRef, [locale], { delay: 240 });

  return (
    <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
      <GameCardShell color={null} data-intro-card-target>
      <div
        ref={scopeRef}
        data-route-transition-scope
        className="flex h-full flex-col bg-black p-6 text-white sm:p-8"
      >
        <div data-screen-reveal className="max-w-105">
          <h1 className="text-[clamp(2.8rem,10vw,4.4rem)] font-semibold leading-[0.9] tracking-[-0.045em]">
            {t("maintenance.title")}
          </h1>
        </div>

        <div data-screen-reveal className="mt-auto max-w-105 pt-5">
          <p className="text-sm font-medium leading-[1.4] text-white/70 sm:text-base">
            {t("maintenance.message")}
          </p>
        </div>
      </div>
      </GameCardShell>
    </main>
  );
}
