"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import FooterCardSurface from "./FooterCardSurface";
import {
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import { consumeCardRouteTransition } from "@/hooks/useFooterPageTransition";

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
  headingAs: Heading = "h1",
  titleId,
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
        <Heading id={titleId} className="text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
          {title}
        </Heading>
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
  fullScreen = false,
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
  useScreenReveal(contentRef, [fullScreen], {
    defer: true,
    onComplete: onRevealComplete,
  });

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const locationAtSetup = window.location.href;
    const transition = consumeCardRouteTransition();
    if (fullScreen) {
      const revealFrame = requestAnimationFrame(() => {
        window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
      });
      return () => cancelAnimationFrame(revealFrame);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    // Read the server-rendered normal card before expanding the page surface.
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
    gsap.set(card, transition?.from === "expanded" ? cover : normal);
    card.style.overflow = "hidden";
    animation = gsap.to(card, {
      ...cover, duration: reduced || transition?.from === "expanded" ? 0 : 0.72,
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
      if (window.location.href === locationAtSetup) {
        gsap.set(card, { clearProps: "left,top,width,height,borderRadius,overflow,overflowY" });
      }
      delete card.footerCollapse;
    };
  }, [fullScreen, scrollable, scrollableMobile]);

  if (fullScreen) {
    const overflowY = scrollable
      ? "overflow-y-auto"
      : scrollableMobile
        ? "overflow-y-hidden max-sm:overflow-y-auto"
        : "overflow-y-hidden";

    return (
      <main
        ref={setMainNode}
        data-intro-card-target
        data-language-static={staticLanguage ? "" : undefined}
        className={`footer-page-dark fixed inset-0 z-40 h-dvh w-full overflow-hidden bg-black text-white ${className}`}
      >
        <div
          ref={contentRef}
          data-footer-page-content
          className={`h-full w-full overflow-x-hidden ${overflowY}`}
        >
          <div className="mx-auto min-h-full w-full max-w-[68rem] px-6 pt-8 pb-16 sm:px-10 sm:pb-16 lg:px-14">
            {action}
            {effects}
            <div data-screen-reveal className="pt-16 sm:pt-14">
              {children}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      data-language-static={staticLanguage ? "" : undefined}
      className="app-gradient relative h-dvh w-full overflow-hidden"
    >
      <FooterCardSurface cardRef={setMainNode} data-intro-card-target className={className}>
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

export function FullScreenPageLoading() {
  return (
    <main
      aria-hidden="true"
      className="footer-page-dark fixed inset-0 z-40 h-dvh w-full bg-black"
    />
  );
}
