"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/constants";

function getStoredTheme() {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getThemeSnapshot() {
  if (typeof document === "undefined") return "light";

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeToTheme(callback) {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleStorage = (event) => {
    if (event.key !== THEME_STORAGE_KEY) return;

    const nextTheme = event.newValue === "dark" ? "dark" : "light";
    applyTheme(nextTheme);
    callback();
  };

  const handlePreferenceChange = () => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return;

    applyTheme(mediaQuery.matches ? "dark" : "light");
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("huestima-theme-change", callback);
  mediaQuery.addEventListener("change", handlePreferenceChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("huestima-theme-change", callback);
    mediaQuery.removeEventListener("change", handlePreferenceChange);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");

  const toggleTheme = useCallback(() => {
    const currentTheme = getStoredTheme();
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("huestima-theme-change"));
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };
}
