"use client";

import { useEffect } from "react";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";

export const FLAG_FULLSCREEN_LOCK_CHANGE_EVENT = "huestima-flag-fullscreen-lock-change";

function notifyLockChange() {
  window.dispatchEvent(new Event(FLAG_FULLSCREEN_LOCK_CHANGE_EVENT));
}

export function useFlagFullscreenLock(isLocked) {
  const { exitFullscreen } = useFullscreenMode();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;

    if (isLocked) {
      root.dataset.flagFullscreenLocked = "true";
      notifyLockChange();
      exitFullscreen();
    } else if (root.dataset.flagFullscreenLocked === "true") {
      delete root.dataset.flagFullscreenLocked;
      notifyLockChange();
    }

    return () => {
      if (isLocked && root.dataset.flagFullscreenLocked === "true") {
        delete root.dataset.flagFullscreenLocked;
        notifyLockChange();
      }
    };
  }, [exitFullscreen, isLocked]);
}

