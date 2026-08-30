"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";

export default function LanguageToggle() {
  const { locale, nextLocale, toggleLanguage, t } = useLanguage();
  const label = t("toggles.languageTo", { language: nextLocale.toUpperCase() });

  const handleLanguageToggle = async () => {
    const scope =
      document.querySelector("[data-route-transition-scope]") ||
      document.querySelector("[data-intro-card-target]") ||
      document.querySelector("main");

    if (!document.querySelector("[data-language-static]")) {
      await playScreenFadeOut(scope, { duration: 0.28 });
    }
    toggleLanguage();
  };

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={label}
      title={label}
      onClick={() => {
        void handleLanguageToggle();
      }}
      className="grid size-11 shrink-0 place-items-center rounded-full text-[1.08rem] font-semibold uppercase leading-none tracking-normal text-zinc-950 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:opacity-70 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span aria-hidden="true">{locale.toUpperCase()}</span>
      <span className="sr-only">{t("toggles.language")}</span>
    </button>
  );
}
