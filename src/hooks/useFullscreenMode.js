"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import gsap from "gsap";
import { SCREEN_REVEAL_REPLAY_EVENT } from "@/hooks/useScreenReveal";
import { FULLSCREEN_STORAGE_KEY } from "@/lib/constants";

export const FULLSCREEN_CHANGE_EVENT = "huestima-fullscreen-change";
const FULLSCREEN_TRANSITION_COVER_SELECTOR = "[data-fullscreen-transition-cover]";
const FULLSCREEN_CARD_SELECTOR =
  "[data-intro-card-target], .game-card-shell, .home-card";
const SURFACE_ONLY_PHASE_SELECTOR = "[data-fullscreen-surface-transition]";
const SCREEN_REVEAL_SELECTOR = "[data-screen-reveal]";
const EXTRA_FADE_SELECTOR = ".solo-close-button";
const LEAF_FADE_SELECTOR =
  "button,a,input,textarea,select,svg,canvas,.guess-picker-track,.guess-picker-thumb";
const RESIZE_DURATION = 0.72;
const SHRINK_DURATION = 0.66;
const CONTENT_FADE_DURATION = 0.26;
const NORMAL_CARD_MAX_WIDTH = 500;
const NORMAL_CARD_MAX_HEIGHT = 390;
const NORMAL_CARD_MIN_HEIGHT = 320;
const NORMAL_CARD_VIEWPORT_OFFSET = 132;

let isTransitioningFullscreen = false;

function readStoredFullscreenMode() {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(FULLSCREEN_STORAGE_KEY);
  return stored === "on" || stored === "true";
}

function writeStoredFullscreenMode(enabled) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(FULLSCREEN_STORAGE_KEY, enabled ? "on" : "off");
}

function applyFullscreenMode(enabled) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.fullscreenMode = enabled ? "on" : "off";
}

function notifyFullscreenModeChange() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(FULLSCREEN_CHANGE_EVENT));
}

function applyFullscreenTransitioning(isTransitioning) {
  if (typeof document === "undefined") return;

  if (isTransitioning) {
    document.documentElement.dataset.fullscreenTransitioning = "true";
    return;
  }

  delete document.documentElement.dataset.fullscreenTransitioning;
}

function readViewportBox() {
  const visualViewport = window.visualViewport;
  const width =
    visualViewport?.width ||
    document.documentElement.clientWidth ||
    window.innerWidth;
  const height =
    visualViewport?.height ||
    document.documentElement.clientHeight ||
    window.innerHeight;
  const left = visualViewport?.offsetLeft || 0;
  const top = visualViewport?.offsetTop || 0;

  return { top, left, width, height };
}

function isVisibleElement(element) {
  if (!(element instanceof HTMLElement)) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function nextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(resolve);
  });
}

async function waitForLayoutFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await nextFrame();
  }
}

function animateTo(targets, vars) {
  return new Promise((resolve) => {
    if (!targets || (Array.isArray(targets) && !targets.length)) {
      resolve();
      return;
    }

    const { onComplete, onInterrupt, ...animationVars } = vars;
    let settled = false;
    const finish = (callback) => {
      callback?.();

      if (settled) return;
      settled = true;
      resolve();
    };

    gsap.to(targets, {
      ...animationVars,
      overwrite: true,
      onComplete: () => finish(onComplete),
      onInterrupt: () => finish(onInterrupt),
    });
  });
}

function findTransitionCard() {
  const candidates = Array.from(
    document.querySelectorAll(FULLSCREEN_CARD_SELECTOR),
  ).filter((element) => {
    return (
      !element.matches(FULLSCREEN_TRANSITION_COVER_SELECTOR) &&
      isVisibleElement(element)
    );
  });

  if (!candidates.length) return null;

  return candidates.reduce((largest, candidate) => {
    const largestRect = largest.getBoundingClientRect();
    const candidateRect = candidate.getBoundingClientRect();
    const largestArea = largestRect.width * largestRect.height;
    const candidateArea = candidateRect.width * candidateRect.height;

    return candidateArea > largestArea ? candidate : largest;
  });
}

function hasDirectText(element) {
  return Array.from(element.childNodes).some((node) => {
    return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
  });
}

