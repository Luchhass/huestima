"use client";

import { useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

export const FOOTER_RETURN_KEY = "huestima-card-enter";
export const APP_CHROME_SELECTOR =
  ".app-header, .creator-tag, .route-transition-footer";
export const SCREEN_FADE_DURATION = 0.24;
export const CARD_SCALE_DURATION = 0.52;
const SCREEN_FADE_EASE = "power2.out";
const CARD_SCALE_EASE = "power3.inOut";

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

export function playHomeToFooterExit(cardRef, contentRef) {
  const card = asElement(cardRef);
  const content = asElement(contentRef);
  const chrome = Array.from(document.querySelectorAll(APP_CHROME_SELECTOR));

  if (!card || !content) return Promise.resolve();

  if (prefersReducedMotion()) {
    gsap.set([card, content, ...chrome], { autoAlpha: 0 });
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

    gsap
      .timeline({
        defaults: { overwrite: "auto" },
        onComplete: settle,
        onInterrupt: settle,
      })
      .to(content, {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      })
      .to(card, {
        scale: 0.001,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        transformOrigin: "50% 50%",
      })
      .to(chrome, {
        autoAlpha: 0,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
      });
  });
}

export function playFooterReturnEntry(cardRef) {
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
  gsap.set(card, {
    autoAlpha: 1,
    scale: 0.001,
    transformOrigin: "50% 50%",
  });

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    gsap
      .timeline({
        defaults: { overwrite: "auto" },
        onComplete: settle,
        onInterrupt: settle,
      })
      .to(chrome, {
        autoAlpha: 1,
        duration: SCREEN_FADE_DURATION,
        ease: SCREEN_FADE_EASE,
        clearProps: "opacity,visibility,transition",
      })
      .to(card, {
        scale: 1,
        duration: CARD_SCALE_DURATION,
        ease: CARD_SCALE_EASE,
        clearProps: "transform",
      });
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
