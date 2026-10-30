"use client";

import { useEffect } from 'react';
import { addProfilePlayTime } from '@/lib/profile';

// Count visible, focused gameplay, including unfinished runs, without idle tabs.
export function useProfilePlayTime(active, multiplayer = false) {
  useEffect(() => {
    if (!active) return;
    let started = document.visibilityState === 'visible' && document.hasFocus() ? performance.now() : null;
    const flush = () => {
      const now = performance.now();
      if (started !== null) addProfilePlayTime(Math.max(0, Math.min(now - started, 10000)), multiplayer);
      started = document.visibilityState === 'visible' && document.hasFocus() ? now : null;
    };
    const stop = () => { flush(); started = null; };
    const interval = window.setInterval(flush, 5000);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('focus', flush);
    window.addEventListener('blur', stop);
    window.addEventListener('pagehide', stop);
    return () => {
      stop();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('focus', flush);
      window.removeEventListener('blur', stop);
      window.removeEventListener('pagehide', stop);
    };
  }, [active, multiplayer]);
}