function removeNestedTargets(targets) {
  return targets.filter((target) => {
    return !targets.some((candidate) => {
      return candidate !== target && candidate.contains(target);
    });
  });
}

function getFallbackFadeTargets(root) {
  const targets = Array.from(root.querySelectorAll("*")).filter((element) => {
    if (!isVisibleElement(element)) return false;
    const closestCover = element.closest(FULLSCREEN_TRANSITION_COVER_SELECTOR);
    if (closestCover && closestCover !== root) {
      return false;
    }

    if (element.matches(LEAF_FADE_SELECTOR)) return true;
    return hasDirectText(element);
  });

  return removeNestedTargets(targets);
}

function getTransitionFadeTargets(root) {
  const screenRevealTargets = Array.from(
    root.querySelectorAll(SCREEN_REVEAL_SELECTOR),
  ).filter(isVisibleElement);
  const extraTargets = Array.from(
    root.querySelectorAll(EXTRA_FADE_SELECTOR),
  ).filter(isVisibleElement);
  const explicitTargets = removeNestedTargets([
    ...screenRevealTargets,
    ...extraTargets,
  ]);

  if (explicitTargets.length) {
    return explicitTargets;
  }

  return getFallbackFadeTargets(root);
}

function getExtraFadeTargets(root) {
  return Array.from(root.querySelectorAll(EXTRA_FADE_SELECTOR)).filter(
    isVisibleElement,
  );
}

function hasScreenRevealTargets(root) {
  return root.querySelector(SCREEN_REVEAL_SELECTOR) !== null;
}

function setImportantStyle(element, property, value) {
  element.style.setProperty(property, value, "important");
}

function createTransitionCover(card) {
  const rect = card.getBoundingClientRect();
  const styles = window.getComputedStyle(card);
  const cover = card.cloneNode(true);

  cover.setAttribute("data-fullscreen-transition-cover", "true");
  cover.setAttribute("aria-hidden", "true");

  cover.removeAttribute("id");
  cover.classList.remove("game-card-shell", "home-card");

  setImportantStyle(cover, "position", "fixed");
  setImportantStyle(cover, "top", `${rect.top}px`);
  setImportantStyle(cover, "left", `${rect.left}px`);
  setImportantStyle(cover, "width", `${rect.width}px`);
  setImportantStyle(cover, "max-width", "none");
  setImportantStyle(cover, "height", `${rect.height}px`);
  setImportantStyle(cover, "min-height", "0px");
  setImportantStyle(cover, "margin", "0px");
  setImportantStyle(cover, "border-radius", styles.borderRadius || "24px");
  setImportantStyle(cover, "box-shadow", styles.boxShadow || "none");
  setImportantStyle(cover, "transform", "none");
  setImportantStyle(cover, "transform-origin", "top left");
  setImportantStyle(cover, "transition", "none");
  setImportantStyle(cover, "opacity", "1");
  setImportantStyle(cover, "visibility", "visible");
  setImportantStyle(cover, "overflow", "hidden");
  setImportantStyle(cover, "pointer-events", "auto");
  setImportantStyle(cover, "z-index", "9998");
  setImportantStyle(
    cover,
    "will-change",
    "top,left,width,height,border-radius,box-shadow,opacity",
  );

  document.body.appendChild(cover);
  return cover;
}

function createSurfaceTransitionCover(card) {
  const rect = card.getBoundingClientRect();
  const styles = window.getComputedStyle(card);
  const cover = document.createElement("div");

  cover.setAttribute("data-fullscreen-transition-cover", "true");
  cover.setAttribute("aria-hidden", "true");

  setImportantStyle(cover, "position", "fixed");
  setImportantStyle(cover, "top", `${rect.top}px`);
  setImportantStyle(cover, "left", `${rect.left}px`);
  setImportantStyle(cover, "width", `${rect.width}px`);
  setImportantStyle(cover, "max-width", "none");
  setImportantStyle(cover, "height", `${rect.height}px`);
  setImportantStyle(cover, "min-height", "0px");
  setImportantStyle(cover, "margin", "0px");
  setImportantStyle(cover, "border-radius", styles.borderRadius || "24px");
  setImportantStyle(cover, "background", styles.background || styles.backgroundColor);
  setImportantStyle(cover, "box-shadow", styles.boxShadow || "none");
  setImportantStyle(cover, "transform", "none");
  setImportantStyle(cover, "transform-origin", "top left");
  setImportantStyle(cover, "transition", "none");
  setImportantStyle(cover, "opacity", "1");
  setImportantStyle(cover, "visibility", "visible");
  setImportantStyle(cover, "overflow", "hidden");
  setImportantStyle(cover, "pointer-events", "auto");
  setImportantStyle(cover, "z-index", "9998");
  setImportantStyle(
    cover,
    "will-change",
    "top,left,width,height,border-radius,box-shadow,opacity",
  );

  document.body.appendChild(cover);
  return cover;
}

