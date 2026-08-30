"use client";

import { useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

export const FOOTER_RETURN_KEY = "huestima-card-enter";
export const ADMIN_HOME_RETURN_KEY = "huestima-admin-home-return";
export const DOWNLOAD_RETURN_KEY = "huestima-download-return";
export const APP_CHROME_SELECTOR =
  ".app-header, .creator-tag, .route-transition-footer";
export const SCREEN_FADE_DURATION = 0.24;
export const SCREEN_FADE_EASE = "power2.out";
export const CARD_SCALE_DURATION = 0.52;
const SCREEN_FADE_REVERSE_EASE = "power2.in";
const CARD_SCALE_EASE = "power3.inOut";

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
  { scaleCard = true } = {},
) {
  const card = asElement(cardRef);
  const content = asElement(contentRef);
  const chrome = Array.from(document.querySelectorAll(APP_CHROME_SELECTOR));

  if (!card || !content) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set([content, ...chrome], { autoAlpha: 0 });
    if (scaleCard) gsap.set(card, { autoAlpha: 0 });
    return Promise.resolve();
  }

  gsap.killTweensOf([card, content, ...chrome]);
  gsap.set(content, { autoAlpha: 1 });
  gsap.set(chrome, { autoAlpha: 1, transition: "none" });
  gsap.set(card, { autoAlpha: 1, scale: 1 });

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
      .to(content, {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      });

    if (scaleCard) {
      timeline.to(card, {
        scale: 0.001,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        transformOrigin: "50% 50%",
      });
    }

    timeline.to(chrome, {
      autoAlpha: 0,
      duration: SCREEN_FADE_DURATION,
      ease: SCREEN_FADE_EASE,
    });
  });
}

export function playFooterReturnEntry(cardRef, { scaleCard = true } = {}) {
  const card = asElement(cardRef);
  const chrome = Array.from(document.querySelectorAll(APP_CHROME_SELECTOR));

  if (!card) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set(chrome, { clearProps: "opacity,visibility" });
    gsap.set(card, { clearProps: "opacity,visibility,transform" });
    return Promise.resolve();
  }

  gsap.killTweensOf([card, ...chrome]);
  gsap.set(chrome, { autoAlpha: 0, transition: "none" });
  gsap.set(card, scaleCard
    ? { autoAlpha: 1, scale: 0.001, transformOrigin: "50% 50%" }
    : { autoAlpha: 1, scale: 1 });

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
      .to(chrome, {
        autoAlpha: 1,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_REVERSE_EASE,
        clearProps: "opacity,visibility,transition",
      });

    if (scaleCard) {
      timeline.to(card, {
        scale: 1,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        clearProps: "transform",
      });
    } else {
      timeline.set(card, { clearProps: "opacity,visibility,transform,transition" });
    }
  });
}

export function useFooterPageTransition(scopeRef) {
  const router = useRouter();
  const isLeavingRef = useRef(false);

  useLayoutEffect(() => {
    const scope = asElement(scopeRef);
    if (!scope) return undefined;

    gsap.set(scope, { autoAlpha: 0 });
    void playPageFade(scope, true);

    return () => gsap.killTweensOf(scope);
  }, [scopeRef]);

  const leave = async (href, { returnToHome = true } = {}) => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    if (returnToHome) markFooterReturn();
    await playPageFade(scopeRef, false);
    router.push(href);
  };

  return leave;
}
