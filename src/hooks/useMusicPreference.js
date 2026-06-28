"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getMusicEnabledSnapshot,
  setMusicEnabled,
  subscribeToMusicPreference,
} from "@/lib/music";

export function useMusicPreference() {
  const isMusicEnabled = useSyncExternalStore(
    subscribeToMusicPreference,
    getMusicEnabledSnapshot,
    () => true,
  );

  const toggleMusic = useCallback(() => {
    setMusicEnabled(!getMusicEnabledSnapshot());
  }, []);

  return {
    isMusicEnabled,
    toggleMusic,
  };
}
