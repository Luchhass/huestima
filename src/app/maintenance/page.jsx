"use client";

import { useRef } from "react";
import RoomCardShell from "@/components/sections/room/RoomCardShell";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import { useTranslation } from "@/hooks/useLanguage";

export default function MaintenancePage() {
  const { t } = useTranslation();
  const scopeRef = useRef(null);

  useScreenReveal(scopeRef, []);

  return (
    <RoomCardShell>
      <div
        ref={scopeRef}
        data-route-transition-scope
        className="flex h-full flex-col bg-black p-6 text-white sm:p-8"
      >
        <div data-screen-reveal className="max-w-105">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Huestima
          </p>
          <h1 className="mt-4 text-[clamp(2.8rem,10vw,4.4rem)] font-semibold leading-[0.9] tracking-[-0.045em]">
            {t("maintenance.title")}
          </h1>
        </div>

        <div data-screen-reveal className="mt-auto max-w-105 border-t border-white/15 pt-5">
          <p className="text-sm font-medium leading-[1.4] text-white/70 sm:text-base">
            {t("maintenance.message")}
          </p>
        </div>
      </div>
    </RoomCardShell>
  );
}
