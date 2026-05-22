"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FULLSCREEN_STORAGE_KEY } from "@/lib/constants";

const FULLSCREEN_CHANGE_EVENT = "huestima-fullscreen-change";

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

    writeStoredFullscreenMode(nextEnabled);
    applyFullscreenMode(nextEnabled);
    notifyFullscreenModeChange();
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
  };
}
