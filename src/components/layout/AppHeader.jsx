"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { APP_NAME } from "@/lib/constants";
import { GAME_FAMILY_OPTIONS } from "@/lib/gameFamily";
import BrandLogoMark from "./BrandLogoMark";
import FullscreenToggle from "./FullscreenToggle";
import LanguageToggle from "./LanguageToggle";
import MusicToggle from "./MusicToggle";
import SoundToggle from "./SoundToggle";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "@/hooks/useLanguage";

export default function AppHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    isNavigatingRef.current = false;
  }, [pathname]);

  const playRouteTransition = async (href) => {
    const scope =
      document.querySelector("[data-route-transition-scope]") ||
      document.querySelector("[data-intro-card-target]") ||
      document.querySelector("main");

    if (!scope || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    await gsap.to(scope, {
      autoAlpha: 0,
      x: 28,
      duration: 0.24,
      ease: "power2.inOut",
      overwrite: true,
    });

    router.push(href);
  };

  const handleFamilyNavigation = (event, href, active) => {
    if (active) {
      setIsNavOpen(false);
      return;
    }

    if (isNavigatingRef.current) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    isNavigatingRef.current = true;
    setIsNavOpen(false);

    void playRouteTransition(href);
  };

  return (
    <header
      className="app-header pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-6 sm:p-8"
      data-nav-open={isNavOpen ? "true" : undefined}
    >
      {isNavOpen && (
        <div className="pointer-events-auto fixed inset-0 z-0 bg-white/96 p-6 text-zinc-950 backdrop-blur-xl dark:bg-black/94 dark:text-white sm:p-8 md:hidden">
          <nav
            aria-label={t("gameFamily.label")}
            className="flex h-full flex-col items-start gap-3 pt-28 text-[clamp(2.85rem,13vw,4.9rem)] font-semibold leading-[0.96] tracking-normal"
          >
            {GAME_FAMILY_OPTIONS.map((option) => {
              const active =
                pathname === option.href || pathname?.startsWith(`${option.href}/`);

              return (
                <Link
                  key={option.id}
                  href={option.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) =>
                    handleFamilyNavigation(event, option.href, active)
                  }
                  className={`transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                    active
                      ? "text-zinc-950 dark:text-white"
                      : "text-zinc-950/34 hover:text-zinc-950 dark:text-white/34 dark:hover:text-white"
                  }`}
                >
                  {t(`gameFamily.${option.id}`)}
                </Link>
              );
            })}

            <div className="mt-auto flex items-center gap-1 pb-1">
              <LanguageToggle />
              <SoundToggle />
              <MusicToggle />
              <ThemeToggle />
              <FullscreenToggle />
            </div>
          </nav>
        </div>
      )}

      <div className="pointer-events-auto relative z-10 flex h-11 items-center gap-6">
        <Link
          href="/color"
          aria-label={t("app.homeAria")}
          data-sound="off"
          className="app-header__brand inline-flex h-11 items-center gap-3 rounded-full text-[15px] font-semibold uppercase tracking-normal text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 sm:text-base"
        >
          <BrandLogoMark />
          <span>{APP_NAME}</span>
        </Link>

        <nav
          aria-label={t("gameFamily.label")}
          className="hidden items-center gap-5 text-[13px] font-semibold uppercase tracking-normal text-zinc-950/42 dark:text-white/42 md:inline-flex"
        >
          {GAME_FAMILY_OPTIONS.map((option) => {
            const active =
              pathname === option.href || pathname?.startsWith(`${option.href}/`);

            return (
              <Link
                key={option.id}
                href={option.href}
                aria-current={active ? "page" : undefined}
                data-sound="off"
                onClick={(event) =>
                  handleFamilyNavigation(event, option.href, active)
                }
                className={`relative inline-flex h-8 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                  active
                    ? "text-zinc-950 dark:text-white"
                    : "hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                {t(`gameFamily.${option.id}`)}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-zinc-950 dark:bg-white"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="header-controls pointer-events-auto relative z-10 inline-flex h-11 items-center justify-end gap-1">
        <div className="hidden items-center gap-1 md:inline-flex">
          <LanguageToggle />
          <SoundToggle />
          <MusicToggle />
          <ThemeToggle />
          <FullscreenToggle />
        </div>

        <button
          type="button"
          aria-label={isNavOpen ? t("common.closeMenu") : t("common.openMenu")}
          aria-expanded={isNavOpen}
          onClick={() => setIsNavOpen((value) => !value)}
          className="grid size-11 place-items-center rounded-full text-zinc-950 transition hover:opacity-62 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-50 md:hidden"
        >
          <span className="sr-only">
            {isNavOpen ? t("common.closeMenu") : t("common.openMenu")}
          </span>
          {isNavOpen ? (
            <X size={29} strokeWidth={2.15} />
          ) : (
            <Menu size={30} strokeWidth={2.15} />
          )}
        </button>
      </div>
    </header>
  );
}
