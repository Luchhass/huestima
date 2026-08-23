"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { playHomeToFooterExit } from "@/hooks/useFooterPageTransition";

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
  const familyLabels = {
    color: { en: "how it works", tr: "nasıl çalışır" },
    flag: { en: "flag guide", tr: "bayrak rehberi" },
    cartoon: {
      en: "cartoon guide",
      tr: "çizgi film rehberi",
    },
    brand: { en: "brand guide", tr: "marka rehberi" },
  };
  const family = pathname?.split("/").filter(Boolean)[0] || "color";
  const howItWorksLabel = familyLabels[family]?.[locale] || familyLabels.color[locale];
  const footerLinkClass = "pointer-events-auto text-[11px] font-medium lowercase tracking-wider text-zinc-500 no-underline transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-500 dark:hover:text-zinc-50";

  const handleFooterNavigation = async (event, href) => {
    event.preventDefault();
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const card = document.querySelector("[data-intro-card-target]");
    const content = document.querySelector("[data-route-transition-scope]");
    if (!card || !content) {
      router.push(href);
      return;
    }

    await playHomeToFooterExit(card, content);

    router.push(href);
  };

  if (isLibraryRoute || isPrivacyRoute || isHowItWorksRoute || isTestLabRoute) return null;

  return (
    <>
      <footer className="creator-tag pointer-events-none fixed bottom-6 left-6 z-40 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500 sm:bottom-8 sm:left-8">
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

      <div className="route-transition-footer pointer-events-auto fixed right-6 bottom-6 z-40 flex items-center gap-5 sm:right-8 sm:bottom-8">
        <Link href={`/test-lab?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/test-lab?from=${family}`)} className={footerLinkClass}>
          test lab
        </Link>
        <Link href={`/how-it-works?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/how-it-works?from=${family}`)} className={footerLinkClass}>
          {howItWorksLabel}
        </Link>
        <Link href={`/privacy-policy?from=${family}`} data-sound="off" onClick={(event) => void handleFooterNavigation(event, `/privacy-policy?from=${family}`)} className={footerLinkClass}>
          privacy policy
        </Link>
      </div>

    </>
  );
}
