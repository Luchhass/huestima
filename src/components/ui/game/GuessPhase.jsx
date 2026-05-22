"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { Check } from "lucide-react";
import HSVColorPicker from "@/components/ui/color-picker/HSVColorPicker";
import { useTranslation } from "@/hooks/useLanguage";
import { APP_NAME } from "@/lib/constants";

export default function GuessPhase({
  round,
  difficulty,
  guessColor,
  onGuessChange,
  onSubmit,
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const roundRef = useRef(null);
  const brandRef = useRef(null);

  const submitButtonRef = useRef(null);
  const submitButtonCoreRef = useRef(null);
  const submitButtonRingRef = useRef(null);
  const submitIconRef = useRef(null);

  const pickerWidth = difficulty.controls.length * 50;
  const controlsKey = difficulty.controls.join("-");

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const pickerTracks = gsap.utils.toArray(".guess-picker-track");
      const pickerThumbs = gsap.utils.toArray(".guess-picker-thumb");
      const checkPath = submitIconRef.current?.querySelector("path");

      gsap.set(roundRef.current, {
        yPercent: -120,
        autoAlpha: 0,
      });

      gsap.set(brandRef.current, {
        yPercent: 120,
        autoAlpha: 0,
      });

      gsap.set(pickerTracks, {
        xPercent: -104,
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
          0.18
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
  }, [controlsKey]);

  return (
    <div ref={scopeRef} className="relative h-full overflow-hidden">
      <div className="absolute inset-y-0 left-0 z-10">
        <HSVColorPicker
          value={guessColor}
          controls={difficulty.controls}
          onChange={onGuessChange}
          edge
        />
      </div>

      <div
        className="absolute left-(--round-left) top-6 overflow-hidden sm:left-(--round-left-sm) sm:top-8"
        style={{
          "--round-left": `${pickerWidth + 24}px`,
          "--round-left-sm": `${pickerWidth + 32}px`,
        }}
      >
        <p
          ref={roundRef}
          className="text-base font-semibold text-current/64"
        >
          {round}/5
        </p>
      </div>

      <div className="absolute right-6 top-6 overflow-hidden sm:right-8 sm:top-8">
        <p
          ref={brandRef}
          className="text-lg font-semibold text-current/42"
        >
          {APP_NAME}
        </p>
      </div>

      <button
        ref={submitButtonRef}
        type="button"
        aria-label={t("game.submitColorGuess")}
        onClick={onSubmit}
        className="soft-icon-button card-action-size absolute bottom-6 right-6 z-20 grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:bottom-8 sm:right-8"
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
