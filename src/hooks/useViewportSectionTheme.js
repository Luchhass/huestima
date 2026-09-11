"use client";

import { useEffect, useRef, useState } from "react";

export function useViewportSectionTheme({
  attribute,
  defaultTheme = "dark",
  enabled = true,
  routeKey,
  sampleY,
  scrollSelector,
}) {
  const [theme, setTheme] = useState(defaultTheme);
  const themeRef = useRef(defaultTheme);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let frame = null;
    const scrollSurface = scrollSelector
      ? document.querySelector(scrollSelector)
      : null;

    const updateTheme = () => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        const pointY = typeof sampleY === "function" ? sampleY() : sampleY;
        const pointX = window.innerWidth / 2;
        const section = Array.from(document.querySelectorAll(`[${attribute}]`))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.top <= pointY &&
              rect.bottom > pointY &&
              rect.left <= pointX &&
              rect.right > pointX
            );
          })
          .at(-1);
        const nextTheme = section?.getAttribute(attribute) || defaultTheme;

        if (themeRef.current !== nextTheme) {
          themeRef.current = nextTheme;
          setTheme(nextTheme);
        }

        frame = null;
      });
    };

    updateTheme();
    window.addEventListener("scroll", updateTheme, { passive: true });
    window.addEventListener("resize", updateTheme);
    window.visualViewport?.addEventListener("resize", updateTheme);
    scrollSurface?.addEventListener("scroll", updateTheme, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateTheme);
      window.removeEventListener("resize", updateTheme);
      window.visualViewport?.removeEventListener("resize", updateTheme);
      scrollSurface?.removeEventListener("scroll", updateTheme);

      if (frame) cancelAnimationFrame(frame);
    };
  }, [attribute, defaultTheme, enabled, routeKey, sampleY, scrollSelector]);

  return enabled ? theme : defaultTheme;
}
