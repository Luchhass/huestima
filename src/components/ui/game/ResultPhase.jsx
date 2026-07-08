"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight, X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import {
  colorToneHex,
  gradientBackground,
  isCartoonColor,
  isFlagColor,
  isGradientColor,
  readableTone,
} from "@/lib/color";
import { getResultLineKey } from "@/lib/i18n";
import { formatScore } from "@/lib/scoring";
import {
  playScoreResolve,
  resumeAudioIfAllowed,
  startScoreCountSound,
} from "@/lib/sound";
import { APP_NAME } from "@/lib/constants";
import CartoonOverlay from "./CartoonOverlay";
import FlagOverlay from "./FlagOverlay";

function getScoreCountDuration(score) {
  const normalizedScore = Math.min(1, Math.max(0, Number(score) / 10 || 0));

  if (normalizedScore <= 0.005) return 0.58;
  if (normalizedScore < 0.25) return 0.82;

  return 0.95 + normalizedScore * 1.6;
}

function swatchToneClasses(hex) {
  return readableTone(hex) === "dark" ? "text-zinc-950" : "text-white";
}

function formatHsb(color) {
  if (isGradientColor(color)) {
    return `H${Math.round(color.left.h)} -> H${Math.round(color.right.h)}`;
  }

  if (isFlagColor(color)) {
    return `H${Math.round(color.h)} S${Math.round(color.s)} B${Math.round(color.v)}`;
  }

  const { h, s, v } = color;
  return `H${Math.round(h)} S${Math.round(s)} B${Math.round(v)}`;
}

function renderAnimatedResultLine(line) {
  return line.split(/(\s+)/).map((token, tokenIndex) => {
    if (!token.trim()) {
      return <span key={`space-${tokenIndex}`}>{token}</span>;
    }

    return (
      <span
        key={`word-${token}-${tokenIndex}`}
        className="inline-block whitespace-nowrap"
      >
        {Array.from(token).map((char, charIndex) => (
          <span
            key={`${char}-${charIndex}`}
            data-result-char
            className="inline-block will-change-transform"
          >
            {char}
          </span>
        ))}
      </span>
    );
  });
}

function compactTargets(targets) {
  return targets.filter(Boolean);
}

function hasTarget(target) {
  return Array.isArray(target) ? target.length > 0 : Boolean(target);
}

function setIfTarget(target, vars) {
  if (hasTarget(target)) {
    gsap.set(target, vars);
  }
}

function visualResultLabel(color) {
  if (isCartoonColor(color)) return color.cartoonLabel || "";
  if (isFlagColor(color)) return color.flagLabel || "";

  return "";
}

