"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";

const REVEAL_SELECTOR = "[data-screen-reveal]";
const SCROLL_REVEAL_SELECTOR = "[data-scroll-screen-reveal]";
const SCROLL_CARD_POP_SELECTOR = "[data-scroll-card-pop]";
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

function dispatchScreenLifecycleEvent(eventName, detail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    detail === undefined
      ? new Event(eventName)
      : new CustomEvent(eventName, { detail }),
  );
}

export function dispatchScreenFadeOut(detail) {
  dispatchScreenLifecycleEvent(SCREEN_FADE_OUT_EVENT, detail);
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

  const duration = options.duration ?? 0.24;
  const ease = options.ease ?? "power2.out";

  dispatchScreenFadeOut({ duration, ease });

  return new Promise((resolve) => {
    gsap.to(scope, {
      autoAlpha: 0,
      duration,
      ease,
      overwrite: true,
      onComplete: resolve,
    });
  });
}

export function playScreenCardExit(scopeRef) {
  if (typeof window === "undefined") return Promise.resolve();

  const scope = scopeRef?.current || scopeRef;
  if (!scope || prefersReducedMotion()) return Promise.resolve();

  dispatchScreenLifecycleEvent(SCREEN_FADE_OUT_EVENT);

  return new Promise((resolve) => {
    gsap.to(scope, {
      autoAlpha: 0,
      scale: 0.001,
      duration: 0.52,
      ease: "power3.inOut",
      transformOrigin: "50% 50%",
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
        options.onComplete?.();
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
        options.onComplete?.();
        return;
      }

      // Most screens reveal a single content scope, so it can stay hidden
      // while its masks are prepared. Multi-card workspaces keep their card
      // shells visible and prepare only the marked content instead.
      if (!options.preserveScopeVisibility) {
        gsap.set(scope, { autoAlpha: 0 });
      }
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
          if (!options.preserveScopeVisibility) {
            gsap.set(scope, { autoAlpha: 1, clearProps: "opacity,visibility" });
          }
          dispatchScreenLifecycleEvent(SCREEN_REVEAL_START_EVENT, {
            duration: options.duration ?? REVEAL_DURATION,
            ease: options.ease ?? "power4.out",
          });

          timeline = gsap.timeline({
            defaults: { overwrite: "auto" },
            onComplete: () => {
              dispatchScreenLifecycleEvent(SCREEN_REVEAL_COMPLETE_EVENT);
              options.onComplete?.();
            },
          });

          groups.forEach((group, groupIndex) => {
            const startAt = options.synchronous
              ? 0
              : groupIndex < 5
                ? groupIndex * GROUP_GAP
                : 4 * GROUP_GAP + (groupIndex - 4) * LATE_GROUP_GAP;

            timeline.to(
              group.children,
              {
                left: FINAL_LEFT,
                duration: options.duration ?? REVEAL_DURATION,
                ease: options.ease ?? "power4.out",
                stagger:
                  !options.synchronous && group.shouldStaggerChildren
                    ? ITEM_STAGGER
                    : 0,
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

    if (options.defer) {
      if (!options.preserveScopeVisibility) {
        gsap.set(scope, { autoAlpha: 0 });
      }
      if (options.deferContentVisibility) {
        gsap.set(scope.querySelectorAll(REVEAL_SELECTOR), { autoAlpha: 0 });
      }
      window.addEventListener(SCREEN_REVEAL_REPLAY_EVENT, handleReplay);

      return () => {
        window.removeEventListener(SCREEN_REVEAL_REPLAY_EVENT, handleReplay);
        clearActiveAnimation();
      };
    }

    playReveal({ waitForPageIntro: true, delay: initialDelay });
    window.addEventListener(SCREEN_REVEAL_REPLAY_EVENT, handleReplay);

    return () => {
      window.removeEventListener(SCREEN_REVEAL_REPLAY_EVENT, handleReplay);
      clearActiveAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

export function useScrollScreenReveal(scopeRef, dependencies = [], options = {}) {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const items = gsap.utils.toArray(SCROLL_REVEAL_SELECTOR, scope);
    if (!items.length) return undefined;

    const groups = items.map((mask) => {
      const children = Array.from(mask.children).filter(
        (child) => child instanceof HTMLElement,
      );
      return {
        mask,
        children: children.length ? children : [mask],
      };
    });
    const animatedItems = groups.flatMap((group) => group.children);
    const animations = [];
    const revealedGroups = new WeakSet();
    let observer = null;
    let cancelIntroWait = null;

    const clearGroup = ({ mask, children }) => {
      gsap.set(mask, { clearProps: "clipPath,willChange" });
      gsap.set(children, {
        clearProps: "left,position,opacity,visibility,willChange",
      });
    };

    if (prefersReducedMotion()) {
      groups.forEach(clearGroup);
      return undefined;
    }

    groups.forEach((group) => {
      const { mask, children } = group;
      const maskRect = mask.getBoundingClientRect();
      const childRightEdge = children.reduce((rightEdge, child) => {
        const childRect = child.getBoundingClientRect();
        return Math.max(rightEdge, childRect.right - maskRect.left);
      }, maskRect.width);
      const slideDistance = Math.ceil(Math.max(maskRect.width, childRightEdge) + 34);
      group.slideDistance = slideDistance;

      gsap.set(mask, {
        clipPath: MASK_CLIP,
        willChange: "clip-path",
      });
      gsap.set(children, {
        position: "relative",
        left: `${-slideDistance}px`,
        autoAlpha: 1,
        willChange: "left",
      });
    });

    const beginObserving = () => {
      observer = new IntersectionObserver((entries) => {
        const enteringItems = entries
          .filter(
            (entry) =>
              entry.isIntersecting &&
              entry.intersectionRatio >= (options.threshold ?? 0.12) &&
              !revealedGroups.has(entry.target),
          )
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        enteringItems.forEach((entry, visibleIndex) => {
          const group = groups.find(({ mask }) => mask === entry.target);
          if (!group) return;

          revealedGroups.add(group.mask);
          const configuredDelay = Number(group.mask.dataset.scrollRevealDelay || 0);
          const animation = gsap.to(group.children, {
            left: FINAL_LEFT,
            duration: options.duration ?? REVEAL_DURATION,
            delay: configuredDelay + visibleIndex * (options.stagger ?? 0.055),
            ease: options.ease ?? "power4.out",
            stagger: group.children.length > 1 ? ITEM_STAGGER : 0,
            overwrite: "auto",
          });
          animations.push(animation);
        });

        entries
          .filter(
            (entry) => !entry.isIntersecting && revealedGroups.has(entry.target),
          )
          .forEach((entry) => {
            const group = groups.find(({ mask }) => mask === entry.target);
            if (!group) return;

            revealedGroups.delete(group.mask);
            const animation = gsap.to(group.children, {
              left: `${-group.slideDistance}px`,
              duration: options.reverseDuration ?? 0.52,
              ease: options.reverseEase ?? "power3.inOut",
              stagger: group.children.length > 1
                ? { each: ITEM_STAGGER * 0.6, from: "end" }
                : 0,
              overwrite: "auto",
            });
            animations.push(animation);
          });
      }, {
        threshold: [0, options.threshold ?? 0.12],
        rootMargin: options.rootMargin ?? "0px 0px -8% 0px",
      });

      groups.forEach(({ mask }) => observer.observe(mask));
    };

    cancelIntroWait = waitForIntro(beginObserving);

    return () => {
      cancelIntroWait?.();
      observer?.disconnect();
      animations.forEach((animation) => animation.kill());
      gsap.killTweensOf(animatedItems);
      groups.forEach(clearGroup);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

export function useScrollCardPopReveal(scopeRef, dependencies = [], options = {}) {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const cards = gsap.utils.toArray(SCROLL_CARD_POP_SELECTOR, scope);
    if (!cards.length) return undefined;

    if (prefersReducedMotion()) {
      gsap.set(cards, { clearProps: "transform,transformOrigin,willChange" });
      return undefined;
    }

    const animations = [];
    const revealedCards = new WeakSet();
    let observer = null;
    let cancelIntroWait = null;

    gsap.set(cards, {
      scale: 0.001,
      y: 40,
      transformOrigin: "50% 50%",
      willChange: "transform",
    });

    const beginObserving = () => {
      observer = new IntersectionObserver((entries) => {
        const enteringCards = entries
          .filter(
            (entry) =>
              entry.isIntersecting &&
              entry.intersectionRatio >= (options.threshold ?? 0.12) &&
              !revealedCards.has(entry.target),
          )
          .sort((a, b) => a.boundingClientRect.left - b.boundingClientRect.left);

        enteringCards.forEach((entry, visibleIndex) => {
          const card = entry.target;
          revealedCards.add(card);
          const configuredDelay = Number(card.dataset.scrollRevealDelay || 0);
          const animation = gsap.to(card, {
            scale: 1,
            y: 0,
            duration: options.duration ?? 0.46,
            delay: configuredDelay + visibleIndex * (options.stagger ?? 0.04),
            ease: options.ease ?? "power3.inOut",
            overwrite: "auto",
          });
          animations.push(animation);
        });

        entries
          .filter(
            (entry) => !entry.isIntersecting && revealedCards.has(entry.target),
          )
          .forEach((entry) => {
            const card = entry.target;
            revealedCards.delete(card);
            const animation = gsap.to(card, {
              scale: 0.001,
              y: 40,
              duration: options.reverseDuration ?? 0.38,
              ease: options.reverseEase ?? "power3.inOut",
              overwrite: "auto",
            });
            animations.push(animation);
          });
      }, {
        threshold: [0, options.threshold ?? 0.12],
        rootMargin: options.rootMargin ?? "0px 0px -8% 0px",
      });

      cards.forEach((card) => observer.observe(card));
    };

    cancelIntroWait = waitForIntro(beginObserving);

    return () => {
      cancelIntroWait?.();
      observer?.disconnect();
      animations.forEach((animation) => animation.kill());
      gsap.killTweensOf(cards);
      gsap.set(cards, { clearProps: "transform,transformOrigin,willChange" });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
