"use client";

import { useEffect, useRef, useState } from "react";

export function useCountdown({ durationMs, isRunning, onComplete }) {
  const durationCentiseconds = Math.ceil(durationMs / 10);
  const [remainingCentiseconds, setRemainingCentiseconds] = useState(durationCentiseconds);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const previousCentisecondsRef = useRef(durationCentiseconds);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const startTime = performance.now();
    completedRef.current = false;
    previousCentisecondsRef.current = durationCentiseconds;

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - startTime;
      const nextRemainingMs = Math.max(durationMs - elapsed, 0);
      const nextCentiseconds = Math.ceil(nextRemainingMs / 10);

      if (previousCentisecondsRef.current !== nextCentiseconds) {
        previousCentisecondsRef.current = nextCentiseconds;
        setRemainingCentiseconds(nextCentiseconds);
      }

      if (nextCentiseconds <= 0) {
        window.clearInterval(intervalId);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, 16);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [durationCentiseconds, durationMs, isRunning]);

  return {
    centiseconds: remainingCentiseconds,
  };
}