function createFullscreenTransitionCover(card) {
  if (card.querySelector(SURFACE_ONLY_PHASE_SELECTOR)) {
    return createSurfaceTransitionCover(card);
  }

  return createTransitionCover(card);
}

function createViewportSurfaceCover() {
  const viewport = readViewportBox();
  const cover = document.createElement("div");

  cover.setAttribute("data-fullscreen-transition-cover", "true");
  cover.setAttribute("aria-hidden", "true");

  setImportantStyle(cover, "position", "fixed");
  setImportantStyle(cover, "top", `${viewport.top}px`);
  setImportantStyle(cover, "left", `${viewport.left}px`);
  setImportantStyle(cover, "width", `${viewport.width}px`);
  setImportantStyle(cover, "height", `${viewport.height}px`);
  setImportantStyle(cover, "max-width", "none");
  setImportantStyle(cover, "min-height", "0px");
  setImportantStyle(cover, "margin", "0px");
  setImportantStyle(cover, "border-radius", "0px");
  setImportantStyle(cover, "background", "#000000");
  setImportantStyle(cover, "box-shadow", "none");
  setImportantStyle(cover, "transition", "none");
  setImportantStyle(cover, "opacity", "1");
  setImportantStyle(cover, "visibility", "visible");
  setImportantStyle(cover, "overflow", "hidden");
  setImportantStyle(cover, "pointer-events", "auto");
  setImportantStyle(cover, "z-index", "9998");
  setImportantStyle(
    cover,
    "will-change",
    "top,left,width,height,border-radius,box-shadow,opacity",
  );

  document.body.appendChild(cover);
  return cover;
}

function replayVisibleScreenReveals(delay = 0) {
  window.setTimeout(() => {
    window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
  }, delay);
}

function applyAndNotifyFullscreenMode(enabled) {
  writeStoredFullscreenMode(enabled);
  applyFullscreenMode(enabled);
  notifyFullscreenModeChange();
}

function getCoverBox(cover) {
  const rect = cover.getBoundingClientRect();
  const styles = window.getComputedStyle(cover);

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: styles.borderRadius,
    boxShadow: styles.boxShadow,
  };
}

function readElementBox(element) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: styles.borderRadius,
    boxShadow: styles.boxShadow,
  };
}

