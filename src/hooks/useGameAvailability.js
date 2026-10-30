"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSiteOperations } from "@/hooks/useSiteOperations";
import { useLanguage } from "@/hooks/useLanguage";
import { getAvailableGameHref, isConfiguredGameModeEnabled } from "@/lib/gameFamily";

export function useGameAvailability(gameFamily, gameMode) {
  const { operations, ready } = useSiteOperations();
  const { locale } = useLanguage();
  const router = useRouter();
  const allowed = !ready || isConfiguredGameModeEnabled(operations.gameConfiguration, gameFamily, gameMode);
  useEffect(() => {
    if (!allowed) router.replace(getAvailableGameHref(operations.gameConfiguration, locale));
  }, [allowed, locale, operations.gameConfiguration, router]);
  return allowed;
}
