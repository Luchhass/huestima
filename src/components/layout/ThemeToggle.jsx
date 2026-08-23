"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={isDark ? t("toggles.themeLight") : t("toggles.themeDark")}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className="grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:opacity-70 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span className="sr-only">{t("toggles.themeToggle")}</span>
      <Icon className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
