"use client";

import { useLanguage } from "@/hooks/useLanguage";

export default function LanguageToggle() {
  const { nextLocale, toggleLanguage, t } = useLanguage();
  const label = t("toggles.languageTo", { language: nextLocale.toUpperCase() });

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={label}
      title={label}
      onClick={toggleLanguage}
      className="grid size-11 shrink-0 place-items-center rounded-full text-[0.96rem] font-semibold uppercase leading-none tracking-normal text-zinc-950 transition-transform duration-200 hover:scale-[1.06] active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span aria-hidden="true">{nextLocale.toUpperCase()}</span>
      <span className="sr-only">{t("toggles.language")}</span>
    </button>
  );
}
