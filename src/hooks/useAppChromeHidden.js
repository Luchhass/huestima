"use client";

import { useEffect } from "react";

let hiddenRequestCount = 0;

function applyAppChromeState() {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (hiddenRequestCount > 0) {
    root.dataset.appChromeHidden = "true";
  } else if (root.dataset.appChromeHidden === "true") {
    delete root.dataset.appChromeHidden;
  }
}

export function useAppChromeHidden(hidden) {
  useEffect(() => {
    if (!hidden) return undefined;

    hiddenRequestCount += 1;
    applyAppChromeState();

    return () => {
      hiddenRequestCount = Math.max(0, hiddenRequestCount - 1);
      applyAppChromeState();
    };
  }, [hidden]);
}
