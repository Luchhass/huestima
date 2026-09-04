"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, Crown, KeyRound } from "lucide-react";
import HSVColorPicker from "@/components/ui/color-picker/HSVColorPicker";
import HueSlider from "@/components/ui/color-picker/HueSlider";
import SaturationSlider from "@/components/ui/color-picker/SaturationSlider";
import ValueSlider from "@/components/ui/color-picker/ValueSlider";
import { useAdminMode } from "@/hooks/useAdminMode";
import { useCountdown } from "@/hooks/useCountdown";
import { useTranslation } from "@/hooks/useLanguage";
import {
  colorToneHex,
  isCartoonColor,
  isFlagColor,
  isGradientColor,
} from "@/lib/color";
import { APP_NAME } from "@/lib/constants";
import {
  playHintReveal,
  playMemorizeSecondTick,
  startMemorizeMechanism,
} from "@/lib/sound";
import CountdownReel, { SprintClock } from "./CountdownReel";
import MultiplayerProgressList from "./MultiplayerProgressList";

function getTargetHintColor(targetColor, guessColor) {
  if (!targetColor) return null;

  if (isFlagColor(targetColor)) {
    const activeSlotId = guessColor?.activeSlotId || targetColor.activeSlotId;
    return (
      targetColor.slots?.find((slotColor) => slotColor.id === activeSlotId) ||
      targetColor.slots?.[0] ||
      targetColor
    );
  }

  return targetColor;
}

