"use client";

import { useEffect, useState } from "react";

const NORMAL_MAX_HEIGHT = 390;
const EXPANDED_MAX_HEIGHT = 520;
const NORMAL_VIEWPORT_OFFSET = 132;
const EXPANDED_VIEWPORT_OFFSET = 88;
const MIN_CARD_HEIGHT = 320;

function getViewportHeight() {
  if (typeof window === "undefined") return null;

  return (
    window.visualViewport?.height ||
    document.documentElement.clientHeight ||
    window.innerHeight
  );
}

function readCardHeight(isExpanded) {
  const viewportHeight = getViewportHeight();
  const maxHeight = isExpanded ? EXPANDED_MAX_HEIGHT : NORMAL_MAX_HEIGHT;
  const offset = isExpanded
    ? EXPANDED_VIEWPORT_OFFSET
    : NORMAL_VIEWPORT_OFFSET;

  if (!viewportHeight) return `${maxHeight}px`;

  return `${Math.max(
    MIN_CARD_HEIGHT,
    Math.min(viewportHeight - offset, maxHeight),
  )}px`;
}

export function useResponsiveCardHeight(isExpanded) {
  const [height, setHeight] = useState(() => readCardHeight(isExpanded));

  useEffect(() => {
    const updateHeight = () => setHeight(readCardHeight(isExpanded));
    const viewport = window.visualViewport;

    updateHeight();
    window.addEventListener("resize", updateHeight);
    viewport?.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      viewport?.removeEventListener("resize", updateHeight);
    };
  }, [isExpanded]);

  return height;
}
