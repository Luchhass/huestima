"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { APP_NAME, MEMORIZE_DURATION_MS } from "@/lib/constants";
import { useCountdown } from "@/hooks/useCountdown";
import { useTranslation } from "@/hooks/useLanguage";
import {
  playMemorizeSecondTick,
  startMemorizeMechanism,
} from "@/lib/sound";
import CountdownReel from "./CountdownReel";
import MultiplayerProgressList from "./MultiplayerProgressList";

export default function MemorizePhase({
  round,
  onComplete,
  durationMs = MEMORIZE_DURATION_MS,
  progressItems = [],
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const roundRef = useRef(null);
  const brandRef = useRef(null);
  const progressRef = useRef(null);

  const { centiseconds } = useCountdown({
    durationMs,
    isRunning: true,
    onComplete,
  });

  useLayoutEffect(() => {
    const stopMechanism = startMemorizeMechanism(durationMs);

    const ctx = gsap.context(() => {
      const uiTimeline = gsap.timeline();

      gsap.set(roundRef.current, {
        yPercent: -120,
        autoAlpha: 0,
      });

      gsap.set(brandRef.current, {
        yPercent: 120,
        autoAlpha: 0,
      });

      if (progressRef.current) {
        gsap.set(progressRef.current, {
          yPercent: 80,
          autoAlpha: 0,
        });
      }

      uiTimeline
        .to(roundRef.current, {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.72,
          ease: "power4.out",
        })
        .to(
          brandRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.78,
            ease: "power4.out",
          },
          0.28,
        );

      if (progressRef.current) {
        uiTimeline.to(
          progressRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.72,
            ease: "power4.out",
          },
          0.16,
        );
      }
    }, scopeRef);

    return () => {
      stopMechanism();
      ctx.revert();
    };
  }, [durationMs]);

  return (
    <div
      ref={scopeRef}
      data-fullscreen-surface-transition
      className="relative h-full p-6 sm:p-8"
    >
      <div className="absolute top-6 left-6 overflow-hidden sm:top-8 sm:left-8">
        <p
          ref={roundRef}
          className="text-base font-semibold text-current/88"
        >
          {round}/5
        </p>
      </div>

      <div className="absolute top-6 right-6 text-right sm:top-8 sm:right-8">
        <CountdownReel
          durationMs={durationMs}
          currentCentiseconds={centiseconds}
          onSecondTick={playMemorizeSecondTick}
        />

        <p className="mt-2 text-sm font-semibold text-current/88">
          {t("game.secondsToRemember")}
        </p>
      </div>

      <div className="absolute right-6 bottom-6 overflow-hidden sm:right-8 sm:bottom-8">
        <p
          ref={brandRef}
          className="text-lg font-semibold text-current/88"
        >
          {APP_NAME}
        </p>
      </div>

      {progressItems.length > 0 && (
        <div
          ref={progressRef}
          className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8"
        >
          <MultiplayerProgressList items={progressItems} />
        </div>
      )}
    </div>
  );
}
