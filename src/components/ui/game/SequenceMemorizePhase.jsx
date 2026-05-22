"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { APP_NAME, ROUND_COUNT, SEQUENCE_MEMORIZE_DURATION_MS } from "@/lib/constants";
import CountdownReel from "./CountdownReel";
import MultiplayerProgressList from "./MultiplayerProgressList";
import {
  playMemorizeSecondTick,
  playSequenceColorStep,
  startMemorizeMechanism,
} from "@/lib/sound";

function clampSequenceProgress(value) {
  return Math.min(1, Math.max(0, value));
}

export default function SequenceMemorizePhase({
  colors,
  durationMs = SEQUENCE_MEMORIZE_DURATION_MS,
  onColorChange,
  onComplete,
  progressItems = [],
}) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const lastColorIndexRef = useRef(0);
  const lastSecondRef = useRef(Math.ceil(durationMs / 1000));
  const onColorChangeRef = useRef(onColorChange);
  const onCompleteRef = useRef(onComplete);

  const visibleColors = useMemo(
    () => colors.filter(Boolean).slice(0, ROUND_COUNT),
    [colors],
  );

  useEffect(() => {
    onColorChangeRef.current = onColorChange;
  }, [onColorChange]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!visibleColors.length) return undefined;

    const totalDuration = visibleColors.length * durationMs;
    const startTime = performance.now();
    const stopMechanism = startMemorizeMechanism(totalDuration);
    let completed = false;

    lastColorIndexRef.current = 0;
    lastSecondRef.current = Math.ceil(durationMs / 1000);
    playSequenceColorStep(0);

    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const clampedElapsed = Math.min(elapsed, totalDuration);
      const nextIndex = Math.min(
        Math.floor(clampedElapsed / durationMs),
        visibleColors.length - 1,
      );
      const elapsedInColor = clampedElapsed - nextIndex * durationMs;
      const nextRemainingMs = Math.max(durationMs - elapsedInColor, 0);

      setActiveIndex(nextIndex);
      setRemainingMs(nextRemainingMs);

      const colorChanged = lastColorIndexRef.current !== nextIndex;

      if (colorChanged) {
        lastColorIndexRef.current = nextIndex;
        lastSecondRef.current = Math.ceil(nextRemainingMs / 1000);
        playSequenceColorStep(nextIndex);
        onColorChangeRef.current?.(visibleColors[nextIndex]);
      }

      const nextSecond = Math.ceil(nextRemainingMs / 1000);
      if (!colorChanged && nextSecond !== lastSecondRef.current) {
        lastSecondRef.current = nextSecond;
        playMemorizeSecondTick(clampSequenceProgress(clampedElapsed / totalDuration));
      }

      if (elapsed >= totalDuration && !completed) {
        completed = true;
        window.clearInterval(intervalId);
        stopMechanism();
        onCompleteRef.current?.();
      }
    }, 50);

    return () => {
      window.clearInterval(intervalId);
      stopMechanism();
    };
  }, [durationMs, visibleColors]);

  const activeColor = visibleColors[activeIndex];
  const remainingCentiseconds = Math.max(0, Math.ceil(remainingMs / 10));

  return (
    <div className="relative h-full p-6 sm:p-8">
      <div className="absolute left-6 top-6 sm:left-8 sm:top-8">
        <p className="text-base font-semibold text-current/88">
          {activeIndex + 1}/{visibleColors.length || ROUND_COUNT}
        </p>
      </div>

      <div className="absolute right-6 top-6 text-right sm:right-8 sm:top-8">
        <CountdownReel
          key={`sequence-countdown-${activeIndex}-${durationMs}`}
          durationMs={durationMs}
          currentCentiseconds={remainingCentiseconds}
        />
        <p className="mt-2 text-sm font-semibold text-current/88">
          {t("game.secondsToRemember")}
        </p>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-5 sm:bottom-8 sm:left-8 sm:right-8">
        <div className="min-w-0 space-y-3">
          {progressItems.length > 0 && (
            <MultiplayerProgressList items={progressItems} />
          )}

          <div className="flex gap-2">
            {visibleColors.map((color, index) => {
              const hasAppeared = index <= activeIndex;

              return (
                <span
                  key={`${color.hex}-${index}`}
                  className={`grid size-4 place-items-center rounded-full text-[0.55rem] font-bold leading-none ring-1 transition-transform ${
                    index === activeIndex
                      ? "scale-125 ring-white/80"
                      : "ring-white/24"
                  } ${
                    hasAppeared
                      ? "text-transparent"
                      : "bg-black text-white/62"
                  }`}
                  style={hasAppeared ? { backgroundColor: color.hex } : undefined}
                  aria-hidden="true"
                >
                  {hasAppeared ? "" : "?"}
                </span>
              );
            })}
          </div>
        </div>

        <p className="text-lg font-semibold text-current/88">
          {APP_NAME}
        </p>
      </div>

      <span className="sr-only">
        {t("game.memorizingSequenceColor", {
          index: activeIndex + 1,
          color: activeColor?.hex,
        })}
      </span>
    </div>
  );
}
