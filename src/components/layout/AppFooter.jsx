"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { playHomeToFooterExit } from "@/hooks/useFooterPageTransition";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { requestActiveGameExit } from "@/lib/gameNavigation";

export default function AppFooter() {
  const { locale, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    isTransitioningRef.current = false;
  }, [pathname]);
  const isLibraryRoute =
    pathname === "/cartoon-library" ||
    pathname === "/flag-library" ||
    pathname === "/brand-library";
  const isPrivacyRoute = pathname === "/privacy-policy";
  const isHowItWorksRoute = pathname === "/how-it-works";
  const isTestLabRoute = pathname === "/test-lab";
  const isCreditsRoute = pathname === "/credits";
  const family = pathname?.split("/").filter(Boolean)[0] || "color";
  const testPageLabel = locale === "tr" ? "test sayfası" : "test page";
  const howItWorksLabel = locale === "tr" ? "nasıl çalışır" : "how it works";
  const footerLinkClass = "pointer-events-auto text-[11px] font-medium lowercase tracking-wider text-zinc-500 no-underline transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-500 dark:hover:text-zinc-50";

  const handleFooterNavigation = async (event, href) => {
    event.preventDefault();
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    await requestActiveGameExit();
    clearAllGameSessions();

    const card = document.querySelector("[data-intro-card-target]");
    const content = document.querySelector("[data-route-transition-scope]");
    if (!card || !content) {
      router.push(href);
      return;
    }

    await playHomeToFooterExit(card, content);

    router.push(href);
  };

  if (isLibraryRoute || pathname === "/team-library" || isPrivacyRoute || isHowItWorksRoute || isTestLabRoute || isCreditsRoute) return null;

  return (
    <>
      <footer className="creator-tag pointer-events-none fixed bottom-4 left-4 z-40 max-w-[42%] truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500 sm:bottom-8 sm:left-8 sm:max-w-none sm:text-[11px]">
        {t("app.createdBy")}{" "}
        <a
          href="https://furkancosar.com"
          aria-label="Visit furkancosar"
          data-sound="off"
          className="creator-link pointer-events-auto relative inline-block text-inherit no-underline outline-none"
        >
          furkancosar
        </a>
      </footer>

      <div className="route-transition-footer pointer-events-auto fixed right-4 bottom-4 z-40 flex max-w-[54%] flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right sm:right-8 sm:bottom-8 sm:max-w-none sm:flex-nowrap sm:gap-5">
        <Link href={`/test-lab?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/test-lab?from=${family}`)} className={footerLinkClass}>
          {testPageLabel}
        </Link>
        <Link href={`/how-it-works?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/how-it-works?from=${family}`)} className={footerLinkClass}>
          {howItWorksLabel}
        </Link>
        <Link href={`/privacy-policy?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/privacy-policy?from=${family}`)} className={footerLinkClass}>
          {locale === "tr" ? "gizlilik politikası" : "privacy policy"}
        </Link>
        <Link href={`/credits?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/credits?from=${family}`)} className={footerLinkClass}>
          {locale === "tr" ? "emeği geçenler" : "credits"}
        </Link>
      </div>

    </>
  );
}
