"use client";

import { useEffect, useRef, useState } from "react";

export function useCountdown({
  durationMs,
  isRunning,
  onComplete,
  initialElapsedMs = 0,
}) {
  const durationCentiseconds = Math.ceil(durationMs / 10);
  const normalizedInitialElapsedMs = Math.min(
    Math.max(0, initialElapsedMs),
    durationMs,
  );
  const initialRemainingCentiseconds = Math.ceil(
    Math.max(durationMs - normalizedInitialElapsedMs, 0) / 10,
  );
  const [remainingCentiseconds, setRemainingCentiseconds] = useState(
    initialRemainingCentiseconds,
  );
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const previousCentisecondsRef = useRef(initialRemainingCentiseconds);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const nextRemainingCentiseconds = Math.ceil(
      Math.max(durationMs - normalizedInitialElapsedMs, 0) / 10,
    );
    const timeoutId = window.setTimeout(() => {
      previousCentisecondsRef.current = nextRemainingCentiseconds;
      setRemainingCentiseconds(nextRemainingCentiseconds);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, normalizedInitialElapsedMs]);

  useEffect(() => {
    if (!isRunning) return undefined;

    if (durationMs - normalizedInitialElapsedMs <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
      return undefined;
    }

    const startTime = performance.now() - normalizedInitialElapsedMs;
    completedRef.current = false;
    previousCentisecondsRef.current = Math.ceil(
      Math.max(durationMs - normalizedInitialElapsedMs, 0) / 10,
    );

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
  }, [durationCentiseconds, durationMs, isRunning, normalizedInitialElapsedMs]);

  return {
    centiseconds: remainingCentiseconds,
  };
}
