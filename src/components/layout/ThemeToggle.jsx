"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={isDark ? t("toggles.themeLight") : t("toggles.themeDark")}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className="grid size-11 shrink-0 place-items-center rounded-full text-zinc-950 transition-transform duration-200 hover:scale-[1.06] active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50"
    >
      <span className="sr-only">{t("toggles.themeToggle")}</span>
      <Icon className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}
