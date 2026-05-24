"use client";

import { useRef } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { useScreenReveal } from "@/hooks/useScreenReveal";

export default function WaitingCard({ message }) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);

  useScreenReveal(scopeRef, []);

  return (
    <div ref={scopeRef} className="flex h-full flex-col bg-black p-6 text-white sm:p-8">
      <div data-screen-reveal className="max-w-92">
        <h1 className="text-5xl font-semibold lowercase leading-[0.9] tracking-normal text-white sm:text-[4.3rem]">
          {t("room.doneTitleA")}
          <br />
          {t("room.doneTitleB")}
        </h1>
        <p className="mt-5 text-[0.98rem] font-medium leading-tight text-white/82 sm:text-base">
          {t("room.doneWaiting")}
        </p>
      </div>

      <p data-screen-reveal className="mt-auto min-h-5 text-sm font-semibold text-white/52">
        <span className="block">{message}</span>
      </p>
    </div>
  );
}
