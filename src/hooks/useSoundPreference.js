"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getSoundEnabledSnapshot,
  setSoundEnabled,
  subscribeToSoundPreference,
} from "@/lib/sound";

export function useSoundPreference() {
  const isSoundEnabled = useSyncExternalStore(
    subscribeToSoundPreference,
    getSoundEnabledSnapshot,
    () => true,
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled(!getSoundEnabledSnapshot());
  }, []);

  return {
    isSoundEnabled,
    toggleSound,
  };
}
