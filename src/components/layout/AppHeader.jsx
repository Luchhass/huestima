"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import BrandLogoMark from "./BrandLogoMark";
import FullscreenToggle from "./FullscreenToggle";
import LanguageToggle from "./LanguageToggle";
import MusicToggle from "./MusicToggle";
import SoundToggle from "./SoundToggle";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "@/hooks/useLanguage";

export default function AppHeader() {
  const { t } = useTranslation();

  return (
    <header className="app-header pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-6 sm:p-8">
      <Link
        href="/"
        aria-label={t("app.homeAria")}
        data-sound="off"
        className="app-header__brand pointer-events-auto inline-flex h-11 items-center gap-3 rounded-full text-[15px] font-semibold uppercase tracking-normal text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 sm:text-base"
      >
        <BrandLogoMark />
        <span>{APP_NAME}</span>
      </Link>

      <div className="header-controls pointer-events-auto inline-flex h-11 items-center justify-end gap-1">
        <LanguageToggle />
        <SoundToggle />
        <MusicToggle />
        <ThemeToggle />
        <FullscreenToggle />
      </div>
    </header>
  );
}