function parsePixelValue(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readNormalGameCardBox(element) {
  const viewport = readViewportBox();
  const styles = window.getComputedStyle(element);
  const pagePadding =
    parseFloat(
      window.getComputedStyle(document.documentElement).getPropertyValue(
        "--app-page-padding",
      ),
    ) || 24;
  const availableWidth = Math.max(0, viewport.width - pagePadding * 2);
  const availableHeight = Math.max(0, viewport.height - pagePadding * 2);
  const width = Math.min(availableWidth, NORMAL_CARD_MAX_WIDTH);
  const height = Math.max(
    NORMAL_CARD_MIN_HEIGHT,
    Math.min(viewport.height - NORMAL_CARD_VIEWPORT_OFFSET, NORMAL_CARD_MAX_HEIGHT),
  );

  return {
    top: viewport.top + pagePadding + Math.max(0, (availableHeight - height) / 2),
    left: viewport.left + pagePadding + Math.max(0, (availableWidth - width) / 2),
    width,
    height,
    borderRadius: styles.borderRadius || "26px",
    boxShadow: styles.boxShadow || "none",
  };
}

function setCoverBox(cover, box) {
  setImportantStyle(cover, "top", `${box.top}px`);
  setImportantStyle(cover, "left", `${box.left}px`);
  setImportantStyle(cover, "width", `${box.width}px`);
  setImportantStyle(cover, "height", `${box.height}px`);
  setImportantStyle(cover, "border-radius", box.borderRadius || "0px");
  setImportantStyle(cover, "box-shadow", box.boxShadow || "none");
}

function animateCoverToBox(cover, targetBox, vars) {
  const currentBox = getCoverBox(cover);
  const state = {
    top: currentBox.top,
    left: currentBox.left,
    width: currentBox.width,
    height: currentBox.height,
    borderRadius: parsePixelValue(currentBox.borderRadius),
  };
  const targetRadius = parsePixelValue(targetBox.borderRadius);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;

      settled = true;
      setCoverBox(cover, targetBox);
      resolve();
    };

    gsap.to(state, {
      top: targetBox.top,
      left: targetBox.left,
      width: targetBox.width,
      height: targetBox.height,
      borderRadius: targetRadius,
      duration: vars.duration,
      ease: vars.ease,
      overwrite: true,
      onUpdate: () => {
        setImportantStyle(cover, "top", `${state.top}px`);
        setImportantStyle(cover, "left", `${state.left}px`);
        setImportantStyle(cover, "width", `${state.width}px`);
        setImportantStyle(cover, "height", `${state.height}px`);
        setImportantStyle(cover, "border-radius", `${state.borderRadius}px`);
      },
      onComplete: finish,
      onInterrupt: finish,
    });
  });
}

function fadeVisibleContentBackIn(card, delay = 0) {
  const targets = getTransitionFadeTargets(card);
  if (!targets.length) return;

  gsap.fromTo(
    targets,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: 0.34,
      delay,
      ease: "power2.out",
      overwrite: true,
      clearProps: "opacity,visibility",
    },
  );
}

function isGameImmersiveLayout() {
  return document.documentElement.dataset.gameImmersive === "true";
}

async function fadeCoverContent(cover) {
  await animateTo(getTransitionFadeTargets(cover), {
    autoAlpha: 0,
    duration: CONTENT_FADE_DURATION,
    ease: "power2.out",
    stagger: 0.012,
  });
}

