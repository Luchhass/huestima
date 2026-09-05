"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import FooterCardSurface from "./FooterCardSurface";
import {
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import {
  consumeCardRouteTransition,
} from "@/hooks/useFooterPageTransition";

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
  effects,
  mainRef,
  onRevealComplete,
  scrollable = true,
  scrollableMobile = false,
  staticLanguage = false,
}) {
  const cardRef = useRef(null);
  const contentRef = useRef(null);
  const setMainNode = useCallback((node) => {
    cardRef.current = node;
    if (mainRef) mainRef.current = node;
  }, [mainRef]);
  useScreenReveal(contentRef, [], { defer: true, onComplete: onRevealComplete });

  useLayoutEffect(() => {
    const card = cardRef.current;
    const transition = consumeCardRouteTransition();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    // Read the server-rendered normal card; do not resize a fullscreen first paint.
    const rect = card.getBoundingClientRect();
    const { width, height } = rect;
    const normal = {
      left: rect.left,
      top: rect.top,
      width, height, borderRadius: 26,
    };
    const scale = Math.max(viewportWidth / width, viewportHeight / height);
    const cover = {
      left: (viewportWidth - width * scale) / 2,
      top: (viewportHeight - height * scale) / 2,
      width: width * scale, height: height * scale, borderRadius: 0,
    };
    let animation;
    let revealFrame;
    const reveal = () => {
      // The very same surface becomes the scrollable page after covering the viewport.
      gsap.set(card, { left: 0, top: 0, width: viewportWidth, height: viewportHeight });
      const mobileScrollable = scrollableMobile && window.matchMedia("(max-width: 639px)").matches;
      card.style.overflowY = scrollable || mobileScrollable ? "auto" : "hidden";
      revealFrame = requestAnimationFrame(() => {
        window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
      });
    };
    gsap.set(card, transition?.from === "fullscreen" ? cover : normal);
    card.style.overflow = "hidden";
    animation = gsap.to(card, {
      ...cover, duration: reduced || transition?.from === "fullscreen" ? 0 : 0.72,
      ease: "expo.inOut", onComplete: reveal,
    });
    card.footerCollapse = () => new Promise((resolve) => {
      animation?.kill();
      cancelAnimationFrame(revealFrame);
      card.scrollTop = 0;
      card.style.overflow = "hidden";
      gsap.set(card, cover);
      animation = gsap.to(card, {
        ...normal, duration: reduced ? 0 : 0.66, ease: "expo.inOut",
        onComplete: resolve, onInterrupt: resolve,
      });
    });
    return () => {
      cancelAnimationFrame(revealFrame);
      animation?.kill();
      gsap.set(card, { clearProps: "left,top,width,height,borderRadius,overflow,overflowY" });
      delete card.footerCollapse;
    };
  }, [scrollable, scrollableMobile]);

  return (
    <main
      data-language-static={staticLanguage ? "" : undefined}
      className="app-gradient relative h-dvh w-full overflow-hidden"
    >
      <FooterCardSurface cardRef={setMainNode} className={className}>
        <div ref={contentRef} data-footer-page-content
          className={`min-h-full px-6 pt-8 sm:px-10 lg:px-14 ${scrollable || scrollableMobile ? "pb-16" : "pb-6 sm:pb-8"}`}>
          {action}
          {effects}
          <div data-screen-reveal className="mx-auto w-full max-w-[68rem] pt-16 sm:pt-14">
            {children}
          </div>
        </div>
      </FooterCardSurface>
    </main>
  );
}