export default function ResultPhase({
  result,
  hasNextRound,
  onContinue,
  canFinishRun = false,
  onFinishRun,
  roundLabel = result ? `${result.round}/5` : "",
  visualIntroDelayMs = 0,
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);

  const roundRef = useRef(null);
  const scoreRef = useRef(null);
  const scoreCountDuration = getScoreCountDuration(result?.score);

  const continueButtonRef = useRef(null);
  const continueButtonCoreRef = useRef(null);
  const continueButtonRingRef = useRef(null);
  const continueArrowRef = useRef(null);
  const finishRunButtonRef = useRef(null);
  const finishRunButtonRingRef = useRef(null);
  const finishRunButtonIconRef = useRef(null);

  const selectionLabelRef = useRef(null);
  const selectionValueRef = useRef(null);
  const originalLabelRef = useRef(null);
  const originalValueRef = useRef(null);

  const resultLineRef = useRef(null);
  const guessSectionRef = useRef(null);
  const targetSectionRef = useRef(null);
  const splitOverlayRef = useRef(null);

  useLayoutEffect(() => {
    if (!result) return undefined;

    resumeAudioIfAllowed();

    const scoreElement = scoreRef.current;
    const resultLineElement = resultLineRef.current;
    const guessSectionElement = guessSectionRef.current;
    const targetSectionElement = targetSectionRef.current;
    const splitOverlayElement = splitOverlayRef.current;

    if (!scoreElement || !resultLineElement) return undefined;

    const canAnimateSplitReveal = Boolean(
      scopeRef.current &&
        guessSectionElement &&
        targetSectionElement &&
        splitOverlayElement &&
        (isFlagColor(result.guess) ||
          isFlagColor(result.target) ||
          isCartoonColor(result.guess) ||
          isCartoonColor(result.target))
    );
    const introDelay = Math.max(0, Number(visualIntroDelayMs) || 0) / 1000;
    const splitRevealDuration = canAnimateSplitReveal ? 1.12 : 0;
    const revealStart = introDelay + splitRevealDuration;
    const at = (position) => position + revealStart;
    const scoreStartDelayMs = Math.round((revealStart + 1.56) * 1000);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reduceMotion.matches) {
      scoreElement.textContent = formatScore(result.score);

      setIfTarget(compactTargets([resultLineElement, finishRunButtonRef.current]), {
        autoAlpha: 1,
        scale: 1,
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
      const stackedTextTargets = compactTargets([
        selectionLabelRef.current,
        selectionValueRef.current,
        originalLabelRef.current,
        originalValueRef.current,
      ]);
      const labelTargets = compactTargets([
        selectionLabelRef.current,
        originalLabelRef.current,
      ]);
      const valueTargets = compactTargets([
        selectionValueRef.current,
        originalValueRef.current,
      ]);
      const actionButtonTargets = compactTargets([
        continueButtonRef.current,
        finishRunButtonRef.current,
      ]);
      const hasContinueButton = Boolean(
        continueButtonRef.current &&
          continueButtonCoreRef.current &&
          continueButtonRingRef.current &&
          continueArrowRef.current
      );
      const hasFinishButton = Boolean(
        finishRunButtonRef.current &&
          finishRunButtonRingRef.current &&
          finishRunButtonIconRef.current
      );
      const continueButtonCoreTarget = hasContinueButton
        ? continueButtonCoreRef.current
        : {};
      const continueButtonRingTarget = hasContinueButton
        ? continueButtonRingRef.current
        : {};
      const continueArrowTarget = hasContinueButton ? continueArrowRef.current : {};

      const startScoreCounter = () => {
        if (scoreStarted || !scoreElement.isConnected) return;

        scoreStarted = true;
        resumeAudioIfAllowed();
        const state = { value: 0 };

        scoreSound = startScoreCountSound({
          duration: scoreCountDuration,
          score: result.score,
        });

        scoreTween = gsap.to(state, {
          value: result.score,
          duration: scoreCountDuration,
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

            if (resultChars.length > 0) {
              resultCharsTween = gsap.to(resultChars, {
                autoAlpha: 1,
                scale: 1,
                duration: 0.2,
                ease: "power3.out",
                stagger: 0.018,
                clearProps: "transform,opacity,visibility",
              });
            }
          },
        });
      };

      const timeline = gsap.timeline();

      if (canAnimateSplitReveal) {
        gsap.set(splitOverlayElement, {
          autoAlpha: 1,
          yPercent: 0,
          top: 0,
          right: 0,
          bottom: "auto",
          left: 0,
          height: "100%",
          scale: 1,
          transformOrigin: "top center",
          force3D: true,
        });

        gsap.set(guessSectionElement, {
          autoAlpha: 1,
          yPercent: 0,
          force3D: true,
        });

        gsap.set(targetSectionElement, {
          autoAlpha: 1,
          yPercent: 100,
          force3D: true,
        });

        timeline
          .to(
            splitOverlayElement,
            {
              height: "50%",
              duration: 0.56,
              ease: "expo.inOut",
            },
            introDelay
          )
          .to(
            targetSectionElement,
            {
              yPercent: 0,
              duration: 0.58,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
            introDelay + 0.5
          )
          .to(
            splitOverlayElement,
            {
              autoAlpha: 0,
              duration: 0.16,
              ease: "power2.out",
            },
            introDelay + 1
          )
          .set(
            splitOverlayElement,
            {
              pointerEvents: "none",
            },
            introDelay + 1.12
          );
      }

      setIfTarget(stackedTextTargets, {
        yPercent: 120,
        force3D: true,
      });

      setIfTarget(roundRef.current, {
        yPercent: -120,
        autoAlpha: 0,
        force3D: true,
      });

      setIfTarget(scoreElement, {
        yPercent: 120,
        autoAlpha: 0,
        transformOrigin: "right center",
        force3D: true,
      });

      setIfTarget(continueButtonRef.current, {
        autoAlpha: 0,
      });

      if (hasFinishButton) {
        gsap.set(finishRunButtonRef.current, {
          scale: 0,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });

        gsap.set(finishRunButtonRingRef.current, {
          scale: 0.22,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });

        gsap.set(finishRunButtonIconRef.current, {
          scale: 0.74,
          rotation: 8,
          autoAlpha: 0,
          transformOrigin: "center center",
          force3D: true,
        });
      }

      if (hasContinueButton) {
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
      }

      setIfTarget(resultLineElement, {
        autoAlpha: 0,
      });

      setIfTarget(resultChars, {
        autoAlpha: 0,
        scale: 0.97,
        transformOrigin: "center center",
        force3D: true,
      });

      scoreElement.textContent = formatScore(0);

      timeline
        .add(() => {
          scoreStartTimeout = window.setTimeout(
            startScoreCounter,
            scoreStartDelayMs
          );
        }, 0)
        // 1) Your selection + Original aynı anda açılır
        .to(
          labelTargets,
          {
            yPercent: 0,
            duration: 0.78,
            ease: "power4.out",
            clearProps: "transform",
          },
          at(0)
        )
        .to(
          valueTargets,
          {
            yPercent: 0,
            duration: 0.82,
            ease: "power4.out",
            clearProps: "transform",
          },
          at(0.06)
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
          at(0.58)
        )

        // 3) Buton görünür hale gelir
        .set(
          actionButtonTargets,
          {
            autoAlpha: 1,
          },
          at(0.68)
        );

      if (hasFinishButton) {
        timeline
          .to(
            finishRunButtonRef.current,
            {
              scale: 1.14,
              rotation: -2.4,
              duration: 0.2,
              ease: "expo.out",
            },
            at(0.68)
          )
          .to(
            finishRunButtonRef.current,
            {
              scale: 0.94,
              rotation: 1,
              duration: 0.09,
              ease: "power3.out",
            },
            at(0.88)
          )
          .to(
            finishRunButtonRef.current,
            {
              scale: 1,
              rotation: 0,
              duration: 0.12,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
            at(0.97)
          )
          .to(
            finishRunButtonRingRef.current,
            {
              scale: 1.42,
              autoAlpha: 0.58,
              duration: 0.25,
              ease: "expo.out",
            },
            at(0.69)
          )
          .to(
            finishRunButtonRingRef.current,
            {
              scale: 1.76,
              autoAlpha: 0,
              duration: 0.22,
              ease: "power2.out",
            },
            at(0.88)
          )
          .to(
            finishRunButtonIconRef.current,
            {
              scale: 1,
              rotation: 0,
              autoAlpha: 1,
              duration: 0.2,
              ease: "expo.out",
              clearProps: "transform,opacity,visibility",
            },
            at(0.78)
          );
      }

      timeline
        // Fancy popup core
        .to(
          continueButtonCoreTarget,
          {
            scale: 1.18,
            rotation: 2.6,
            duration: 0.2,
            ease: "expo.out",
          },
          at(0.68)
        )
        .to(
          continueButtonCoreTarget,
          {
            scale: 0.94,
            rotation: -1.2,
            duration: 0.09,
            ease: "power3.out",
          },
          at(0.88)
        )
        .to(
          continueButtonCoreTarget,
          {
            scale: 1,
            rotation: 0,
            duration: 0.12,
            ease: "expo.out",
            clearProps: "transform",
          },
          at(0.97)
        )

        // Ring burst
        .to(
          continueButtonRingTarget,
          {
            scale: 1.5,
            autoAlpha: 0.72,
            duration: 0.26,
            ease: "expo.out",
          },
          at(0.7)
        )
        .to(
          continueButtonRingTarget,
          {
            scale: 1.82,
            autoAlpha: 0,
            duration: 0.22,
            ease: "power2.out",
          },
          at(0.9)
        )

        // Ok içeride ayrı bir settle alır
        .to(
          continueArrowTarget,
          {
            scale: 1.08,
            rotation: 1.8,
            autoAlpha: 1,
            duration: 0.18,
            ease: "expo.out",
          },
          at(0.79)
        )
        .to(
          continueArrowTarget,
          {
            scale: 1,
            rotation: 0,
            duration: 0.1,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
          at(0.97)
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
          at(0.98)
        )

        // 5) Skor sayımı başlar
        .call(
          () => {
            if (scoreStarted || !scoreElement.isConnected) return;

            scoreStarted = true;
            resumeAudioIfAllowed();
            const state = { value: 0 };

            scoreSound = startScoreCountSound({
              duration: scoreCountDuration,
              score: result.score,
            });

            scoreTween = gsap.to(state, {
              value: result.score,
              duration: scoreCountDuration,
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

                if (resultChars.length > 0) {
                  resultCharsTween = gsap.to(resultChars, {
                    autoAlpha: 1,
                    scale: 1,
                    duration: 0.2,
                    ease: "power3.out",
                    stagger: 0.018,
                    clearProps: "transform,opacity,visibility",
                  });
                }
              },
            });
          },
          undefined,
          at(1.56)
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
  }, [result, scoreCountDuration, visualIntroDelayMs]);

  if (!result) return null;

  const guessTone = swatchToneClasses(colorToneHex(result.guess));
  const targetTone = swatchToneClasses(colorToneHex(result.target));
  const isCartoonGuessResult = isCartoonColor(result.guess);
  const isCartoonTargetResult = isCartoonColor(result.target);
  const isVisualResult =
    isFlagColor(result.guess) ||
    isFlagColor(result.target) ||
    isCartoonGuessResult ||
    isCartoonTargetResult;
  const splitOverlayLabel = visualResultLabel(result.guess);
  const resultLine = t(`game.resultLine.${getResultLineKey(result.score)}`);

  return (
    <div
      ref={scopeRef}
      className="relative grid h-full grid-rows-2 overflow-hidden"
    >
      {isVisualResult && (
        <section
          ref={splitOverlayRef}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[inherit] p-6 sm:p-8 ${guessTone}`}
          style={{ background: gradientBackground(result.guess) }}
        >
          {isFlagColor(result.guess) && <FlagOverlay color={result.guess} />}

          {isCartoonGuessResult && (
            <CartoonOverlay
              color={result.guess}
              variant="guess"
              size="card"
            />
          )}

          <div className="relative z-20">
            <p className="text-base font-semibold opacity-72">{roundLabel}</p>
          </div>

          <div className="absolute top-6 right-6 z-20 text-right sm:top-8 sm:right-8">
            <p className="text-lg font-semibold opacity-42">{APP_NAME}</p>
          </div>

          {splitOverlayLabel && (
            <p className="absolute bottom-6 left-6 z-20 max-w-[calc(100%-3rem)] truncate text-sm font-bold sm:bottom-8 sm:left-8">
              {splitOverlayLabel}
            </p>
          )}
        </section>
      )}

      <section
        ref={guessSectionRef}
        className={`relative min-h-0 overflow-hidden p-6 sm:p-8 ${guessTone}`}
        style={{ background: gradientBackground(result.guess) }}
      >
        {isFlagColor(result.guess) && (
          <FlagOverlay color={result.guess} />
        )}

        {isCartoonGuessResult && (
          <CartoonOverlay
            color={result.guess}
            variant="guess"
            size="result"
          />
        )}

        <div className="relative z-20 overflow-hidden">
          <p
            ref={roundRef}
            className="text-base font-semibold opacity-72"
          >
            {roundLabel}
          </p>
        </div>

        <div className="absolute bottom-6 left-6 z-20 sm:bottom-8 sm:left-8">
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

        <div className="absolute top-6 right-6 z-20 max-w-[calc(100%-3rem)] text-right sm:top-8 sm:right-8 sm:max-w-72">
          <div className="overflow-hidden pb-[0.08em]">
            <p
              ref={scoreRef}
              className="whitespace-nowrap text-[clamp(4rem,18vw,4.5rem)] leading-[0.82] font-semibold tracking-normal tabular-nums sm:text-[6.3rem]"
            >
              {formatScore(0)}
            </p>
          </div>

          <p
            ref={resultLineRef}
            className="mt-3 whitespace-normal break-normal text-xl leading-[1.08] font-semibold"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            {renderAnimatedResultLine(resultLine)}
          </p>
        </div>
      </section>

      <section
        ref={targetSectionRef}
        className={`relative min-h-0 overflow-hidden p-6 sm:p-8 ${targetTone}`}
        style={{ background: gradientBackground(result.target) }}
      >
        {isFlagColor(result.target) && (
          <FlagOverlay color={result.target} />
        )}

        {isCartoonTargetResult && (
          <CartoonOverlay
            color={result.target}
            variant="reference"
            size="result"
          />
        )}

        <div className="absolute bottom-6 left-6 z-20 sm:bottom-8 sm:left-8">
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

        {canFinishRun && (
          <button
            ref={finishRunButtonRef}
            type="button"
            aria-label={t("game.finishRun")}
            onClick={onFinishRun}
            className="soft-icon-button result-action-button card-action-size group absolute right-[5.75rem] bottom-6 z-30 grid place-items-center rounded-full bg-zinc-950 text-white shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-[6.25rem] sm:bottom-8"
          >
            <span
              ref={finishRunButtonRingRef}
              className="pointer-events-none absolute -inset-1 rounded-full border border-current/28"
            />
            <span ref={finishRunButtonIconRef} className="relative z-10 grid place-items-center">
              <X size={29} strokeWidth={2.15} />
            </span>
          </button>
        )}

        <button
          ref={continueButtonRef}
          type="button"
          aria-label={
            hasNextRound ? t("game.goNextRound") : t("game.showFinalScore")
          }
          onClick={onContinue}
          className="soft-icon-button result-action-button result-next-button card-action-size group absolute right-6 bottom-6 z-30 grid place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-current/45 sm:right-8 sm:bottom-8"
        >
          <span
            ref={continueButtonRingRef}
            className="pointer-events-none absolute -inset-1 rounded-full border border-current/28"
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
