"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

const REVEAL_SELECTOR = "[data-screen-reveal]";
const INTRO_SETTLE_DELAY = 220;
const INTRO_TIMEOUT = 7200;
const INTRO_APPEAR_WAIT = 240;
const GROUP_GAP = 0.18;
const ITEM_STAGGER = 0.055;
const MASK_CLIP = "inset(-28px -120vw -28px 0px)";
const READY_ATTR = "screenRevealReady";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function waitForIntro(callback) {
  if (window.__pageIntroDoneForPath) {
    const settleId = window.setTimeout(callback, 160);
    return () => window.clearTimeout(settleId);
  }

  const overlay = document.querySelector("[data-page-intro-overlay]");

  let completed = false;
  let fallbackId = null;
  let settleId = null;
  let observer = null;

  function cleanupPassive() {
    window.removeEventListener("page-intro:complete", handleComplete);
    observer?.disconnect();
    observer = null;
    if (fallbackId) window.clearTimeout(fallbackId);
    fallbackId = null;
  }

  function finish(delay = 0) {
    if (completed) return;

    completed = true;
    cleanupPassive();
    settleId = window.setTimeout(callback, delay);
  }

  function handleComplete() {
    finish(INTRO_SETTLE_DELAY);
  }

  const armIntroTimeout = () => {
    if (fallbackId) window.clearTimeout(fallbackId);
    fallbackId = window.setTimeout(() => {
      finish(INTRO_SETTLE_DELAY);
    }, INTRO_TIMEOUT);
  };

  window.addEventListener("page-intro:complete", handleComplete, { once: true });

  if (overlay) {
    armIntroTimeout();
  } else {
    let sawOverlay = false;

    observer = new MutationObserver(() => {
      if (sawOverlay) return;

      const nextOverlay = document.querySelector("[data-page-intro-overlay]");
      if (!nextOverlay) return;

      sawOverlay = true;
      armIntroTimeout();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    fallbackId = window.setTimeout(() => {
      if (!sawOverlay) finish(70);
    }, INTRO_APPEAR_WAIT);
  }

  return () => {
    cleanupPassive();
    if (settleId) window.clearTimeout(settleId);
  };
}

export function playScreenFadeOut(scopeRef, options = {}) {
  if (typeof window === "undefined") return Promise.resolve();

  const scope = scopeRef?.current || scopeRef;
  if (!scope || prefersReducedMotion()) return Promise.resolve();

  return new Promise((resolve) => {
    gsap.to(scope, {
      autoAlpha: 0,
      duration: options.duration ?? 0.24,
      ease: "power2.out",
      overwrite: true,
      onComplete: resolve,
    });
  });
}

export function useScreenReveal(scopeRef, dependencies = []) {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const items = gsap.utils.toArray(REVEAL_SELECTOR, scope);
    if (!items.length) {
      gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });
      return undefined;
    }

    items.forEach((item) => {
      delete item.dataset[READY_ATTR];
    });

    const groups = items.map((mask) => {
      const children = Array.from(mask.children).filter(
        (child) => child instanceof HTMLElement,
      );
      const className = mask.className?.toString() || "";
      const isUnifiedRow =
        mask.tagName === "ARTICLE" ||
        className.includes("actions") ||
        className.includes("grid") ||
        className.includes("flex");

      return {
        mask,
        children: children.length ? children : [mask],
        shouldStaggerChildren: children.length > 1 && !isUnifiedRow,
        useMask: children.length > 0,
      };
    });
    const animatedItems = groups.flatMap((group) => group.children);

    if (prefersReducedMotion()) {
      gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });
      gsap.set(items, { clearProps: "clipPath,willChange" });
      gsap.set(animatedItems, {
        autoAlpha: 1,
        clearProps: "clipPath,transform,transformOrigin,opacity,visibility,willChange",
      });
      return undefined;
    }

    let timeline = null;
    gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });

    gsap.set(
      groups.filter((group) => group.useMask).map((group) => group.mask),
      {
        clipPath: MASK_CLIP,
        willChange: "clip-path",
      },
    );

    groups.forEach((group) => {
      const maskRect = group.mask.getBoundingClientRect();
      const childRightEdge = group.children.reduce((rightEdge, child) => {
        const childRect = child.getBoundingClientRect();
        return Math.max(rightEdge, childRect.right - maskRect.left);
      }, maskRect.width);
      const slideDistance = Math.max(maskRect.width, childRightEdge) + 34;

      gsap.set(group.children, {
        x: -slideDistance,
        autoAlpha: 1,
        willChange: "transform",
        force3D: false,
      });
    });

    items.forEach((item) => {
      item.dataset[READY_ATTR] = "true";
    });

    const cancelIntroWait = waitForIntro(() => {
      timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
      });

      groups.forEach((group, groupIndex) => {
        const startAt =
          groupIndex < 5
            ? groupIndex * GROUP_GAP
            : 4 * GROUP_GAP + (groupIndex - 4) * 0.055;

        timeline.to(
          group.children,
          {
            x: 0,
            duration: 0.98,
            ease: "power4.out",
            stagger: group.shouldStaggerChildren ? ITEM_STAGGER : 0,
            clearProps: "opacity,visibility,willChange",
            force3D: false,
          },
          startAt,
        );
      });

      timeline.set(items, { clearProps: "clipPath,willChange" });
    });

    return () => {
      cancelIntroWait?.();
      timeline?.kill();
      gsap.killTweensOf(animatedItems);
      items.forEach((item) => {
        delete item.dataset[READY_ATTR];
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
