"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useLanguage";
import { playScreenFadeOut } from "@/hooks/useScreenReveal";

const HISTORY_LEAVE_EVENT = "huestima-history-leave";
const HISTORY_LEAVE_COMPLETE_EVENT = "huestima-history-leave-complete";

function waitForHistoryLeave() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener(HISTORY_LEAVE_COMPLETE_EVENT, finish);
      resolve();
    };

    window.addEventListener(HISTORY_LEAVE_COMPLETE_EVENT, finish, { once: true });
    window.dispatchEvent(new Event(HISTORY_LEAVE_EVENT));
    window.setTimeout(finish, 1400);
  });
}

export default function AppFooter() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const navigationResetRef = useRef(null);
  const isHistoryRoute = pathname === "/history" || pathname?.startsWith("/history?");
  const isCartoonLibraryRoute = pathname === "/cartoon-library";

  useEffect(() => {
    isNavigatingRef.current = false;
    if (navigationResetRef.current) {
      window.clearTimeout(navigationResetRef.current);
      navigationResetRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (navigationResetRef.current) {
        window.clearTimeout(navigationResetRef.current);
      }
    };
  }, []);

  const handleHistoryClick = async () => {
    if (isHistoryRoute || isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    navigationResetRef.current = window.setTimeout(() => {
      isNavigatingRef.current = false;
      navigationResetRef.current = null;
    }, 1800);
    const href = "/history";

    try {
      if (pathname?.startsWith("/history")) {
        await waitForHistoryLeave();
        router.push(href);
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scope =
        document.querySelector("[data-route-transition-scope]") ||
        document.querySelector("[data-intro-card-target]") ||
        document.querySelector("main");

      if (!scope || reduceMotion) {
        router.push(href);
        return;
      }

      await playScreenFadeOut(scope, { duration: 0.24 });
      router.push(href);
    } catch {
      isNavigatingRef.current = false;
    }
  };

  if (isCartoonLibraryRoute) {
    return null;
  }

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

      <button
        type="button"
        data-sound="off"
        disabled={isHistoryRoute}
        onClick={() => {
          void handleHistoryClick();
        }}
        className="creator-tag pointer-events-auto fixed right-6 bottom-6 z-40 border-0 bg-transparent p-0 text-[11px] font-medium lowercase tracking-wider text-zinc-500 no-underline outline-none transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:pointer-events-none disabled:opacity-45 dark:text-zinc-500 dark:hover:text-zinc-50 sm:right-8 sm:bottom-8"
      >
        {t("history.footerLink")}
      </button>
    </>
  );
}