export default function GuessPhase({
  round,
  roundLabel = `${round}/5`,
  difficulty,
  targetColor = null,
  guessColor,
  onGuessChange,
  onSubmit,
  guessDurationMs = null,
  sprintDurationMs = null,
  sprintRemainingMs = null,
  progressItems = [],
  isShowcaseWidgetEntering = true,
  isShowcaseWidgetExiting = false,
  isExiting = false,
  showcaseLayoutEnabled = true,
  resumeElapsedMs = 0,
  resumeInstantly = false,
  hintCount = 0,
  unlimitedHints = false,
  hintActive = false,
  hintsEnabled = true,
  onUseHint,
  isSpotMode = false,
}) {
  const { t } = useTranslation();
  const { enabled: isAdminModeEnabled } = useAdminMode();
  const scopeRef = useRef(null);
  const roundRef = useRef(null);
  const timerRef = useRef(null);
  const brandRef = useRef(null);
  const progressRef = useRef(null);
  const timedSubmitRef = useRef(false);
  const sprintSoundDurationRef = useRef(sprintRemainingMs);
  const previousSprintSecondRef = useRef(
    Number.isFinite(sprintRemainingMs)
      ? Math.ceil(Math.max(0, sprintRemainingMs) / 1000)
      : null,
  );

  const adminButtonRef = useRef(null);
  const adminButtonCoreRef = useRef(null);
  const adminButtonRingRef = useRef(null);
  const adminIconRef = useRef(null);
  const submitButtonRef = useRef(null);
  const submitButtonCoreRef = useRef(null);
  const submitButtonRingRef = useRef(null);
  const submitIconRef = useRef(null);
  const hintButtonRef = useRef(null);
  const hintButtonCoreRef = useRef(null);
  const hintButtonRingRef = useRef(null);
  const hintIconRef = useRef(null);
  const spotRef = useRef(null);
  const [timerRunning, setTimerRunning] = useState(false);

  const isGradientGuess = isGradientColor(guessColor);
  const isFlagGuess = isFlagColor(guessColor);
  const isCartoonGuess = isCartoonColor(guessColor);
  const usesExternalControlWidget = isFlagGuess || isCartoonGuess;
  const usesShowcaseGuessLayout =
    showcaseLayoutEnabled && usesExternalControlWidget;
  const showcaseTextStyle = {
    color: "var(--game-fg-top-left)",
    textShadow: "var(--game-fg-top-left-shadow)",
  };
  const showcaseBrandStyle = {
    color: "var(--game-fg-top-right)",
    textShadow: "var(--game-fg-top-right-shadow)",
  };
  const sidePickerWidth = 50;
  const embeddedPickerWidth = isGradientGuess
    ? sidePickerWidth
    : difficulty.controls.length * sidePickerWidth;
  const pickerWidth = usesExternalControlWidget ? 0 : embeddedPickerWidth;
  const rightPickerWidth =
    usesExternalControlWidget ? 0 : isGradientGuess ? sidePickerWidth : 0;
  const contentLeft = pickerWidth + 24;
  const contentLeftSm = pickerWidth + 32;
  const contentRight = rightPickerWidth + 24;
  const contentRightSm = rightPickerWidth + 32;
  const showHintButton = typeof onUseHint === "function";
  const canUseHint =
    showHintButton && (unlimitedHints || (hintsEnabled && hintCount > 0));
  const actionReserveWidth =
    88 + (showHintButton ? 68 : 0) + (isAdminModeEnabled ? 68 : 0);
  const controlsKey = difficulty.controls.join("-");
  const hintColor = getTargetHintColor(targetColor, guessColor);
  const timedGuessDurationMs =
    Number.isFinite(guessDurationMs) && guessDurationMs > 0 ? guessDurationMs : 0;
  const isTimedGuess = timedGuessDurationMs > 0;
  const isSprintGuess =
    Number.isFinite(sprintDurationMs) &&
    sprintDurationMs > 0 &&
    Number.isFinite(sprintRemainingMs);
  const showGuessTimer = isTimedGuess || isSprintGuess;
  const hintLockedForRound = showHintButton && hintActive;
  const hintButtonDisabled = !canUseHint;
  const hintButtonLabel = canUseHint
    ? t("game.useHint")
    : hintLockedForRound
      ? `${t("game.useHint")} • ${roundLabel}`
      : t("game.hintUnavailable");

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

  const handleUseHintClick = useCallback(() => {
    if (!canUseHint) return;

    playHintReveal();
    onUseHint?.();
  }, [canUseHint, onUseHint]);

  const { centiseconds } = useCountdown({
    durationMs: timedGuessDurationMs,
    isRunning: isTimedGuess && timerRunning,
    onComplete: handleTimedSubmit,
    initialElapsedMs: resumeElapsedMs,
  });
  const displayedCentiseconds = isSprintGuess
    ? Math.max(0, Math.ceil(sprintRemainingMs / 10))
    : centiseconds;
  const displayedDurationMs = isSprintGuess ? sprintDurationMs : timedGuessDurationMs;
  const displayedTimerRunning = isSprintGuess || timerRunning;

  useEffect(() => {
    const timedCountdownRunning = isTimedGuess && timerRunning;
    if (!timedCountdownRunning && !isSprintGuess) return undefined;

    const remainingMs = isSprintGuess
      ? Math.max(1, sprintSoundDurationRef.current)
      : Math.max(1, timedGuessDurationMs - resumeElapsedMs);

    return startMemorizeMechanism(remainingMs);
  }, [isSprintGuess, isTimedGuess, timerRunning, timedGuessDurationMs, resumeElapsedMs]);

  const sprintSecond = isSprintGuess
    ? Math.ceil(Math.max(0, sprintRemainingMs) / 1000)
    : null;

  useEffect(() => {
    if (!isSprintGuess || sprintSecond === null) return;

    const previousSecond = previousSprintSecondRef.current;
    previousSprintSecondRef.current = sprintSecond;

    if (previousSecond === null || sprintSecond >= previousSecond) return;

    const progress = sprintDurationMs
      ? 1 - sprintRemainingMs / sprintDurationMs
      : 0;
    playMemorizeSecondTick(progress);
  }, [isSprintGuess, sprintDurationMs, sprintRemainingMs, sprintSecond]);
  const pulseProgress = displayedDurationMs
    ? displayedCentiseconds / (displayedDurationMs / 10)
    : 1;
  const pulseDuration = `${Math.max(0.22, Math.min(0.95, 0.22 + pulseProgress * 0.73))}s`;

  useLayoutEffect(() => {
    const card = scopeRef.current?.closest(".game-card-shell");
    if (!card) return undefined;
    card.classList.toggle("guess-card-countdown-pulse", showGuessTimer && displayedTimerRunning);
    return () => {
      card.classList.remove("guess-card-countdown-pulse");
      card.style.removeProperty("--guess-pulse-duration");
    };
  }, [displayedTimerRunning, showGuessTimer]);

  useLayoutEffect(() => {
    const card = scopeRef.current?.closest(".game-card-shell");
    if (card && showGuessTimer && displayedTimerRunning) {
      card.style.setProperty("--guess-pulse-duration", pulseDuration);
    } else if (card) {
      card.style.removeProperty("--guess-pulse-duration");
    }
  }, [displayedTimerRunning, pulseDuration, showGuessTimer]);
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

  const handleFlagControlChange = useCallback(
    (partial) => {
      onGuessChange({
        ...guessColor,
        ...partial,
      });
    },
    [guessColor, onGuessChange],
  );

  useLayoutEffect(() => {
    timedSubmitRef.current = false;

    if (resumeInstantly) {
      const timerStartId = window.setTimeout(() => {
        setTimerRunning(true);
      }, 0);

      const targets = [
        roundRef.current,
        timerRef.current,
        brandRef.current,
        progressRef.current,
        adminButtonRef.current,
        adminButtonCoreRef.current,
        adminButtonRingRef.current,
        adminIconRef.current,
        hintButtonRef.current,
        hintButtonCoreRef.current,
        hintButtonRingRef.current,
        hintIconRef.current,
        submitButtonRef.current,
        submitButtonCoreRef.current,
        submitButtonRingRef.current,
        submitIconRef.current,
      ].filter(Boolean);

      gsap.set(targets, {
        // Keep layout properties (position, inset, width) intact on reload;
        // only remove animation state so action buttons stay bottom-right.
        clearProps: "transform,opacity,visibility",
      });

      return () => window.clearTimeout(timerStartId);
    }

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

      if (rightPickerTracks.length > 0) {
        gsap.set(rightPickerTracks, {
          xPercent: 104,
          autoAlpha: 0,
          force3D: true,
        });
      }

      gsap.set(pickerThumbs, {
        scale: 0,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      // Fancy submit button initial state
      if (hintButtonRef.current) {
        gsap.set(hintButtonRef.current, {
          autoAlpha: 0,
        });

        gsap.set(hintButtonCoreRef.current, {
          scale: 0,
          rotation: 9,
          transformOrigin: "center center",
          force3D: true,
        });

        gsap.set(hintButtonRingRef.current, {
          scale: 0.22,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });

        gsap.set(hintIconRef.current, {
          scale: 0.72,
          rotation: -8,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });
      }

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
          rightPickerTracks.length > 0 ? rightPickerTracks : pickerTracks,
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

      if (hintButtonRef.current) {
        timeline
          .set(
            hintButtonRef.current,
            {
              autoAlpha: 1,
            },
            0.5,
          )
          .to(
            hintButtonCoreRef.current,
            {
              scale: 1.12,
              rotation: -2,
              duration: 0.18,
              ease: "expo.out",
            },
            0.5,
          )
          .to(
            hintButtonCoreRef.current,
            {
              scale: 1,
              rotation: 0,
              duration: 0.13,
              ease: "power3.out",
              clearProps: "transform",
            },
            0.69,
          )
          .to(
            hintButtonRingRef.current,
            {
              scale: 1.36,
              autoAlpha: 0.44,
              duration: 0.22,
              ease: "expo.out",
            },
            0.52,
          )
          .to(
            hintButtonRingRef.current,
            {
              scale: 1.62,
              autoAlpha: 0,
              duration: 0.2,
              ease: "power2.out",
            },
            0.72,
          )
          .to(
            hintIconRef.current,
            {
              scale: 1,
              rotation: 0,
              autoAlpha: 1,
              duration: 0.2,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
            0.58,
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
  }, [
    controlsKey,
    showHintButton,
    isAdminModeEnabled,
    isGradientGuess,
    isTimedGuess,
    usesShowcaseGuessLayout,
    resumeInstantly,
    resumeElapsedMs,
  ]);

  useLayoutEffect(() => {
    if (!isExiting || usesShowcaseGuessLayout) return undefined;

    const ctx = gsap.context(() => {
      const targets = [
        roundRef.current,
        brandRef.current,
        progressRef.current,
        timerRef.current,
        adminButtonRef.current,
        hintButtonRef.current,
        submitButtonRef.current,
        ...gsap.utils.toArray("[role=slider], .guess-picker-track"),
      ].filter(Boolean);

      gsap.set(scopeRef.current, { pointerEvents: "none" });

      if (isSpotMode && spotRef.current) {
        gsap
          .timeline()
          .to(targets, {
            autoAlpha: 0,
            duration: 0.3,
            stagger: 0.018,
            ease: "power2.in",
            overwrite: "auto",
          })
          .to(spotRef.current, {
            left: "50%",
            duration: 0.48,
            ease: "expo.inOut",
            overwrite: "auto",
          });
      } else {
        gsap.to(targets, {
          autoAlpha: 0,
          duration: 0.52,
          stagger: 0.025,
          ease: "power2.in",
          overwrite: "auto",
        });
      }
    }, scopeRef);

    return () => ctx.revert();
  }, [isExiting, isSpotMode, usesShowcaseGuessLayout]);

  useLayoutEffect(() => {
    if (!hintActive) return undefined;

    const ctx = gsap.context(() => {
      const tracks = gsap.utils.toArray("[data-hint-reveal-track]");
      const overlays = gsap.utils.toArray("[data-hint-reveal-overlay]");
      const cutouts = gsap.utils.toArray("[data-hint-cutout]");

      if (!tracks.length) return;

      gsap.killTweensOf([...tracks, ...overlays, ...cutouts]);

      gsap.fromTo(
        tracks,
        {
          boxShadow:
            "inset 0 0 0 1px rgba(0,0,0,0.08), 0 14px 28px rgba(0,0,0,0.18)",
          filter: "saturate(1) brightness(1)",
        },
        {
          keyframes: [
            {
              boxShadow:
                "inset 0 0 0 1px rgba(255,255,255,0.14), 0 0 0 1px rgba(255,255,255,0.18), 0 18px 40px rgba(0,0,0,0.26), 0 0 24px rgba(255,255,255,0.22)",
              filter: "saturate(1.08) brightness(1.04)",
              duration: 0.28,
              ease: "power2.out",
            },
            {
              boxShadow:
                "inset 0 0 0 1px rgba(0,0,0,0.08), 0 14px 28px rgba(0,0,0,0.18)",
              filter: "saturate(1) brightness(1)",
              duration: 0.55,
              ease: "power3.out",
            },
          ],
          stagger: 0.04,
          overwrite: "auto",
        },
      );

      if (overlays.length) {
        gsap.fromTo(
          overlays,
          { autoAlpha: 0.24 },
          {
            keyframes: [
              { autoAlpha: 1, duration: 0.22, ease: "power2.out" },
              { autoAlpha: 1, duration: 0.08, ease: "none" },
              { autoAlpha: 1, duration: 0.28, ease: "power2.out" },
            ],
            stagger: 0.03,
            overwrite: "auto",
          },
        );
      }

      if (cutouts.length) {
        gsap.fromTo(
          cutouts,
          { scale: 0.72, autoAlpha: 0.2 },
          {
            keyframes: [
              { scale: 1.04, autoAlpha: 1, duration: 0.24, ease: "expo.out" },
              { scale: 1, autoAlpha: 1, duration: 0.28, ease: "power2.out" },
            ],
            transformOrigin: "center center",
            stagger: 0.04,
            overwrite: "auto",
          },
        );
      }
    }, scopeRef);

    return () => ctx.revert();
  }, [hintActive]);

  const renderFlagControls = (orientation) => {
    const isHorizontal = orientation === "horizontal";
    const controlCount = difficulty.controls.length;
    const trackClassName = isHorizontal
      ? "guess-picker-track !h-full !w-full rounded-none border-0 shadow-none"
      : "guess-picker-track h-full w-full rounded-none border-0 shadow-none sm:h-full sm:w-full";
    const handleClassName = isHorizontal
      ? "guess-picker-thumb size-5 shadow-[0_5px_14px_rgba(0,0,0,0.24)]"
      : "guess-picker-thumb size-5 shadow-[0_5px_14px_rgba(0,0,0,0.24)]";

    return (
      <div
        className={
          isHorizontal
            ? "flag-control-stack flag-control-stack--horizontal grid h-full w-full overflow-hidden rounded-[18px] shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
            : "flag-control-stack flag-control-stack--vertical grid h-full overflow-hidden rounded-[22px] shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
        }
        style={{
          "--flag-control-count": controlCount,
          gridTemplateColumns: isHorizontal
            ? undefined
            : `repeat(${controlCount}, minmax(0, 1fr))`,
        }}
        aria-label={t("colorPicker.controls")}
      >
        {difficulty.controls.includes("h") && (
          <HueSlider
            value={guessColor.h}
            onChange={(h) => handleFlagControlChange({ h })}
            trackClassName={trackClassName}
            handleClassName={handleClassName}
            showLabel={false}
            orientation={orientation}
            hintValue={hintColor?.h}
            showHint={hintActive}
            hintColor={hintColor?.hex}
          />
        )}

        {difficulty.controls.includes("s") && (
          <SaturationSlider
            hue={guessColor.h}
            brightness={guessColor.v}
            value={guessColor.s}
            onChange={(s) => handleFlagControlChange({ s })}
            trackClassName={trackClassName}
            handleClassName={handleClassName}
            showLabel={false}
            orientation={orientation}
            hintValue={hintColor?.s}
            showHint={hintActive}
            hintColor={hintColor?.hex}
          />
        )}

        {difficulty.controls.includes("v") && (
          <ValueSlider
            hue={guessColor.h}
            saturation={guessColor.s}
            value={guessColor.v}
            onChange={(v) => handleFlagControlChange({ v })}
            trackClassName={trackClassName}
            handleClassName={handleClassName}
            showLabel={false}
            orientation={orientation}
            hintValue={hintColor?.v}
            showHint={hintActive}
            hintColor={hintColor?.hex}
          />
        )}
      </div>
    );
  };

  const renderExternalControlWidgets = () => (
    <>
      <div
        className={`flag-control-widget flag-control-widget--desktop showcase-control-widget ${
          !isShowcaseWidgetEntering ? "flag-control-widget--waiting" : ""
        } ${
          isShowcaseWidgetExiting ? "flag-control-widget--exiting" : ""
        }`}
        style={{ "--flag-control-count": difficulty.controls.length }}
      >
        {renderFlagControls("vertical")}
      </div>

      <div
        className={`flag-control-widget flag-control-widget--mobile showcase-control-widget ${
          !isShowcaseWidgetEntering ? "flag-control-widget--waiting" : ""
        } ${
          isShowcaseWidgetExiting ? "flag-control-widget--exiting" : ""
        }`}
        style={{ "--flag-control-count": difficulty.controls.length }}
      >
        {renderFlagControls("horizontal")}
      </div>
    </>
  );

  if (usesShowcaseGuessLayout) {
    return (
      <div ref={scopeRef} style={{ "--guess-pulse-duration": pulseDuration }} className={`guess-phase-surface relative h-full overflow-visible p-6 sm:p-8 ${showGuessTimer && displayedTimerRunning ? "guess-phase-surface--counting" : ""}`}>
        {renderExternalControlWidgets()}

        <div className="absolute top-6 left-6 z-10 overflow-hidden sm:top-8 sm:left-8">
          <p
            ref={roundRef}
            className="text-base font-semibold"
            style={showcaseTextStyle}
          >
            {roundLabel}
          </p>
        </div>

        <div className="absolute top-6 right-6 z-10 overflow-hidden text-right sm:top-8 sm:right-8">
          <p
            ref={brandRef}
            className="text-lg font-semibold"
            style={showcaseBrandStyle}
          >
            {APP_NAME}
          </p>
        </div>

        {progressItems.length > 0 && (
          <div
            ref={progressRef}
            className={`absolute left-6 z-20 sm:left-8 ${
              showGuessTimer
                ? "bottom-[6.5rem] sm:bottom-[7.25rem]"
                : "bottom-[5.25rem] sm:bottom-[5.75rem]"
            }`}
            style={{
              color: "var(--game-fg-bottom-left)",
              textShadow: "var(--game-fg-bottom-left-shadow)",
            }}
          >
            <MultiplayerProgressList items={progressItems} />
          </div>
        )}

        {showGuessTimer && (
          <div
            ref={timerRef}
            className="absolute bottom-6 left-6 z-20 text-left sm:bottom-8 sm:left-8"
            style={{
              color: "var(--game-fg-bottom-left)",
              textShadow: "var(--game-fg-bottom-left-shadow)",
            }}
          >
            {isSprintGuess ? <SprintClock remainingMs={sprintRemainingMs} /> : (
              <CountdownReel
                key={`guess-countdown-${timedGuessDurationMs}`}
                durationMs={displayedDurationMs}
                currentCentiseconds={displayedCentiseconds}
                isRunning={displayedTimerRunning}
                onSecondTick={playMemorizeSecondTick}
                sizeClassName="text-[2.8rem] sm:text-[3.65rem]"
                className="translate-y-[0.18em]"
              />
            )}
          </div>
        )}

        {isAdminModeEnabled && targetColor && (
          <button
            ref={adminButtonRef}
            type="button"
            aria-label={t("common.perfectAdminGuess")}
            onClick={handleAdminPerfectGuess}
            className={`card-action-size absolute bottom-6 z-20 grid place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:bottom-8 ${
              showHintButton ? "right-[9.5rem] sm:right-[10.25rem]" : "right-[5.75rem] sm:right-[6.25rem]"
            }`}
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

        {showHintButton && (
          <button
            ref={hintButtonRef}
            type="button"
            aria-label={hintButtonLabel}
            title={hintButtonLabel}
            disabled={hintButtonDisabled}
            onClick={handleUseHintClick}
            data-hint-state={hintLockedForRound ? "used" : hintButtonDisabled ? "empty" : "ready"}
            className="card-action-size absolute right-[5.75rem] bottom-6 z-20 grid place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 disabled:pointer-events-none sm:right-[6.25rem] sm:bottom-8"
            style={{
              color: "var(--game-fg-bottom-right)",
              textShadow: "var(--game-fg-bottom-right-shadow)",
            }}
          >
            <span
              ref={hintButtonRingRef}
              className={`pointer-events-none absolute inset-0 rounded-full border transition-opacity ${
                hintLockedForRound
                ? "border-current/30 opacity-100"
                : hintButtonDisabled
                    ? "border-current/35 opacity-55"
                    : "border-current/30 opacity-100"
              }`}
            />
            <span
              ref={hintButtonCoreRef}
              className={`absolute inset-0 rounded-full border-2 text-current transition-[border-color,background-color,box-shadow,opacity] ${
                hintLockedForRound
                  ? "border-current/40 bg-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_24px_rgba(0,0,0,0.12)]"
                  : hintButtonDisabled
                    ? "border-current/40 bg-transparent shadow-[0_12px_24px_rgba(0,0,0,0.1)] opacity-70"
                    : "border-current bg-transparent shadow-[0_16px_34px_rgba(0,0,0,0.14)]"
              }`}
            />
            <span
              ref={hintIconRef}
              className={`relative z-10 grid place-items-center transition-opacity ${
                hintLockedForRound ? "text-current opacity-88" : hintButtonDisabled ? "text-current opacity-72" : "text-current"
              }`}
            >
              <KeyRound className="size-[1.95rem]" strokeWidth={2.1} />
            </span>
            {hintLockedForRound && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[0.55rem] z-10 rounded-full border border-current/25"
              />
            )}
            <span
              className={`absolute -right-1 -top-1 z-20 grid size-5 place-items-center rounded-full text-[0.72rem] font-bold leading-none shadow-[0_6px_14px_rgba(0,0,0,0.24)] ${
                hintLockedForRound
                  ? "bg-white/92 text-zinc-950"
                  : hintButtonDisabled
                    ? "bg-white/86 text-zinc-950"
                    : "bg-white text-zinc-950"
              }`}
            >
              {unlimitedHints ? "∞" : hintCount}
            </span>
          </button>
        )}

        <button
          ref={submitButtonRef}
          type="button"
          aria-label={t("game.submitColorGuess")}
          onClick={handleSubmitClick}
          className="soft-icon-button card-action-size absolute right-6 bottom-6 z-20 grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-8 sm:bottom-8"
        >
          <span
            ref={submitButtonRingRef}
            className="pointer-events-none absolute inset-0 rounded-full border border-current/20"
          />

          <span
            ref={submitButtonCoreRef}
            className="absolute inset-0 rounded-full bg-white text-zinc-950 shadow-[0_16px_34px_rgba(0,0,0,0.22)] ring-1 ring-black/6"
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

  return (
    <div
      ref={scopeRef}
      style={{ "--guess-pulse-duration": pulseDuration }}
      className={`guess-phase-surface relative h-full ${usesExternalControlWidget ? "overflow-visible" : "overflow-hidden"} ${isTimedGuess && timerRunning ? "guess-phase-surface--counting" : ""}`}
    >
      {usesExternalControlWidget ? (
        renderExternalControlWidgets()
      ) : (
        <>
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
                  hintValue={targetColor?.left?.h}
                  showHint={hintActive}
                  hintColor={targetColor?.left?.hex}
                />
              </div>
            ) : (
              <HSVColorPicker
                value={guessColor}
                controls={difficulty.controls}
                onChange={onGuessChange}
                edge
                hintColor={hintColor}
                showHint={hintActive}
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
                  hintValue={targetColor?.right?.h}
                  showHint={hintActive}
                  hintColor={targetColor?.right?.hex}
                />
              </div>
            </div>
          )}
        </>
      )}

      {isSpotMode && (
        <div
          ref={spotRef}
          className="pointer-events-none absolute top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `calc(50% + ${pickerWidth / 2}px)` }}
        >
          <span
            className="block size-36 rounded-full sm:size-44"
            style={{ background: colorToneHex(guessColor) }}
            aria-hidden="true"
          />
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
          className="text-base font-semibold text-current/78"
          style={{
            color: "var(--game-fg-top-left)",
            textShadow: "var(--game-fg-top-left-shadow)",
          }}
        >
          {roundLabel}
        </p>
      </div>

      <div
        className="absolute right-(--guess-right) top-6 overflow-hidden text-right sm:right-(--guess-right-sm) sm:top-8"
        style={{
          "--guess-right": `${contentRight}px`,
          "--guess-right-sm": `${contentRightSm}px`,
        }}
      >
        <p
          ref={brandRef}
          className="text-lg font-semibold text-current/72"
          style={{
            color: "var(--game-fg-top-right)",
            textShadow: "var(--game-fg-top-right-shadow)",
          }}
        >
          {APP_NAME}
        </p>
      </div>

      {progressItems.length > 0 && (
        <div
          ref={progressRef}
          className={`absolute z-20 ${
            showGuessTimer
              ? "bottom-[6.5rem] sm:bottom-[7.25rem]"
              : "bottom-[5.25rem] sm:bottom-[5.75rem]"
          }`}
          style={{
            left: `${contentLeft}px`,
            maxWidth: `calc(100% - ${contentLeft}px - ${contentRight}px - ${actionReserveWidth}px)`,
            color: isSprintGuess ? "var(--game-fg-top-right)" : "var(--game-fg-bottom-left)",
            textShadow: isSprintGuess ? "var(--game-fg-top-right-shadow)" : "var(--game-fg-bottom-left-shadow)",
          }}
        >
          <MultiplayerProgressList items={progressItems} />
        </div>
      )}

      {showGuessTimer && (
        <div
          ref={timerRef}
          className="absolute left-(--round-left) bottom-6 z-20 text-left sm:left-(--round-left-sm) sm:bottom-8"
          style={{
            "--round-left": `${contentLeft}px`,
            "--round-left-sm": `${contentLeftSm}px`,
            "--round-right": `${contentRight}px`,
            "--round-right-sm": `${contentRightSm}px`,
            color: "var(--game-fg-bottom-left)",
            textShadow: "var(--game-fg-bottom-left-shadow)",
          }}
        >
          {isSprintGuess ? <SprintClock remainingMs={sprintRemainingMs} /> : (
            <CountdownReel
              key={`guess-countdown-${timedGuessDurationMs}`}
              durationMs={displayedDurationMs}
              currentCentiseconds={displayedCentiseconds}
              isRunning={displayedTimerRunning}
              onSecondTick={playMemorizeSecondTick}
              sizeClassName="text-[2.8rem] sm:text-[3.65rem]"
              className="translate-y-[0.18em]"
            />
          )}
        </div>
      )}

      {isAdminModeEnabled && targetColor && (
        <button
          ref={adminButtonRef}
          type="button"
          aria-label={t("common.perfectAdminGuess")}
          onClick={handleAdminPerfectGuess}
          className="card-action-size absolute right-(--admin-right) bottom-6 z-20 grid place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-(--admin-right-sm) sm:bottom-8"
          style={{
            "--admin-right": `${contentRight + (showHintButton ? 136 : 68)}px`,
            "--admin-right-sm": `${contentRightSm + (showHintButton ? 148 : 74)}px`,
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

      {showHintButton && (
        <button
          ref={hintButtonRef}
          type="button"
          aria-label={hintButtonLabel}
          title={hintButtonLabel}
          disabled={hintButtonDisabled}
          onClick={handleUseHintClick}
          data-hint-state={hintLockedForRound ? "used" : hintButtonDisabled ? "empty" : "ready"}
          className="card-action-size absolute right-(--hint-right) bottom-6 z-20 grid place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 disabled:pointer-events-none sm:right-(--hint-right-sm) sm:bottom-8"
          style={{
            "--hint-right": `${contentRight + 68}px`,
            "--hint-right-sm": `${contentRightSm + 74}px`,
            color: "var(--game-fg-bottom-right)",
            textShadow: "var(--game-fg-bottom-right-shadow)",
          }}
        >
          <span
            ref={hintButtonRingRef}
            className={`pointer-events-none absolute inset-0 rounded-full border transition-opacity ${
              hintLockedForRound
                ? "border-current/30 opacity-100"
                : hintButtonDisabled
                  ? "border-current/35 opacity-55"
                  : "border-current/30 opacity-100"
            }`}
          />
          <span
            ref={hintButtonCoreRef}
            className={`absolute inset-0 rounded-full border-2 text-current transition-[border-color,background-color,box-shadow,opacity] ${
              hintLockedForRound
                ? "border-current/40 bg-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_12px_24px_rgba(0,0,0,0.12)]"
                : hintButtonDisabled
                  ? "border-current/40 bg-transparent shadow-[0_12px_24px_rgba(0,0,0,0.1)] opacity-70"
                  : "border-current bg-transparent shadow-[0_16px_34px_rgba(0,0,0,0.14)]"
            }`}
          />
          <span
            ref={hintIconRef}
            className={`relative z-10 grid place-items-center transition-opacity ${
              hintLockedForRound ? "text-current opacity-88" : hintButtonDisabled ? "text-current opacity-72" : "text-current"
            }`}
          >
            <KeyRound className="size-[1.95rem]" strokeWidth={2.1} />
          </span>
          {hintLockedForRound && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[0.55rem] z-10 rounded-full border border-current/25"
            />
          )}
          <span
            className={`absolute -right-1 -top-1 z-20 grid size-5 place-items-center rounded-full text-[0.72rem] font-bold leading-none shadow-[0_6px_14px_rgba(0,0,0,0.24)] ${
              hintLockedForRound
                ? "bg-white/92 text-zinc-950"
                : hintButtonDisabled
                  ? "bg-white/86 text-zinc-950"
                  : "bg-white text-zinc-950"
            }`}
          >
            {unlimitedHints ? "∞" : hintCount}
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
