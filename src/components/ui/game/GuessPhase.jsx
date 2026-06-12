"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, Crown } from "lucide-react";
import AdminProtectorOverlay from "@/components/admin/AdminProtectorOverlay";
import HSVColorPicker from "@/components/ui/color-picker/HSVColorPicker";
import HueSlider from "@/components/ui/color-picker/HueSlider";
import { useAdminMode } from "@/hooks/useAdminMode";
import { useCountdown } from "@/hooks/useCountdown";
import { useTranslation } from "@/hooks/useLanguage";
import { isGradientColor } from "@/lib/color";
import { APP_NAME } from "@/lib/constants";
import CountdownReel from "./CountdownReel";
import MultiplayerProgressList from "./MultiplayerProgressList";

export default function GuessPhase({
  round,
  roundLabel = `${round}/5`,
  difficulty,
  targetColor = null,
  guessColor,
  onGuessChange,
  onSubmit,
  guessDurationMs = null,
  progressItems = [],
}) {
  const { t } = useTranslation();
  const {
    cancelUnlockRequest,
    enabled: isAdminModeEnabled,
    enableAdmin,
    pendingUnlock,
  } = useAdminMode();
  const scopeRef = useRef(null);
  const roundRef = useRef(null);
  const timerRef = useRef(null);
  const brandRef = useRef(null);
  const progressRef = useRef(null);
  const timedSubmitRef = useRef(false);

  const adminButtonRef = useRef(null);
  const adminButtonCoreRef = useRef(null);
  const adminButtonRingRef = useRef(null);
  const adminIconRef = useRef(null);
  const submitButtonRef = useRef(null);
  const submitButtonCoreRef = useRef(null);
  const submitButtonRingRef = useRef(null);
  const submitIconRef = useRef(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const isGradientGuess = isGradientColor(guessColor);
  const sidePickerWidth = 50;
  const pickerWidth = isGradientGuess
    ? sidePickerWidth
    : difficulty.controls.length * sidePickerWidth;
  const rightPickerWidth = isGradientGuess ? sidePickerWidth : 0;
  const contentLeft = pickerWidth + 24;
  const contentLeftSm = pickerWidth + 32;
  const contentRight = rightPickerWidth + 24;
  const contentRightSm = rightPickerWidth + 32;
  const actionReserveWidth = isAdminModeEnabled ? 156 : 88;
  const controlsKey = difficulty.controls.join("-");
  const timedGuessDurationMs =
    Number.isFinite(guessDurationMs) && guessDurationMs > 0 ? guessDurationMs : 0;
  const isTimedGuess = timedGuessDurationMs > 0;

  const handleTimedSubmit = useCallback(() => {
    if (timedSubmitRef.current) return;

    timedSubmitRef.current = true;
    onSubmit();
  }, [onSubmit]);

  const handleSubmitClick = useCallback(() => {
    if (!isTimedGuess) {
      onSubmit();
      return;
    }

    handleTimedSubmit();
  }, [handleTimedSubmit, isTimedGuess, onSubmit]);

  const handleAdminPerfectGuess = useCallback(() => {
    if (!isAdminModeEnabled || !targetColor) return;

    onGuessChange(targetColor);
  }, [isAdminModeEnabled, onGuessChange, targetColor]);

  const { centiseconds } = useCountdown({
    durationMs: timedGuessDurationMs,
    isRunning: isTimedGuess && timerRunning,
    onComplete: handleTimedSubmit,
  });
  const edgeTrackClassName =
    "guess-picker-track h-full w-[50px] rounded-none border-0 shadow-none sm:h-full sm:w-[50px]";
  const edgeHandleClassName =
    "guess-picker-thumb size-5 shadow-[0_5px_14px_rgba(0,0,0,0.24)]";

  const handleGradientHueChange = useCallback(
    (side, h) => {
      onGuessChange({
        ...guessColor,
        [side]: {
          ...guessColor[side],
          h,
        },
      });
    },
    [guessColor, onGuessChange],
  );

  useLayoutEffect(() => {
    timedSubmitRef.current = false;

    const ctx = gsap.context(() => {
      const pickerTracks = gsap.utils.toArray(
        ".guess-picker-track:not(.guess-picker-track--right)",
      );
      const rightPickerTracks = gsap.utils.toArray(".guess-picker-track--right");
      const pickerThumbs = gsap.utils.toArray(".guess-picker-thumb");
      const checkPath = submitIconRef.current?.querySelector("path");

      gsap.set(roundRef.current, {
        yPercent: -120,
        autoAlpha: 0,
      });

      if (timerRef.current) {
        gsap.set(timerRef.current, {
          yPercent: 80,
          autoAlpha: 0,
        });
      }

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

      if (adminButtonRef.current) {
        gsap.set(adminButtonRef.current, {
          autoAlpha: 0,
        });

        gsap.set(adminButtonCoreRef.current, {
          scale: 0,
          rotation: 10,
          transformOrigin: "center center",
          force3D: true,
        });

        gsap.set(adminButtonRingRef.current, {
          scale: 0.22,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });

        gsap.set(adminIconRef.current, {
          scale: 0.72,
          rotation: 8,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });
      }

      gsap.set(pickerTracks, {
        xPercent: -104,
        autoAlpha: 0,
        force3D: true,
      });

      gsap.set(rightPickerTracks, {
        xPercent: 104,
        autoAlpha: 0,
        force3D: true,
      });

      gsap.set(pickerThumbs, {
        scale: 0,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      // Fancy submit button initial state
      gsap.set(submitButtonRef.current, {
        autoAlpha: 0,
      });

      gsap.set(submitButtonCoreRef.current, {
        scale: 0,
        rotation: -10,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(submitButtonRingRef.current, {
        scale: 0.22,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(submitIconRef.current, {
        scale: 0.72,
        rotation: -8,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      if (checkPath) {
        const pathLength = checkPath.getTotalLength();

        gsap.set(checkPath, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
        });
      }

      const timeline = gsap.timeline();

      timeline
        // Sol slider barları
        .to(pickerTracks, {
          xPercent: 0,
          autoAlpha: 1,
          duration: 0.76,
          ease: "expo.out",
          stagger: 0.075,
          clearProps: "transform,opacity,visibility",
        })
        .to(
          rightPickerTracks,
          {
            xPercent: 0,
            autoAlpha: 1,
            duration: 0.76,
            ease: "expo.out",
            stagger: 0.075,
            clearProps: "transform,opacity,visibility",
          },
          0,
        )

        // 1/5
        .to(
          roundRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.72,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility",
          },
          0.1
        )

        // Huestima
        .to(
          brandRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.78,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility",
          },
          0.34
        )

        // Slider yuvarlakları — aynen korundu
        .to(
          pickerThumbs,
          {
            keyframes: [
              {
                scale: 1.08,
                autoAlpha: 1,
                duration: 0.2,
                ease: "power4.out",
              },
              {
                scale: 1,
                duration: 0.12,
                ease: "expo.out",
              },
            ],
            stagger: 0.05,
            clearProps: "transform,opacity,visibility",
          },
          0.46
        )

        // Submit butonu görünür olur
        .set(
          submitButtonRef.current,
          {
            autoAlpha: 1,
          },
          0.54
        )

        // Büyük beyaz core — fancy popup
        .to(
          submitButtonCoreRef.current,
          {
            scale: 1.18,
            rotation: 2.6,
            duration: 0.2,
            ease: "expo.out",
          },
          0.54
        )
        .to(
          submitButtonCoreRef.current,
          {
            scale: 0.94,
            rotation: -1.2,
            duration: 0.09,
            ease: "power3.out",
          },
          0.74
        )
        .to(
          submitButtonCoreRef.current,
          {
            scale: 1,
            rotation: 0,
            duration: 0.12,
            ease: "expo.out",
            clearProps: "transform",
          },
          0.83
        )

        // Ring burst
        .to(
          submitButtonRingRef.current,
          {
            scale: 1.5,
            autoAlpha: 0.72,
            duration: 0.26,
            ease: "expo.out",
          },
          0.56
        )
        .to(
          submitButtonRingRef.current,
          {
            scale: 1.82,
            autoAlpha: 0,
            duration: 0.22,
            ease: "power2.out",
          },
          0.76
        )

        // Check ikonu kendi içinde resolve olur
        .to(
          submitIconRef.current,
          {
            scale: 1.08,
            rotation: 1.8,
            autoAlpha: 1,
            duration: 0.18,
            ease: "expo.out",
          },
          0.65
        )
        .to(
          submitIconRef.current,
          {
            scale: 1,
            rotation: 0,
            duration: 0.1,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
          0.83
        );

      if (progressRef.current) {
        timeline.to(
          progressRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.68,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility",
          },
          0.22,
        );
      }

      if (timerRef.current) {
        timeline.to(
          timerRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.62,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility",
          },
          0.26,
        );
      }

      if (adminButtonRef.current) {
        timeline
          .set(
            adminButtonRef.current,
            {
              autoAlpha: 1,
            },
            0.58,
          )
          .to(
            adminButtonCoreRef.current,
            {
              scale: 1.12,
              rotation: -2.4,
              duration: 0.18,
              ease: "expo.out",
            },
            0.58,
          )
          .to(
            adminButtonCoreRef.current,
            {
              scale: 1,
              rotation: 0,
              duration: 0.13,
              ease: "power3.out",
              clearProps: "transform",
            },
            0.76,
          )
          .to(
            adminButtonRingRef.current,
            {
              scale: 1.42,
              autoAlpha: 0.52,
              duration: 0.25,
              ease: "expo.out",
            },
            0.59,
          )
          .to(
            adminButtonRingRef.current,
            {
              scale: 1.76,
              autoAlpha: 0,
              duration: 0.22,
              ease: "power2.out",
            },
            0.78,
          )
          .to(
            adminIconRef.current,
            {
              scale: 1,
              rotation: 0,
              autoAlpha: 1,
              duration: 0.22,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
            0.66,
          );
      }

      if (isTimedGuess) {
        timeline.call(() => setTimerRunning(true), [], 0.86);
      }

      if (checkPath) {
        timeline.to(
          checkPath,
          {
            strokeDashoffset: 0,
            duration: 0.2,
            ease: "power3.out",
            clearProps: "strokeDasharray,strokeDashoffset",
          },
          0.66
        );
      }
    }, scopeRef);

    return () => ctx.revert();
  }, [controlsKey, isAdminModeEnabled, isGradientGuess, isTimedGuess]);

  return (
    <div ref={scopeRef} className="relative h-full overflow-hidden">
      {pendingUnlock && !isAdminModeEnabled && (
        <AdminProtectorOverlay
          onCancel={cancelUnlockRequest}
          onUnlock={enableAdmin}
        />
      )}

      <div className="absolute inset-y-0 left-0 z-10">
        {isGradientGuess ? (
          <div
            className="flex h-full items-stretch gap-0"
            aria-label={t("colorPicker.controls")}
          >
            <HueSlider
              value={guessColor.left.h}
              onChange={(h) => handleGradientHueChange("left", h)}
              trackClassName={`${edgeTrackClassName} rounded-l-[26px]`}
              handleClassName={edgeHandleClassName}
              showLabel={false}
            />
          </div>
        ) : (
          <HSVColorPicker
            value={guessColor}
            controls={difficulty.controls}
            onChange={onGuessChange}
            edge
          />
        )}
      </div>

      {isGradientGuess && (
        <div className="absolute inset-y-0 right-0 z-10">
          <div
            className="flex h-full items-stretch gap-0"
            aria-label={t("colorPicker.controls")}
          >
            <HueSlider
              value={guessColor.right.h}
              onChange={(h) => handleGradientHueChange("right", h)}
              trackClassName={`${edgeTrackClassName} guess-picker-track--right rounded-r-[26px]`}
              handleClassName={edgeHandleClassName}
              showLabel={false}
            />
          </div>
        </div>
      )}

      <div
        className="absolute left-(--round-left) top-6 overflow-hidden sm:left-(--round-left-sm) sm:top-8"
        style={{
          "--round-left": `${contentLeft}px`,
          "--round-left-sm": `${contentLeftSm}px`,
        }}
      >
        <p
          ref={roundRef}
          className="text-base font-semibold text-current/64"
        >
          {roundLabel}
        </p>
      </div>

      <div
        className="absolute right-(--guess-right) top-6 overflow-hidden sm:right-(--guess-right-sm) sm:top-8"
        style={{
          "--guess-right": `${contentRight}px`,
          "--guess-right-sm": `${contentRightSm}px`,
        }}
      >
        <p
          ref={brandRef}
          className="text-lg font-semibold text-current/42"
        >
          {APP_NAME}
        </p>
      </div>

      {progressItems.length > 0 && (
        <div
          ref={progressRef}
          className={`absolute z-20 ${
            isTimedGuess
              ? "bottom-[6.5rem] sm:bottom-[7.25rem]"
              : "bottom-6 sm:bottom-8"
          }`}
          style={{
            left: `${contentLeft}px`,
            maxWidth: `calc(100% - ${contentLeft}px - ${contentRight}px - ${actionReserveWidth}px)`,
          }}
        >
          <MultiplayerProgressList items={progressItems} />
        </div>
      )}

      {isTimedGuess && (
        <div
          ref={timerRef}
          className="absolute left-(--round-left) bottom-6 z-20 text-left sm:left-(--round-left-sm) sm:bottom-8"
          style={{
            "--round-left": `${contentLeft}px`,
            "--round-left-sm": `${contentLeftSm}px`,
          }}
        >
          <CountdownReel
            key={`guess-countdown-${timedGuessDurationMs}`}
            durationMs={timedGuessDurationMs}
            currentCentiseconds={centiseconds}
            sizeClassName="text-[2.8rem] sm:text-[3.65rem]"
            className="translate-y-[0.18em]"
          />
        </div>
      )}

      {isAdminModeEnabled && targetColor && (
        <button
          ref={adminButtonRef}
          type="button"
          aria-label="Set perfect admin guess"
          onClick={handleAdminPerfectGuess}
          className="card-action-size absolute right-(--admin-right) bottom-6 z-20 grid place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-(--admin-right-sm) sm:bottom-8"
          style={{
            "--admin-right": `${contentRight + 68}px`,
            "--admin-right-sm": `${contentRightSm + 74}px`,
          }}
        >
          <span
            ref={adminButtonCoreRef}
            className="absolute inset-0 rounded-full bg-zinc-950 text-white shadow-[0_16px_34px_rgba(0,0,0,0.28)]"
          />

          <span
            ref={adminButtonRingRef}
            className="pointer-events-none absolute inset-0 rounded-full border border-current/20"
          />

          <span
            ref={adminIconRef}
            className="relative z-10 grid place-items-center text-white"
          >
            <Crown size={27} strokeWidth={2.25} />
          </span>
        </button>
      )}

      <button
        ref={submitButtonRef}
        type="button"
        aria-label={t("game.submitColorGuess")}
        onClick={handleSubmitClick}
        className="soft-icon-button card-action-size absolute right-(--guess-right) bottom-6 z-20 grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-(--guess-right-sm) sm:bottom-8"
        style={{
          "--guess-right": `${contentRight}px`,
          "--guess-right-sm": `${contentRightSm}px`,
        }}
      >
        <span
          ref={submitButtonRingRef}
          className="pointer-events-none absolute inset-0 rounded-full border border-current/20"
        />

        <span
          ref={submitButtonCoreRef}
          className="absolute inset-0 rounded-full bg-white text-zinc-950 shadow-[0_16px_34px_rgba(0,0,0,0.22)]"
        />

        <span
          ref={submitIconRef}
          className="relative z-10 grid place-items-center text-zinc-950"
        >
          <Check size={30} strokeWidth={2.4} />
        </span>
      </button>
    </div>
  );
}
