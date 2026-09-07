"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLandingRoute } from "../../../shared/landingRoutes.mjs";
import { LANGUAGE_STORAGE_KEY } from "@/lib/constants";
import { LANGUAGE_CHANGE_EVENT } from "@/hooks/useLanguage";

export default function RouteLanguageSync() {
  const pathname = usePathname();
  useEffect(() => {
    const route = getLandingRoute(pathname);
    if (!route) return;
    document.documentElement.lang = route.locale;
    document.documentElement.dataset.locale = route.locale;
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, route.locale); } catch { /* Private browsing can disable storage. */ }
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, [pathname]);
  return null;
}
