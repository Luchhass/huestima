"use client";

import { useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { dispatchScreenFadeOut, playScreenFadeOut } from "@/hooks/useScreenReveal";

export const FOOTER_RETURN_KEY = "huestima-card-enter";
export const ADMIN_HOME_RETURN_KEY = "huestima-admin-home-return";
export const DOWNLOAD_RETURN_KEY = "huestima-download-return";
export const CARD_ROUTE_TRANSITION_KEY = "huestima-card-route-transition";
export const FOOTER_FULLSCREEN_COLLAPSE_EVENT = "huestima-footer-fullscreen-collapse";
export const APP_CHROME_SELECTOR =
  ".app-header, .creator-tag, .route-transition-footer";
export const SCREEN_FADE_DURATION = 0.24;
export const SCREEN_FADE_EASE = "power2.out";
export const CARD_SCALE_DURATION = 0.52;
export const CARD_RESIZE_DURATION_MS = 700;
export const DOWNLOAD_RESIZE_DURATION_MS = 860;
export const SCREEN_REVEAL_AFTER_RESIZE_MS = 780;
export const SCREEN_REVEAL_DIRECT_MS = 80;
const SCREEN_FADE_REVERSE_EASE = "power2.in";
const CARD_SCALE_EASE = "power3.inOut";

// Each persistent chrome component restores itself before paint on route changes.
export function useFooterChromeReturn(pathname, selector) {
  const previousPath = useRef(pathname);
  useLayoutEffect(() => {
    const returning = getRouteCardKind(previousPath.current) === "fullscreen" &&
      getRouteCardKind(pathname) !== "fullscreen";
    previousPath.current = pathname;
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;
    gsap.killTweensOf(elements);
    if (!returning || prefersReducedMotion()) {
      gsap.set(elements, { clearProps: "opacity,visibility,transition" });
      return;
    }
    gsap.set(elements, { autoAlpha: 0, transition: "none" });
    const tween = gsap.to(elements, {
      autoAlpha: 1,
      duration: SCREEN_FADE_DURATION,
      ease: SCREEN_FADE_REVERSE_EASE,
      clearProps: "opacity,visibility,transition",
    });
    return () => {
      tween.kill();
      gsap.set(elements, { clearProps: "opacity,visibility,transition" });
    };
  }, [pathname, selector]);
}

function readResponsiveCardHeight(expanded) {
  const viewportHeight =
    window.visualViewport?.height ||
    document.documentElement.clientHeight ||
    window.innerHeight;
  const maxHeight = expanded ? 520 : 390;
  const offset = expanded ? 88 : 132;

  return Math.max(320, Math.min(viewportHeight - offset, maxHeight));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function asElement(scopeRef) {
  return scopeRef?.current || scopeRef;
}

export function getRouteCardKind(pathname = "") {
  const cleanPath = String(pathname).split("?")[0];
  if ([
    "/how-it-works",
    "/privacy-policy",
    "/credits",
    "/flag-library",
    "/cartoon-library",
    "/brand-library",
    "/team-library",
    "/test",
    "/test-lab",
  ].includes(cleanPath)) {
    return "fullscreen";
  }
  if (cleanPath === "/download") return "download";
  if (cleanPath === "/history" || cleanPath === "/notifications") return "large";
  return "default";
}

export function getRenderedCardKind(card, pathname = "") {
  const routeKind = getRouteCardKind(pathname);
  if (routeKind !== "default") return routeKind;
  return card?.dataset?.cardSize === "large" ? "large" : "default";
}

export function markCardRouteTransition(href, fromKind = null) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CARD_ROUTE_TRANSITION_KEY, JSON.stringify({
    from: fromKind || getRouteCardKind(window.location.pathname),
    to: getRouteCardKind(href),
  }));
}

export function consumeCardRouteTransition() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(CARD_ROUTE_TRANSITION_KEY);
  window.sessionStorage.removeItem(CARD_ROUTE_TRANSITION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasPendingFooterReturn() {
  if (typeof window === "undefined") return false;

  return window.sessionStorage.getItem(FOOTER_RETURN_KEY) === "true";
}

export function markFooterReturn() {
  window.sessionStorage.setItem(FOOTER_RETURN_KEY, "true");
}

export function clearFooterReturn() {
  window.sessionStorage.removeItem(FOOTER_RETURN_KEY);
}

export function hasPendingDownloadReturn() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(DOWNLOAD_RETURN_KEY) === "true";
}

export function markDownloadReturn() {
  window.sessionStorage.setItem(DOWNLOAD_RETURN_KEY, "true");
}

