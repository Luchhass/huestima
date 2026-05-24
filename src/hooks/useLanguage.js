"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { LANGUAGE_STORAGE_KEY } from "@/lib/constants";
import { DEFAULT_LOCALE, normalizeLocale, translate } from "@/lib/i18n";

export const LANGUAGE_CHANGE_EVENT = "huestima-language-change";

function readStoredLanguage() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  return normalizeLocale(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function applyLanguage(locale) {
  if (typeof document === "undefined") return;

  const cleanLocale = normalizeLocale(locale);
  document.documentElement.lang = cleanLocale;
  document.documentElement.dataset.locale = cleanLocale;
}

function getLanguageSnapshot() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  return normalizeLocale(document.documentElement.dataset.locale);
}

function subscribeToLanguage(callback) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event) => {
    if (event.key !== LANGUAGE_STORAGE_KEY) return;

    applyLanguage(event.newValue);
    callback();
  };

  const handleLocalChange = () => {
    applyLanguage(readStoredLanguage());
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLocalChange);
  applyLanguage(readStoredLanguage());

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLocalChange);
  };
}

export function useLanguage() {
  const locale = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    () => DEFAULT_LOCALE,
  );

  const setLanguage = useCallback((nextLocale) => {
    const cleanLocale = normalizeLocale(nextLocale);
    const currentLocale = getLanguageSnapshot();

    if (cleanLocale === currentLocale) return;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, cleanLocale);
    applyLanguage(cleanLocale);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(locale === "en" ? "tr" : "en");
  }, [locale, setLanguage]);

  const t = useCallback(
    (key, values) => translate(locale, key, values),
    [locale],
  );

  return useMemo(
    () => ({
      locale,
      nextLocale: locale === "en" ? "tr" : "en",
      setLanguage,
      toggleLanguage,
      t,
    }),
    [locale, setLanguage, t, toggleLanguage],
  );
}

export function useTranslation() {
  return useLanguage();
}
