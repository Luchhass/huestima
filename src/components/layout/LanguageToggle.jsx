"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { flushSync } from "react-dom";
import gsap from "gsap";
import {
  playScreenFadeOut,
  SCREEN_REVEAL_REPLAY_EVENT,
} from "@/hooks/useScreenReveal";
import { usePathname } from "next/navigation";
import { getLandingRoute, landingHref } from "../../../shared/landingRoutes.mjs";

let switchingLanguage = false;

export default function LanguageToggle() {
  const { locale, nextLocale, setLanguage, toggleLanguage, t } = useLanguage();
  const pathname = usePathname();
  const label = t("toggles.languageTo", { language: nextLocale.toUpperCase() });
  const route = getLandingRoute(pathname);

  const handleLanguageToggle = async (nextPath) => {
    if (switchingLanguage) return;
    switchingLanguage = true;
    const scope =
      document.querySelector("[data-route-transition-scope]") ||
      document.querySelector("[data-intro-card-target]") ||
      document.querySelector("main");

    try {
      if (!document.querySelector("[data-language-static]")) {
        await playScreenFadeOut(scope);
      }

      flushSync(() => {
        if (nextPath) {
          // Keep the mounted setup (including nested lobby forms) and its state.
          window.history.pushState(null, "", `${nextPath}${window.location.search}${window.location.hash}`);
          setLanguage(nextLocale);
        } else {
          toggleLanguage();
        }
      });
    } finally {
      // Reveal hooks own inner scopes; also release the actual faded ancestor.
      if (scope?.isConnected) gsap.set(scope, { clearProps: "opacity,visibility" });
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
      switchingLanguage = false;
    }
  };

  if (route) return (
    <a
      href={landingHref(route.family, nextLocale)}
      hrefLang={nextLocale}
      lang={nextLocale}
      aria-label={label} title={label}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        void handleLanguageToggle(landingHref(route.family, nextLocale));
      }}
      className="grid size-11 shrink-0 place-items-center rounded-full text-[1.08rem] font-semibold uppercase leading-none text-zinc-950 transition-opacity hover:opacity-70 focus-visible:ring-2 dark:text-zinc-50">
      {locale.toUpperCase()}
    </a>
  );

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
