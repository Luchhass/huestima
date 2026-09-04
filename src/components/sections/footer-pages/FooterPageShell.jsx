"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import { FOOTER_FULLSCREEN_COLLAPSE_EVENT } from "@/hooks/useFooterPageTransition";

export function FooterPageAction({ children, className = "", ...props }) {
  return (
    <a
      {...props}
      className={`absolute right-6 top-6 z-30 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-2 text-sm font-medium text-foreground/48 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 sm:right-10 sm:top-8 lg:right-14 ${className}`}
    >
      {children}
    </a>
  );
}

export function FooterPageHeader({
  children,
  description,
  kicker = "Huestima",
  meta,
  metaPlacement = "side",
  title,
}) {
  return (
    <header className="border-b border-foreground/10 pb-7 sm:pb-9">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/38">
          {kicker}
        </p>
      ) : null}
      <div
        className={`${kicker ? "mt-3" : ""} flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between`}
      >
        <h1 className="text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
          {title}
        </h1>
        {meta && metaPlacement === "side" ? (
          <p className="shrink-0 text-sm font-medium text-foreground/42">
            {meta}
          </p>
        ) : null}
      </div>
      {meta && metaPlacement === "below" ? (
        <p className="mt-4 text-sm font-medium text-foreground/42">{meta}</p>
      ) : null}
      {description ? (
        <p
          className={`${metaPlacement === "below" ? "mt-5" : "mt-4"} max-w-3xl text-base leading-relaxed text-foreground/58 sm:text-lg`}
        >
          {description}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export default function FooterPageShell({
  action,
  children,
  className = "",
  mainRef,
  scrollable = true,
  staticLanguage = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const setMainNode = useCallback((node) => {
    if (mainRef) mainRef.current = node;
  }, [mainRef]);

  useScreenReveal(contentRef, [], { defer: true });

  useEffect(() => {
    const expandId = window.setTimeout(() => setIsExpanded(true), 40);
    const revealId = window.setTimeout(() => {
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    }, 780);
    const handleCollapse = () => setIsExpanded(false);
    window.addEventListener(FOOTER_FULLSCREEN_COLLAPSE_EVENT, handleCollapse);

    return () => {
      window.clearTimeout(expandId);
      window.clearTimeout(revealId);
      window.removeEventListener(FOOTER_FULLSCREEN_COLLAPSE_EVENT, handleCollapse);
    };
  }, []);

  return (
    <main
      data-language-static={staticLanguage ? "" : undefined}
      className={`app-gradient flex h-dvh w-full items-center justify-center overflow-hidden transition-[padding] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] ${isExpanded ? "p-0" : "p-6 sm:p-8"}`}
    >
      <article
        ref={setMainNode}
        data-footer-fullscreen-card
        className={`footer-page-dark relative w-full bg-black text-white transition-[height,max-width,border-radius] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] ${
          isExpanded
            ? "h-dvh max-w-none rounded-none"
            : "h-[min(390px,calc(100dvh-8rem))] max-w-125 rounded-[26px]"
        } ${scrollable ? "overflow-y-auto" : "overflow-clip"} ${className}`}
      >
        <div
          ref={contentRef}
          data-footer-page-content
          className={`min-h-full px-6 pt-8 sm:px-10 lg:px-14 ${
            scrollable ? "pb-16" : "pb-6 sm:pb-8"
          }`}
        >
          <div data-screen-reveal className="min-h-full">
            {action}
            <div className="mx-auto w-full max-w-[68rem] pt-16 sm:pt-14">
              {children}
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