export function clearDownloadReturn() {
  window.sessionStorage.removeItem(DOWNLOAD_RETURN_KEY);
}

export function hasPendingAdminHomeReturn() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ADMIN_HOME_RETURN_KEY) === "true";
}

export function markAdminHomeReturn() {
  window.sessionStorage.setItem(ADMIN_HOME_RETURN_KEY, "true");
}

export function clearAdminHomeReturn() {
  window.sessionStorage.removeItem(ADMIN_HOME_RETURN_KEY);
}


export function playCardToCardExit(
  cardRef,
  contentRef,
  {
    targetExpanded,
    hideChrome = true,
    chromeFirst = false,
    resizeCard = true,
  } = {},
) {
  const card = asElement(cardRef);
  const content = asElement(contentRef);
  const chrome = hideChrome
    ? Array.from(document.querySelectorAll(APP_CHROME_SELECTOR))
    : [];

  if (!card || !content) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set(content, { autoAlpha: 0 });
    if (resizeCard) {
      gsap.set(card, { height: readResponsiveCardHeight(targetExpanded) });
    }
    if (chrome.length) gsap.set(chrome, { autoAlpha: 0 });
    return Promise.resolve();
  }

  gsap.killTweensOf([card, content, ...chrome]);
  gsap.set(content, { autoAlpha: 1 });
  gsap.set(card, { autoAlpha: 1, transition: "none" });
  if (chrome.length) gsap.set(chrome, { autoAlpha: 1, transition: "none" });
  dispatchScreenFadeOut({
    duration: SCREEN_FADE_DURATION,
    ease: SCREEN_FADE_EASE,
  });

  return new Promise((resolve) => {
    const timeline = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: resolve,
      onInterrupt: resolve,
    });

    timeline.to(content, {
      autoAlpha: 0,
      duration: SCREEN_FADE_DURATION,
      ease: SCREEN_FADE_EASE,
    });

    if (chrome.length && chromeFirst) {
      timeline.to(chrome, {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      });
    }

    if (resizeCard) {
      timeline.to(card, {
        height: readResponsiveCardHeight(targetExpanded),
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
      });
    }

    if (chrome.length && !chromeFirst) {
      timeline.to(chrome, {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      });
    }
  });
}

export function playAdminHomeReturnEntry(cardRef) {
  const card = asElement(cardRef);
  const chrome = Array.from(document.querySelectorAll(APP_CHROME_SELECTOR));

  if (!card) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set(chrome, { clearProps: "opacity,visibility,transition" });
    gsap.set(card, { clearProps: "opacity,visibility,transform,transition" });
    return Promise.resolve();
  }

  gsap.killTweensOf([card, ...chrome]);
  gsap.set(card, { autoAlpha: 1, scale: 1, transition: "none" });
  gsap.set(chrome, { autoAlpha: 0, transition: "none" });

  return new Promise((resolve) => {
    gsap.to(chrome, {
      autoAlpha: 1,
      duration: SCREEN_FADE_DURATION,
      ease: SCREEN_FADE_REVERSE_EASE,
      clearProps: "opacity,visibility,transition",
      onComplete: () => {
        gsap.set(card, { clearProps: "opacity,visibility,transform,transition" });
        resolve();
      },
      onInterrupt: resolve,
    });
  });
}

export function playPageFade(scopeRef, visible) {
  const scope = asElement(scopeRef);
  if (!scope) return Promise.resolve();

  if (prefersReducedMotion()) {
    if (visible) {
      gsap.set(scope, {
        autoAlpha: 1,
        clearProps: "opacity,visibility",
      });
    } else {
      gsap.set(scope, { autoAlpha: 0 });
    }
    return Promise.resolve();
  }

  gsap.killTweensOf(scope);

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    gsap.to(scope, {
      autoAlpha: visible ? 1 : 0,
      duration: SCREEN_FADE_DURATION,
      ease: SCREEN_FADE_EASE,
      overwrite: true,
      ...(visible ? { clearProps: "opacity,visibility" } : {}),
      onComplete: settle,
      onInterrupt: settle,
    });
  });
}

