"use client";

import { useEffect, useState } from "react";

const NORMAL_MAX_HEIGHT = 390;
const COMPACT_MAX_HEIGHT = 300;
const EXPANDED_MAX_HEIGHT = 520;
const NORMAL_VIEWPORT_OFFSET = 132;
const COMPACT_VIEWPORT_OFFSET = 224;
const EXPANDED_VIEWPORT_OFFSET = 88;
const MIN_CARD_HEIGHT = 320;
const MIN_COMPACT_CARD_HEIGHT = 244;

function getViewportHeight() {
  if (typeof window === "undefined") return null;

  return (
    window.visualViewport?.height ||
    document.documentElement.clientHeight ||
    window.innerHeight
  );
}

function readCardHeight(isExpanded, heightMode = "normal") {
  const viewportHeight = getViewportHeight();
  const isCompact = !isExpanded && heightMode === "compact";
  const maxHeight = isExpanded
    ? EXPANDED_MAX_HEIGHT
    : isCompact
      ? COMPACT_MAX_HEIGHT
      : NORMAL_MAX_HEIGHT;
  const offset = isExpanded
    ? EXPANDED_VIEWPORT_OFFSET
    : isCompact
      ? COMPACT_VIEWPORT_OFFSET
      : NORMAL_VIEWPORT_OFFSET;
  const minHeight = isCompact ? MIN_COMPACT_CARD_HEIGHT : MIN_CARD_HEIGHT;

  if (!viewportHeight) return `${maxHeight}px`;

  return `${Math.max(
    minHeight,
    Math.min(viewportHeight - offset, maxHeight),
  )}px`;
}

export function useResponsiveCardHeight(isExpanded, heightMode = "normal") {
  const [height, setHeight] = useState(
    isExpanded
      ? `${EXPANDED_MAX_HEIGHT}px`
      : heightMode === "compact"
        ? `${COMPACT_MAX_HEIGHT}px`
        : `${NORMAL_MAX_HEIGHT}px`,
  );

  useEffect(() => {
    const updateHeight = () => setHeight(readCardHeight(isExpanded, heightMode));
    const viewport = window.visualViewport;

    updateHeight();
    window.addEventListener("resize", updateHeight);
    viewport?.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      viewport?.removeEventListener("resize", updateHeight);
    };
  }, [heightMode, isExpanded]);

  return height;
}
