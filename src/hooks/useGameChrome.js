"use client";

import { useEffect } from "react";

export function useGameChrome(isImmersive) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;

    if (isImmersive) {
      root.dataset.gameImmersive = "true";
    } else if (root.dataset.gameImmersive === "true") {
      delete root.dataset.gameImmersive;
    }

    return () => {
      if (root.dataset.gameImmersive === "true") {
        delete root.dataset.gameImmersive;
      }
    };
  }, [isImmersive]);
}
