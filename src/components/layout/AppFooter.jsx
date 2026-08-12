"use client";

import { useRef } from "react";
import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useLanguage";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";

export default function AppFooter() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const showHowItWorksLink =
    pathname === "/cartoon" || pathname.startsWith("/cartoon/");
  const handleHowItWorksClick = async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (pathname === "/cartoon" || pathname.startsWith("/cartoon/")) {
      sessionStorage.setItem("huestima-how-it-works-entry", "cartoon");
    }

    const href = "/how-it-works";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scope =
      document.querySelector("[data-route-transition-scope]") ||
      document.querySelector("[data-intro-card-target]") ||
      document.querySelector("main");
    const introCard = document.querySelector("[data-intro-card-target]");

    if (!scope || reduceMotion) {
      router.push(href);
      return;
    }

    await playScreenFadeOut(scope, { duration: 0.24 });

    if (introCard) {
      await new Promise((resolve) => {
        gsap.set(introCard, {
          autoAlpha: 1,
          transformOrigin: "center center",
        });
        gsap.to(introCard, {
          scale: 0.001,
          duration: 0.54,
          ease: "power3.inOut",
          overwrite: "auto",
          onComplete: resolve,
        });
      });
    }

    router.push(href);
  };

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

      {showHowItWorksLink ? (
        <button
          type="button"
          data-sound="off"
          onClick={() => {
            void handleHowItWorksClick();
          }}
          className="creator-tag pointer-events-auto fixed right-6 bottom-6 z-40 border-0 bg-transparent p-0 text-[11px] font-medium lowercase tracking-wider text-zinc-500 no-underline outline-none transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-foreground/30 dark:text-zinc-500 dark:hover:text-zinc-50 sm:right-8 sm:bottom-8"
        >
          {t("howItWorks.footerLink")}
        </button>
      ) : null}
    </>
  );
}
