"use client";

import { useEffect } from "react";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";

export const FULLSCREEN_LOCK_CHANGE_EVENT = "huestima-fullscreen-lock-change";

function notifyLockChange() {
  window.dispatchEvent(new Event(FULLSCREEN_LOCK_CHANGE_EVENT));
}

export function useFlagFullscreenLock(isLocked) {
  const { exitFullscreen } = useFullscreenMode();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;

    if (isLocked) {
      root.dataset.fullscreenLocked = "true";
      notifyLockChange();
      exitFullscreen();
    } else if (root.dataset.fullscreenLocked === "true") {
      delete root.dataset.fullscreenLocked;
      notifyLockChange();
    }

    return () => {
      if (isLocked && root.dataset.fullscreenLocked === "true") {
        delete root.dataset.fullscreenLocked;
        notifyLockChange();
      }
    };
  }, [exitFullscreen, isLocked]);
}