async function playFullscreenModeTransition(nextEnabled) {
  if (typeof window === "undefined") {
    applyAndNotifyFullscreenMode(nextEnabled);
    return;
  }

  if (isTransitioningFullscreen) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    applyAndNotifyFullscreenMode(nextEnabled);
    replayVisibleScreenReveals();
    return;
  }

  const card = findTransitionCard();
  if (!card) {
    applyAndNotifyFullscreenMode(nextEnabled);
    replayVisibleScreenReveals();
    return;
  }

  document
    .querySelectorAll(FULLSCREEN_TRANSITION_COVER_SELECTOR)
    .forEach((cover) => cover.remove());

  isTransitioningFullscreen = true;
  applyFullscreenTransitioning(true);

  const wasScreenRevealDriven = hasScreenRevealTargets(card);
  const isImmersiveLayout = isGameImmersiveLayout();
  let cover = null;
  let hiddenSourceCard = null;
  let hiddenTargetCard = null;

  try {
    if (nextEnabled) {
      cover = createFullscreenTransitionCover(card);
      hiddenSourceCard = card;
      gsap.set(hiddenSourceCard, { autoAlpha: 0 });
      await fadeCoverContent(cover);

      const viewport = readViewportBox();

      await animateTo(cover, {
        top: viewport.top,
        left: viewport.left,
        width: viewport.width,
        height: viewport.height,
        borderRadius: 0,
        boxShadow: "none",
        duration: RESIZE_DURATION,
        ease: "expo.inOut",
      });

      applyAndNotifyFullscreenMode(nextEnabled);
      await waitForLayoutFrames();

      if (hiddenSourceCard) {
        gsap.set(hiddenSourceCard, {
          autoAlpha: 1,
          clearProps: "opacity,visibility",
        });
        hiddenSourceCard = null;
      }

      if (!isImmersiveLayout) {
        replayVisibleScreenReveals(30);

        const nextCard = findTransitionCard();
        if (nextCard && !hasScreenRevealTargets(nextCard)) {
          fadeVisibleContentBackIn(nextCard, 0.08);
        }
      }

      await animateTo(cover, {
        autoAlpha: 0,
        duration: 0.34,
        delay: 0.08,
        ease: "power2.out",
      });
    } else {
      if (isImmersiveLayout) {
        cover = createFullscreenTransitionCover(card);
        await fadeCoverContent(cover);
      } else {
        const fadeTargets = getTransitionFadeTargets(card);
        await animateTo(fadeTargets, {
          autoAlpha: 0,
          duration: CONTENT_FADE_DURATION,
          ease: "power2.out",
          stagger: fadeTargets.length > 6 ? 0.012 : 0.025,
        });

        cover = createViewportSurfaceCover();
      }

      const coverStartBox = getCoverBox(cover);

      applyAndNotifyFullscreenMode(nextEnabled);

      const targetCard = findTransitionCard();
      if (targetCard) {
        hiddenTargetCard = targetCard;
        gsap.set(hiddenTargetCard, { autoAlpha: 0 });
      }

      await waitForLayoutFrames();

      const targetBox =
        isImmersiveLayout && (targetCard || card)
          ? readNormalGameCardBox(targetCard || card)
          : targetCard
            ? readElementBox(targetCard)
            : readViewportBox();

      setCoverBox(cover, coverStartBox);

      await animateCoverToBox(cover, targetBox, {
        duration: SHRINK_DURATION,
        ease: "expo.inOut",
      });

      if (targetCard) {
        gsap.set(targetCard, {
          autoAlpha: 1,
          clearProps: "opacity,visibility",
        });

        if (hasScreenRevealTargets(targetCard)) {
          replayVisibleScreenReveals(0);
        } else {
          fadeVisibleContentBackIn(targetCard, 0);
        }
      }

      await animateTo(cover, {
        autoAlpha: 0,
        duration: 0.28,
        delay: 0.08,
        ease: "power2.out",
      });
    }
  } finally {
    cover?.remove();

    if (hiddenTargetCard) {
      gsap.set(hiddenTargetCard, {
        autoAlpha: 1,
        clearProps: "opacity,visibility",
      });
    }

    if (hiddenSourceCard) {
      gsap.set(hiddenSourceCard, {
        autoAlpha: 1,
        clearProps: "opacity,visibility",
      });
    }

    const activeCard = findTransitionCard();
    if (!isImmersiveLayout && activeCard) {
      gsap.to(getExtraFadeTargets(activeCard), {
        autoAlpha: 1,
        duration: 0.24,
        ease: "power2.out",
        overwrite: true,
        clearProps: "opacity,visibility",
      });
    }

    if (
      !isImmersiveLayout &&
      !wasScreenRevealDriven &&
      activeCard &&
      !hasScreenRevealTargets(activeCard)
    ) {
      gsap.set(getTransitionFadeTargets(activeCard), {
        clearProps: "opacity,visibility",
      });
    }

    isTransitioningFullscreen = false;
    applyFullscreenTransitioning(false);
  }
}

function getFullscreenSnapshot() {
  return readStoredFullscreenMode();
}

function subscribeToFullscreenMode(callback) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event) => {
    if (event.key !== FULLSCREEN_STORAGE_KEY) return;

    const enabled = event.newValue === "on" || event.newValue === "true";
    applyFullscreenMode(enabled);
    callback();
  };

  const handleLocalChange = () => {
    applyFullscreenMode(readStoredFullscreenMode());
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(FULLSCREEN_CHANGE_EVENT, handleLocalChange);

  applyFullscreenMode(readStoredFullscreenMode());

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FULLSCREEN_CHANGE_EVENT, handleLocalChange);
  };
}

export function useFullscreenMode() {
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenMode,
    getFullscreenSnapshot,
    () => false,
  );

  const toggleFullscreen = useCallback(() => {
    const nextEnabled = !readStoredFullscreenMode();

    playFullscreenModeTransition(nextEnabled);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (!readStoredFullscreenMode()) return;

    playFullscreenModeTransition(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (!readStoredFullscreenMode()) return;

      event.preventDefault();
      exitFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exitFullscreen]);

  return {
    isFullscreen,
    toggleFullscreen,
    exitFullscreen,
  };
}
