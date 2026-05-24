"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { readableTone } from "@/lib/color";
import { getResultLineKey } from "@/lib/i18n";
import { formatScore } from "@/lib/scoring";
import { playScoreResolve, startScoreCountSound } from "@/lib/sound";

const SCORE_COUNT_DURATION = 2.55;

function swatchToneClasses(hex) {
  return readableTone(hex) === "dark" ? "text-zinc-950" : "text-white";
}

function formatHsb({ h, s, v }) {
  return `H${Math.round(h)} S${Math.round(s)} B${Math.round(v)}`;
}

export default function ResultPhase({ result, hasNextRound, onContinue }) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);

  const roundRef = useRef(null);
  const scoreRef = useRef(null);

  const continueButtonRef = useRef(null);
  const continueButtonCoreRef = useRef(null);
  const continueButtonRingRef = useRef(null);
  const continueArrowRef = useRef(null);

  const selectionLabelRef = useRef(null);
  const selectionValueRef = useRef(null);
  const originalLabelRef = useRef(null);
  const originalValueRef = useRef(null);

  const resultLineRef = useRef(null);

  useLayoutEffect(() => {
    if (!result) return undefined;

    const scoreElement = scoreRef.current;
    const resultLineElement = resultLineRef.current;

    if (!scoreElement || !resultLineElement) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reduceMotion.matches) {
      scoreElement.textContent = formatScore(result.score);

      gsap.set(resultLineElement, {
        autoAlpha: 1,
      });

      playScoreResolve(result.score);
      return undefined;
    }

    let scoreTween = null;
    let scoreSound = null;
    let resultCharsTween = null;
    let scoreStartTimeout = null;
    let scoreStarted = false;

    const ctx = gsap.context(() => {
      const resultChars = gsap.utils.toArray(
        "[data-result-char]",
        resultLineElement
      );

      const startScoreCounter = () => {
        if (scoreStarted || !scoreElement.isConnected) return;

        scoreStarted = true;
        const state = { value: 0 };

        scoreSound = startScoreCountSound({
          duration: SCORE_COUNT_DURATION,
          score: result.score,
        });

        scoreTween = gsap.to(state, {
          value: result.score,
          duration: SCORE_COUNT_DURATION,
          ease: "power2.out",
          onUpdate: () => {
            scoreElement.textContent = formatScore(state.value);
          },
          onComplete: () => {
            scoreElement.textContent = formatScore(result.score);
            scoreSound?.finish();

            gsap.set(resultLineElement, {
              autoAlpha: 1,
            });

            resultCharsTween = gsap.to(resultChars, {
              autoAlpha: 1,
              scale: 1,
              duration: 0.2,
              ease: "power3.out",
              stagger: 0.018,
              clearProps: "transform,opacity,visibility",
            });
          },
        });
      };

      const timeline = gsap.timeline();

      gsap.set(
        [
          selectionLabelRef.current,
          selectionValueRef.current,
          originalLabelRef.current,
          originalValueRef.current,
        ],
        {
          yPercent: 120,
          force3D: true,
        }
      );

      gsap.set(roundRef.current, {
        yPercent: -120,
        autoAlpha: 0,
        force3D: true,
      });

      gsap.set(scoreElement, {
        yPercent: 120,
        autoAlpha: 0,
        transformOrigin: "right center",
        force3D: true,
      });

      gsap.set(continueButtonRef.current, {
        autoAlpha: 0,
      });

      gsap.set(continueButtonCoreRef.current, {
        scale: 0,
        rotation: -10,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(continueButtonRingRef.current, {
        scale: 0.22,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(continueArrowRef.current, {
        scale: 0.72,
        rotation: -8,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(resultLineElement, {
        autoAlpha: 0,
      });

      gsap.set(resultChars, {
        autoAlpha: 0,
        scale: 0.97,
        transformOrigin: "center center",
        force3D: true,
      });

      scoreElement.textContent = formatScore(0);

      timeline
        .add(() => {
          scoreStartTimeout = window.setTimeout(startScoreCounter, 1560);
        }, 0)
        // 1) Your selection + Original aynı anda açılır
        .to(
          [selectionLabelRef.current, originalLabelRef.current],
          {
            yPercent: 0,
            duration: 0.78,
            ease: "power4.out",
            clearProps: "transform",
          },
          0
        )
        .to(
          [selectionValueRef.current, originalValueRef.current],
          {
            yPercent: 0,
            duration: 0.82,
            ease: "power4.out",
            clearProps: "transform",
          },
          0.06
        )

        // 2) 1/5
        .to(
          roundRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.68,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility",
          },
          0.58
        )

        // 3) Buton görünür hale gelir
        .set(
          continueButtonRef.current,
          {
            autoAlpha: 1,
          },
          0.68
        )

        // Fancy popup core
        .to(
          continueButtonCoreRef.current,
          {
            scale: 1.18,
            rotation: 2.6,
            duration: 0.2,
            ease: "expo.out",
          },
          0.68
        )
        .to(
          continueButtonCoreRef.current,
          {
            scale: 0.94,
            rotation: -1.2,
            duration: 0.09,
            ease: "power3.out",
          },
          0.88
        )
        .to(
          continueButtonCoreRef.current,
          {
            scale: 1,
            rotation: 0,
            duration: 0.12,
            ease: "expo.out",
            clearProps: "transform",
          },
          0.97
        )

        // Ring burst
        .to(
          continueButtonRingRef.current,
          {
            scale: 1.5,
            autoAlpha: 0.72,
            duration: 0.26,
            ease: "expo.out",
          },
          0.7
        )
        .to(
          continueButtonRingRef.current,
          {
            scale: 1.82,
            autoAlpha: 0,
            duration: 0.22,
            ease: "power2.out",
          },
          0.9
        )

        // Ok içeride ayrı bir settle alır
        .to(
          continueArrowRef.current,
          {
            scale: 1.08,
            rotation: 1.8,
            autoAlpha: 1,
            duration: 0.18,
            ease: "expo.out",
          },
          0.79
        )
        .to(
          continueArrowRef.current,
          {
            scale: 1,
            rotation: 0,
            duration: 0.1,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
          0.97
        )

        // 4) Skor sahneye girer
        .to(
          scoreElement,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.74,
            ease: "expo.out",
            clearProps: "transform,opacity,visibility",
          },
          0.98
        )

        // 5) Skor sayımı başlar
        .call(
          () => {
            if (scoreStarted || !scoreElement.isConnected) return;

            scoreStarted = true;
            const state = { value: 0 };

            scoreSound = startScoreCountSound({
              duration: SCORE_COUNT_DURATION,
              score: result.score,
            });

            scoreTween = gsap.to(state, {
              value: result.score,
              duration: SCORE_COUNT_DURATION,
              ease: "power2.out",
              onUpdate: () => {
                scoreElement.textContent = formatScore(state.value);
              },
              onComplete: () => {
                scoreElement.textContent = formatScore(result.score);
                scoreSound?.finish();

                gsap.set(resultLineElement, {
                  autoAlpha: 1,
                });

                resultCharsTween = gsap.to(resultChars, {
                  autoAlpha: 1,
                  scale: 1,
                  duration: 0.2,
                  ease: "power3.out",
                  stagger: 0.018,
                  clearProps: "transform,opacity,visibility",
                });
              },
            });
          },
          undefined,
          1.56
        );
    }, scopeRef);

    return () => {
      if (scoreStartTimeout) {
        window.clearTimeout(scoreStartTimeout);
      }

      scoreSound?.stop();
      scoreTween?.kill();
      resultCharsTween?.kill();
      ctx.revert();
    };
  }, [result]);

  if (!result) return null;

  const guessTone = swatchToneClasses(result.guess.hex);
  const targetTone = swatchToneClasses(result.target.hex);
  const resultLine = t(`game.resultLine.${getResultLineKey(result.score)}`);

  return (
    <div
      ref={scopeRef}
      className="relative grid h-full grid-rows-2 overflow-hidden"
    >
      <section
        className={`relative p-6 sm:p-8 ${guessTone}`}
        style={{ backgroundColor: result.guess.hex }}
      >
        <div className="overflow-hidden">
          <p
            ref={roundRef}
            className="text-base font-semibold opacity-72"
          >
            {result.round}/5
          </p>
        </div>

        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
          <div className="overflow-hidden">
            <p
              ref={selectionLabelRef}
              className="text-sm font-semibold opacity-34"
            >
              {t("game.yourSelection")}
            </p>
          </div>

          <div className="overflow-hidden">
            <p
              ref={selectionValueRef}
              className="text-sm font-bold"
            >
              {formatHsb(result.guess)}
            </p>
          </div>
        </div>

        <div className="absolute top-6 right-6 max-w-60 text-right sm:top-8 sm:right-8">
          <div className="overflow-hidden pb-[0.08em]">
            <p
              ref={scoreRef}
              className="text-7xl leading-[0.82] font-semibold tracking-normal sm:text-[6.3rem]"
            >
              {formatScore(0)}
            </p>
          </div>

          <p
            ref={resultLineRef}
            className="mt-3 text-xl leading-[1.08] font-semibold"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            {Array.from(resultLine).map((char, index) => (
              <span
                key={`${char}-${index}`}
                data-result-char
                className="inline-block will-change-transform"
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </p>
        </div>
      </section>

      <section
        className={`relative p-6 sm:p-8 ${targetTone}`}
        style={{ backgroundColor: result.target.hex }}
      >
        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
          <div className="overflow-hidden">
            <p
              ref={originalLabelRef}
              className="text-sm font-semibold opacity-34"
            >
              {t("game.original")}
            </p>
          </div>

          <div className="overflow-hidden">
            <p
              ref={originalValueRef}
              className="text-sm font-bold"
            >
              {formatHsb(result.target)}
            </p>
          </div>
        </div>

        <button
          ref={continueButtonRef}
          type="button"
          aria-label={
            hasNextRound ? t("game.goNextRound") : t("game.showFinalScore")
          }
          onClick={onContinue}
          className="soft-icon-button result-next-button card-action-size group absolute right-6 bottom-6 grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-8 sm:bottom-8"
        >
          <span
            ref={continueButtonRingRef}
            className="pointer-events-none absolute inset-0 rounded-full border border-current/20"
          />

          <span
            ref={continueButtonCoreRef}
            className="absolute inset-0 rounded-full bg-white text-zinc-950 shadow-[0_16px_34px_rgba(0,0,0,0.22)]"
          />

          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span
              ref={continueArrowRef}
              className="absolute inset-0 z-10 grid place-items-center text-zinc-950 transition-transform duration-300 ease-in-out group-hover:translate-x-[150%]"
            >
              <ArrowRight size={31} strokeWidth={2.1} />
            </span>

            <span className="absolute inset-0 z-10 grid translate-x-[-150%] place-items-center text-zinc-950 transition-transform duration-300 ease-in-out group-hover:translate-x-0">
              <ArrowRight size={31} strokeWidth={2.1} />
            </span>
          </span>
        </button>
      </section>
    </div>
  );
}
