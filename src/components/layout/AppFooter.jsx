"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import {
  getRouteCardKind,
  getRenderedCardKind,
  playHomeToFooterExit,
  playCardToCardExit,
  markCardRouteTransition,
  requestLandingExit,
  useFooterChromeReturn,
} from "@/hooks/useFooterPageTransition";
import { clearAllGameSessions } from "@/hooks/useGameSession";
import { requestActiveGameExit } from "@/lib/gameNavigation";
import BrandLogoMark from "./BrandLogoMark";
import { useViewportSectionTheme } from "@/hooks/useViewportSectionTheme";

const getFooterThemeSampleY = () =>
  (window.visualViewport?.height || window.innerHeight) - 40;

export default function AppFooter() {
  const { locale, t } = useTranslation();
  const pathname = usePathname()?.replace(/^\/tr(?=\/)/, "");
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
  const isHowItWorksRoute = pathname === "/how-it-works" || pathname === "/game-guide";
  const isTestRoute = pathname === "/test";
  const isCreditsRoute = pathname === "/credits";
  const isDownloadRoute = pathname === "/download";
  const isCartoonHomeRoute = pathname === "/cartoon";
  const isStandaloneCardRoute =
    pathname === "/notifications" || pathname === "/history";
  const landingFooterTheme = useViewportSectionTheme({
    attribute: "data-footer-theme",
    defaultTheme: "dark",
    enabled: pathname === "/",
    routeKey: pathname,
    sampleY: getFooterThemeSampleY,
    scrollSelector: ".landing-page",
  });

  useFooterChromeReturn(pathname, ".route-transition-footer");
  const pathnameFamily = pathname?.split("/").filter(Boolean)[0];
  const family = ["color", "flag", "cartoon", "brand", "team"].includes(familyFromQuery)
    ? familyFromQuery
    : ["color", "flag", "cartoon", "brand", "team"].includes(pathnameFamily)
      ? pathnameFamily
      : "color";
  const howItWorksLabel = locale === "tr" ? "nasıl çalışır" : "how it works";
  const footerLinkClass = "pointer-events-auto text-[11px] font-medium lowercase tracking-wider text-zinc-500 no-underline transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-500 dark:hover:text-zinc-50";
  const footerRows = [
    [
      ...(isCartoonHomeRoute
        ? [[`/how-it-works?from=${family}`, howItWorksLabel]]
        : []),
      [`/download?from=${family}`, locale === "tr" ? "uygulamayı indir" : "download app"],
    ],
    [
      [`/privacy-policy?from=${family}`, locale === "tr" ? "gizlilik politikası" : "privacy policy"],
      [`/credits?from=${family}`, locale === "tr" ? "emeği geçenler" : "credits"],
    ],
  ];

  const handleFooterNavigation = async (event, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const targetPath = href.split("?")[0];
    markCardRouteTransition(href);

    if (pathname === "/") {
      const handled = await requestLandingExit(href);
      if (handled) {
        router.push(href);
        return;
      }
    }

    await requestActiveGameExit();
    clearAllGameSessions();

    const card = document.querySelector("[data-intro-card-target]");
    const content = document.querySelector("[data-route-transition-scope]");
    if (!card || !content) {
      router.push(href);
      return;
    }

    const sourceCardKind = getRouteCardKind(pathname);
    const targetCardKind = getRouteCardKind(href);
    const renderedSourceCardKind = getRenderedCardKind(card, pathname);
    markCardRouteTransition(href, renderedSourceCardKind);

    if (["/how-it-works", "/game-guide", "/privacy-policy", "/credits"].includes(targetPath)) {
      await playHomeToFooterExit(card, content, { scaleCard: false, hideChrome: true });
    } else if (
      !["/how-it-works", "/privacy-policy", "/credits"].includes(targetPath) &&
      (renderedSourceCardKind === "large" || sourceCardKind === "download") &&
      targetCardKind === "fullscreen"
    ) {
      await playCardToCardExit(card, content, {
        targetExpanded: false,
        hideChrome: true,
      });
    } else if (pathname === "/notifications") {
      const notificationCard = document.querySelector("[data-notification-card]");
      if (notificationCard) {
        await playCardToCardExit(notificationCard, content, {
          targetExpanded: /^\/(color|flag|cartoon|brand|team)(\?|$)/.test(href) ? false : true,
          hideChrome: false,
        });
      }
    } else if (["/how-it-works", "/privacy-policy", "/credits"].includes(targetPath)) {
      await playHomeToFooterExit(card, content, {
        scaleCard: false,
        expandCard: true,
        hideChrome: true,
      });
    } else if (href.startsWith("/download")) {
      await playHomeToFooterExit(card, content, {
        scaleCard: false,
        hideChrome: false,
      });
    } else if (href.startsWith("/history")) {
      await playHomeToFooterExit(card, content, {
        scaleCard: false,
        expandCard: false,
        hideChrome: false,
      });
    } else {
      await playHomeToFooterExit(card, content, {
        scaleCard: false,
        expandCard: false,
        hideChrome: true,
      });
    }

    router.push(href);
  };

  if (pathname === "/admin" || pathname === "/admin/login" || pathname === "/maintenance" || isLibraryRoute || pathname === "/team-library" || isPrivacyRoute || isHowItWorksRoute || isTestRoute || isCreditsRoute) return null;

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

      <nav data-sound-kind="navigation" data-maintenance-chrome={pathname === "/maintenance" ? "true" : undefined} data-landing-chrome={pathname === "/" ? "true" : undefined} data-landing-theme={pathname === "/" ? landingFooterTheme : undefined} className="route-transition-footer pointer-events-auto fixed right-4 bottom-4 z-40 hidden text-right sm:right-8 sm:bottom-8 sm:flex">
        {footerRows.map((row, rowIndex) => (
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

      <div data-landing-chrome={pathname === "/" ? "true" : undefined} data-landing-theme={pathname === "/" ? landingFooterTheme : undefined} className="route-transition-footer route-transition-footer__brand-groups pointer-events-none fixed bottom-4 left-4 z-40 hidden items-center text-[11px] font-medium text-zinc-500 sm:flex sm:bottom-8 sm:left-8">
        <span className="pointer-events-auto inline-flex items-center gap-2">
          <BrandLogoMark className="size-4" centerClassName="size-[42%]" />
          <span className="route-transition-footer__adaptive-text">huestima.com</span>
        </span>
        <span className="route-transition-footer__adaptive-text">© 2026 Huestima All rights reserved</span>
      </div>

      <div
        data-landing-chrome={pathname === "/" ? "true" : undefined}
        data-landing-theme={pathname === "/" ? landingFooterTheme : undefined}
        className="app-mobile-footer pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 flex items-end justify-between gap-3 text-[10px] font-medium tracking-[0.025em] text-zinc-500 sm:hidden"
      >
        <div className="flex max-w-[55%] min-w-0 flex-col items-start gap-1.5 text-left leading-tight">
          <span className="pointer-events-auto inline-flex items-center gap-2 whitespace-nowrap">
            <BrandLogoMark className="size-4" centerClassName="size-[42%]" />
            <span>huestima.com</span>
          </span>
          <span>© 2026 All rights reserved</span>
        </div>
        <nav
          data-sound-kind="navigation"
          className="pointer-events-auto flex max-w-[45%] min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right"
          aria-label={locale === "tr" ? "Alt bağlantılar" : "Footer links"}
        >
          {footerRows.map((row, rowIndex) => (
            <span key={rowIndex} className="flex w-full items-center justify-end gap-2">
              {row.map(([href, label], index) => (
                <span key={href} className="inline-flex items-center gap-2 whitespace-nowrap">
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <Link
                    href={href}
                    onClick={(event) => void handleFooterNavigation(event, href)}
                    className="text-inherit no-underline"
                  >
                    {label}
                  </Link>
                </span>
              ))}
            </span>
          ))}
        </nav>
      </div>

    </>
  );
}