export function playHomeToFooterExit(
  cardRef,
  contentRef,
  { scaleCard = true, expandCard = false, hideChrome = true } = {},
) {
  const card = asElement(cardRef);
  const content = asElement(contentRef);
  const cardChildren = card
    ? Array.from(card.children).filter((child) => child !== content)
    : [];
  const chrome = hideChrome
    ? Array.from(document.querySelectorAll(APP_CHROME_SELECTOR))
    : [];

  if (!card || !content) return Promise.resolve();

  if (!scaleCard && !expandCard) {
    return Promise.all([
      playScreenFadeOut(content),
      ...cardChildren.map((child) => playPageFade(child, false)),
      ...chrome.map((element) => playPageFade(element, false)),
    ]);
  }

  if (prefersReducedMotion()) {
    gsap.set([content, ...cardChildren, ...chrome], { autoAlpha: 0 });
    if (expandCard) {
      gsap.set(card, { autoAlpha: 1, scale: 8, backgroundColor: "#000000" });
    } else if (scaleCard) gsap.set(card, { autoAlpha: 0 });
    return Promise.resolve();
  }

  gsap.killTweensOf([card, content, ...cardChildren, ...chrome]);
  gsap.set(content, { autoAlpha: 1 });
  gsap.set(chrome, { autoAlpha: 1, transition: "none" });
  gsap.set(card, {
    autoAlpha: 1,
    scale: 1,
    ...(expandCard ? { backgroundColor: "#000000" } : {}),
  });

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeline = gsap
      .timeline({
        defaults: { overwrite: "auto" },
        onComplete: settle,
        onInterrupt: settle,
      })
      .to([content, ...cardChildren], {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      });

    if (chrome.length) {
      timeline.to(chrome, {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      }, "<");
    }

    if (expandCard) {
      const rect = card.getBoundingClientRect();
      const scale = Math.max(
        (window.innerWidth * 1.12) / Math.max(1, rect.width),
        (window.innerHeight * 1.12) / Math.max(1, rect.height),
      );
      timeline.to(card, {
        scale,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        transformOrigin: "50% 50%",
        backgroundColor: "#000000",
      });
    } else if (scaleCard) {
      timeline.to(card, {
        scale: 0.001,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        transformOrigin: "50% 50%",
      });
    }

  });
}

export function playFooterReturnEntry(cardRef, { scaleCard = true } = {}) {
  const card = asElement(cardRef);
  const content = card?.querySelector("[data-route-transition-scope]");
  const cardChildren = card
    ? Array.from(card.children).filter((child) => child !== content)
    : [];

  if (!card) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set(cardChildren, { clearProps: "opacity,visibility" });
    gsap.set(card, { clearProps: "opacity,visibility,transform" });
    return Promise.resolve();
  }

  const rect = card.getBoundingClientRect();
  const coverScale = Math.max(
    (window.innerWidth * 1.12) / Math.max(1, rect.width),
    (window.innerHeight * 1.12) / Math.max(1, rect.height),
  );

  gsap.killTweensOf([card, ...cardChildren]);
  gsap.set(cardChildren, { autoAlpha: 0 });
  gsap.set(card, scaleCard
    ? {
        autoAlpha: 1,
        scale: coverScale,
        backgroundColor: "#000000",
        transformOrigin: "50% 50%",
        transition: "none",
      }
    : { autoAlpha: 1, scale: 1 });

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: settle,
        onInterrupt: settle,
      });

    if (scaleCard) {
      timeline.to(card, {
        scale: 1,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        clearProps: "transform,transition",
      });
      timeline.set(cardChildren, {
        clearProps: "opacity,visibility",
      });
    } else {
      timeline.set(card, { clearProps: "opacity,visibility,transform,transition" });
      timeline.set(cardChildren, { clearProps: "opacity,visibility" });
    }
  });
}

export function useFooterPageTransition(scopeRef) {
  const router = useRouter();
  const isLeavingRef = useRef(false);

  const leave = async (href, { returnToHome = true } = {}) => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    markCardRouteTransition(href);
    const sourceCardKind = getRouteCardKind(window.location.pathname);
    const targetCardKind = getRouteCardKind(href);
    const shouldCollapseCard =
      sourceCardKind === "fullscreen" && targetCardKind !== "fullscreen";

    // The fullscreen card collapses on the source page before routing. The
    // destination must therefore reveal directly instead of shrinking again.
    if (returnToHome && targetCardKind === "default") markDownloadReturn();
    const scope = asElement(scopeRef);
    const content = scope?.querySelector("[data-footer-page-content]") || scope;
    const chrome = Array.from(document.querySelectorAll(APP_CHROME_SELECTOR));
    await Promise.all([
      playScreenFadeOut(content),
      chrome.length ? playPageFade(chrome, false) : Promise.resolve(),
    ]);
    if (shouldCollapseCard) {
      if (scope?.footerCollapse) await scope.footerCollapse();
    }
    router.push(href);
  };

  return leave;
}
