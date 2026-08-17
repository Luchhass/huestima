"use client";

import { User, UsersRound } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";

function DisabledModeButton({ icon: Icon, label }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={label}
      className="pointer-events-none grid size-14 place-items-center rounded-full bg-white/18 text-white/82 opacity-70 ring-1 ring-white/16 sm:size-16"
    >
      <Icon size={27} strokeWidth={2.1} />
    </button>
  );
}

export default function ComingSoonCard({ title, paragraphs = [] }) {
  const { t } = useTranslation();

  return (
    <div className="home-view-panel flex h-full flex-col">
      <div
        data-screen-reveal
        className="home-view-copy home-coming-soon-copy w-[min(35rem,calc(100%-3.75rem))] sm:w-[min(35rem,calc(100%-5.5rem))]"
      >
        <h1 className="text-[clamp(2.75rem,10vw,4.2rem)] font-semibold lowercase leading-[0.9] tracking-normal text-white/92 sm:text-[4.65rem]">
          {title}
        </h1>

        <div className="mt-3.5 max-w-[35.5rem] space-y-4">
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-[0.92rem] font-medium leading-[1.28] text-white/74 sm:text-[0.98rem]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div data-screen-reveal className="home-view-actions mt-auto w-full">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
          {t("home.modeDefault")}
        </div>

        <div className="flex items-end justify-start gap-4 opacity-55 grayscale">
          <DisabledModeButton icon={User} label={t("home.singleAria")} />
          <DisabledModeButton icon={UsersRound} label={t("home.multiAria")} />
        </div>
      </div>
    </div>
  );
}
