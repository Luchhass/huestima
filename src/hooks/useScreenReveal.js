"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

const REVEAL_SELECTOR = "[data-screen-reveal]";
export const SCREEN_REVEAL_REPLAY_EVENT = "huestima-screen-reveal-replay";
export const SCREEN_REVEAL_PREPARE_EVENT = "huestima-screen-reveal-prepare";
export const SCREEN_REVEAL_START_EVENT = "huestima-screen-reveal-start";
export const SCREEN_REVEAL_COMPLETE_EVENT = "huestima-screen-reveal-complete";
export const SCREEN_FADE_OUT_EVENT = "huestima-screen-fade-out";
const INTRO_SETTLE_DELAY = 220;
const INTRO_TIMEOUT = 7200;
const INTRO_APPEAR_WAIT = 240;
const GROUP_GAP = 0.22;
const LATE_GROUP_GAP = 0.075;
const ITEM_STAGGER = 0.085;
const REVEAL_DURATION = 0.9;
const MASK_CLIP = "inset(-32px -120vw -32px 0px)";
const READY_ATTR = "screenRevealReady";
const FINAL_LEFT = "0px";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function dispatchScreenLifecycleEvent(eventName) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(eventName));
}

function waitForIntro(callback) {
  if (window.__pageIntroDoneForPath === window.location.pathname) {
    const settleId = window.setTimeout(callback, 160);
    return () => window.clearTimeout(settleId);
  }

  const overlay = document.querySelector("[data-page-intro-overlay]");
  const isIntroPending =
    document.documentElement.dataset.pageIntroPending === "true";

  if (!overlay && !isIntroPending) {
    const settleId = window.setTimeout(callback, 70);
    return () => window.clearTimeout(settleId);
  }

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

  dispatchScreenLifecycleEvent(SCREEN_FADE_OUT_EVENT);

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

export function useScreenReveal(scopeRef, dependencies = [], options = {}) {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;
    const initialDelay = options.delay ?? 0;

    let timeline = null;
    let cancelIntroWait = null;
    let activeItems = [];
    let activeAnimatedItems = [];

    const clearActiveAnimation = () => {
      cancelIntroWait?.();
      cancelIntroWait = null;
      timeline?.kill();
      timeline = null;
      gsap.killTweensOf(activeAnimatedItems);

      if (activeItems.length) {
        gsap.set(activeItems, {
          clearProps: "clipPath,opacity,visibility,willChange",
        });
      }

      if (activeAnimatedItems.length) {
        gsap.set(activeAnimatedItems, {
          clearProps:
            "left,position,opacity,visibility,willChange",
        });
      }

      activeItems.forEach((item) => {
        delete item.dataset[READY_ATTR];
      });
    };

    const playReveal = ({ waitForPageIntro = true, delay = 0 } = {}) => {
      clearActiveAnimation();
      dispatchScreenLifecycleEvent(SCREEN_REVEAL_PREPARE_EVENT);

      const items = gsap.utils.toArray(REVEAL_SELECTOR, scope);
      if (!items.length) {
        gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });
        dispatchScreenLifecycleEvent(SCREEN_REVEAL_START_EVENT);
        dispatchScreenLifecycleEvent(SCREEN_REVEAL_COMPLETE_EVENT);
        return;
      }

      activeItems = items;
      activeItems.forEach((item) => {
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

      activeAnimatedItems = groups.flatMap((group) => group.children);

      if (prefersReducedMotion()) {
        gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });
        gsap.set(items, {
          autoAlpha: 1,
          clearProps: "clipPath,opacity,visibility,willChange",
        });
        gsap.set(activeAnimatedItems, {
          autoAlpha: 1,
          clearProps:
            "clipPath,left,position,opacity,visibility,willChange",
        });
        items.forEach((item) => {
          item.dataset[READY_ATTR] = "true";
        });
        dispatchScreenLifecycleEvent(SCREEN_REVEAL_START_EVENT);
        dispatchScreenLifecycleEvent(SCREEN_REVEAL_COMPLETE_EVENT);
        return;
      }

      gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });
      gsap.set(items, {
        autoAlpha: 1,
        clearProps: "clipPath,opacity,visibility,willChange",
      });
      gsap.set(activeAnimatedItems, {
        clearProps:
          "left,position,opacity,visibility,willChange",
      });

      gsap.set(
        groups.filter((group) => group.useMask).map((group) => group.mask),
        {
          clipPath: MASK_CLIP,
        },
      );

      groups.forEach((group) => {
        const maskRect = group.mask.getBoundingClientRect();
        const childRightEdge = group.children.reduce((rightEdge, child) => {
          const childRect = child.getBoundingClientRect();
          return Math.max(rightEdge, childRect.right - maskRect.left);
        }, maskRect.width);
        const slideDistance = Math.ceil(
          Math.max(maskRect.width, childRightEdge) + 34,
        );

        gsap.set(group.children, {
          position: "relative",
          left: `${-slideDistance}px`,
          autoAlpha: 1,
        });
      });

      items.forEach((item) => {
        item.dataset[READY_ATTR] = "true";
      });

      const startTimeline = () => {
        const revealDelayId = window.setTimeout(() => {
          dispatchScreenLifecycleEvent(SCREEN_REVEAL_START_EVENT);

          timeline = gsap.timeline({
            defaults: { overwrite: "auto" },
            onComplete: () => {
              dispatchScreenLifecycleEvent(SCREEN_REVEAL_COMPLETE_EVENT);
            },
          });

          groups.forEach((group, groupIndex) => {
            const startAt =
              groupIndex < 5
                ? groupIndex * GROUP_GAP
                : 4 * GROUP_GAP + (groupIndex - 4) * LATE_GROUP_GAP;

            timeline.to(
              group.children,
              {
                left: FINAL_LEFT,
                duration: REVEAL_DURATION,
                ease: "power4.out",
                stagger: group.shouldStaggerChildren ? ITEM_STAGGER : 0,
                clearProps: "opacity,visibility",
              },
              startAt,
            );
          });

          timeline.set(items, { clearProps: "clipPath,willChange" });
        }, delay);

        return () => window.clearTimeout(revealDelayId);
      };

      let revealStarted = false;
      let cancelRevealDelay = null;
      let cancelIntroListener = null;
      let forceRevealId = null;

      const startTimelineOnce = () => {
        if (revealStarted) return;

        revealStarted = true;
        cancelIntroListener?.();
        cancelIntroListener = null;

        if (forceRevealId) {
          window.clearTimeout(forceRevealId);
          forceRevealId = null;
        }

        cancelRevealDelay = startTimeline();
      };

      if (waitForPageIntro) {
        cancelIntroListener = waitForIntro(startTimelineOnce);
        forceRevealId = window.setTimeout(
          startTimelineOnce,
          INTRO_TIMEOUT + INTRO_SETTLE_DELAY + 900,
        );

        cancelIntroWait = () => {
          cancelIntroListener?.();
          cancelIntroListener = null;

          if (forceRevealId) {
            window.clearTimeout(forceRevealId);
            forceRevealId = null;
          }

          cancelRevealDelay?.();
          cancelRevealDelay = null;
        };
      } else {
        startTimelineOnce();
        cancelIntroWait = () => {
          cancelRevealDelay?.();
          cancelRevealDelay = null;
        };
      }
    };

    const handleReplay = () => {
      playReveal({ waitForPageIntro: false, delay: 80 });
    };

    playReveal({ waitForPageIntro: true, delay: initialDelay });
    window.addEventListener(SCREEN_REVEAL_REPLAY_EVENT, handleReplay);

    return () => {
      window.removeEventListener(SCREEN_REVEAL_REPLAY_EVENT, handleReplay);
      clearActiveAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
