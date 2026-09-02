"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import {
  playPageFade,
  playHomeToFooterExit,
  playCardToCardExit,
} from "@/hooks/useFooterPageTransition";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { requestActiveGameExit } from "@/lib/gameNavigation";

export default function AppFooter() {
  const { locale, t } = useTranslation();
  const pathname = usePathname();
  const [familyFromQuery] = useState(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("from");
  });
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
  const isTestRoute = pathname === "/test";
  const isCreditsRoute = pathname === "/credits";
  const isDownloadRoute = pathname === "/download";
  const isStandaloneCardRoute =
    pathname === "/notifications" || pathname === "/history";
  const pathnameFamily = pathname?.split("/").filter(Boolean)[0];
  const family = ["color", "flag", "cartoon", "brand", "team"].includes(familyFromQuery)
    ? familyFromQuery
    : ["color", "flag", "cartoon", "brand", "team"].includes(pathnameFamily)
      ? pathnameFamily
      : "color";
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

    if (pathname === "/notifications") {
      const notificationCard = document.querySelector("[data-notification-card]");
      if (notificationCard) {
        await playCardToCardExit(notificationCard, content, {
          targetExpanded: false,
          hideChrome: false,
        });
      }
    } else if (href.startsWith("/download")) {
      await playHomeToFooterExit(card, content, { scaleCard: false });
    } else if (href.startsWith("/history")) {
      await playPageFade(content, false);
    } else {
      await playHomeToFooterExit(card, content);
    }

    router.push(href);
  };

  if (pathname === "/admin" || pathname === "/admin/login" || pathname === "/maintenance" || isLibraryRoute || pathname === "/team-library" || isPrivacyRoute || isHowItWorksRoute || isTestRoute || isCreditsRoute || isDownloadRoute || isStandaloneCardRoute) return null;

  return (
    <>
      <footer data-maintenance-chrome={pathname === "/maintenance" ? "true" : undefined} className="hidden">
        {t("app.createdBy")}{" "}
        <a
          href="https://furkancosar.com"
          aria-label={t("common.visitCreator")}
          data-sound="off"
          className="creator-link pointer-events-auto relative inline-block text-inherit no-underline outline-none"
        >
          furkancosar
        </a>
      </footer>

      <nav data-sound-kind="navigation" data-maintenance-chrome={pathname === "/maintenance" ? "true" : undefined} className="route-transition-footer pointer-events-auto fixed right-4 bottom-4 z-40 text-right sm:right-8 sm:bottom-8">
        {[
          [
            [`/download?from=${family}`, locale === "tr" ? "uygulamayı indir" : "download app"],
            [`/history?from=${family}`, t("history.footerLink")],
          ],
          [
            [`/how-it-works?from=${family}`, howItWorksLabel],
            [`/privacy-policy?from=${family}`, locale === "tr" ? "gizlilik politikası" : "privacy policy"],
            [`/credits?from=${family}`, locale === "tr" ? "emeği geçenler" : "credits"],
          ],
        ].map((row, rowIndex) => (
          <div key={rowIndex} className="route-transition-footer-row">
            {row.map(([href, label], index) => (
              <span key={href} className="route-transition-footer-item">
                {index > 0 && <span className="route-transition-footer-separator" aria-hidden="true">·</span>}
                <Link href={href} onClick={(event) => void handleFooterNavigation(event, href)} className={footerLinkClass}>
                  {label}
                </Link>
              </span>
            ))}
          </div>
        ))}
      </nav>

    </>
  );
}
