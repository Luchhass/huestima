"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { X } from "lucide-react";
import { useAppChromeHidden } from "@/hooks/useAppChromeHidden";
import { useScreenReveal } from "@/hooks/useScreenReveal";
import { useTranslation } from "@/hooks/useLanguage";
import { MAX_ROUND_SCORE, ROUND_COUNT } from "@/lib/constants";
import { colorToneHex, gradientBackground, readableTone } from "@/lib/color";
import { getFinalAssessmentKey } from "@/lib/i18n";
import { formatScore } from "@/lib/scoring";
import { playFinalScore } from "@/lib/sound";

const EXPANDED_REVEAL_DELAY = 320;

function tileGradient(result) {
  return gradientBackground(result.guess);
}

function colorTitleLabel(color) {
  if (color?.left && color?.right) {
    return `${color.left.hex} / ${color.right.hex}`;
  }

  return color?.hex || "";
}

function getScoreColor(score, maxScore) {
  const ratio = Math.max(0, Math.min(score / maxScore, 1));
  const hue = Math.round(ratio * 120);

  return `hsl(${hue} 100% 58%)`;
}

function tileScoreTone(hex) {
  return readableTone(hex) === "dark" ? "text-zinc-950" : "text-white";
}

export default function FinalSummary({
  results,
  totalScore,
  averageScore,
  maxScore: providedMaxScore,
  onPlayAgain,
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);

  useAppChromeHidden(true);
  useScreenReveal(scopeRef, [results.length], {
    delay: EXPANDED_REVEAL_DELAY,
  });

  const closeRef = useRef(null);
  const scoreRef = useRef(null);
  const maxScoreRef = useRef(null);
  const assessmentRef = useRef(null);

  const playAgainRef = useRef(null);
  const playAgainRingRef = useRef(null);

  const maxScore = providedMaxScore || ROUND_COUNT * MAX_ROUND_SCORE;
  const scoreColor = getScoreColor(totalScore, maxScore);
  const assessment = t(`game.assessment.${getFinalAssessmentKey(averageScore)}`);
  const assessmentWords = assessment.split(" ");
  const hasWrappedTiles = results.length > ROUND_COUNT;

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reduceMotion.matches) {
      playFinalScore(totalScore, maxScore);
      return undefined;
    }

    const ctx = gsap.context(() => {
      const assessmentChars = gsap.utils.toArray(
        "[data-summary-assessment-char]",
        assessmentRef.current
      );

      const tiles = gsap.utils.toArray("[data-summary-tile]");
      const guessLayers = gsap.utils.toArray("[data-summary-guess-layer]");
      const tileScores = gsap.utils.toArray("[data-summary-tile-score]");

      gsap.set(scoreRef.current, {
        yPercent: 120,
        autoAlpha: 0,
        force3D: true,
      });

      gsap.set(maxScoreRef.current, {
        yPercent: 100,
        autoAlpha: 0,
        force3D: true,
      });

      gsap.set(assessmentRef.current, {
        autoAlpha: 0,
      });

      gsap.set(assessmentChars, {
        autoAlpha: 0,
        scale: 0.97,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(closeRef.current, {
        scale: 0.72,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(tiles, {
        y: 18,
        autoAlpha: 0,
        force3D: true,
      });

      gsap.set(guessLayers, {
        autoAlpha: 0,
      });

      gsap.set(tileScores, {
        y: 10,
        scale: 0.96,
        autoAlpha: 0,
        transformOrigin: "left top",
        force3D: true,
      });

      gsap.set(playAgainRef.current, {
        scale: 0,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      gsap.set(playAgainRingRef.current, {
        scale: 0.92,
        autoAlpha: 0,
        transformOrigin: "center center",
        force3D: true,
      });

      const timeline = gsap.timeline();

      timeline
        // Büyük toplam skor
        .to(scoreRef.current, {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.78,
          ease: "expo.out",
          clearProps: "transform,opacity,visibility",
        })
        .call(
          () => {
            playFinalScore(totalScore, maxScore);
          },
          undefined,
          0.14
        )

        // / 50
        .to(
          maxScoreRef.current,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.58,
            ease: "power4.out",
            clearProps: "transform,opacity,visibility",
          },
          0.2
        )

        // Puan altı metin harf harf görünür
        .set(
          assessmentRef.current,
          {
            autoAlpha: 1,
          },
          0.38
        )
        .to(
          assessmentChars,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.2,
            ease: "power3.out",
            stagger: 0.018,
            clearProps: "transform,opacity,visibility",
          },
          0.38
        )

        // Close butonu
        .to(
          closeRef.current,
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.48,
            ease: "back.out(1.45)",
            clearProps: "transform,opacity,visibility",
          },
          0.42
        )

        // 1) Kareler önce tamamen doğru renk olarak gelir
        .to(
          tiles,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.62,
            ease: "power4.out",
            stagger: 0.065,
            clearProps: "transform,opacity,visibility",
          },
          0.92
        )

        // 2) Sonra final diagonal karşılaştırma görünümü oluşur
        .to(
          guessLayers,
          {
            autoAlpha: 1,
            duration: 0.54,
            ease: "power3.out",
            stagger: 0.075,
            clearProps: "opacity,visibility",
          },
          1.34
        )

        // 3) Kare içi skorlar gelir
        .to(
          tileScores,
          {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.46,
            ease: "power4.out",
            stagger: 0.06,
            clearProps: "transform,opacity,visibility",
          },
          1.68
        )

        // Play again — fancy popup
        .to(
          playAgainRef.current,
          {
            scale: 1.045,
            autoAlpha: 1,
            duration: 0.22,
            ease: "expo.out",
          },
          1.98
        )
        .to(
          playAgainRef.current,
          {
            scale: 0.985,
            duration: 0.09,
            ease: "power3.out",
          },
          2.2
        )
        .to(
          playAgainRef.current,
          {
            scale: 1,
            duration: 0.12,
            ease: "expo.out",
            clearProps: "transform,opacity,visibility",
          },
          2.29
        )

        // Buton halka patlaması
        .to(
          playAgainRingRef.current,
          {
            scale: 1.06,
            autoAlpha: 0.58,
            duration: 0.24,
            ease: "expo.out",
          },
          2
        )
        .to(
          playAgainRingRef.current,
          {
            scale: 1.14,
            autoAlpha: 0,
            duration: 0.22,
            ease: "power2.out",
          },
          2.2
        );
    }, scopeRef);

    return () => ctx.revert();
  }, [assessment, maxScore, totalScore]);

  return (
    <div
      ref={scopeRef}
      className="final-summary relative flex h-full min-h-0 flex-col overflow-hidden bg-black p-6 text-white sm:p-8"
    >
      <Link
        ref={closeRef}
        href="/"
        aria-label={t("common.backHome")}
        className="solo-close-button absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-8 sm:top-8 sm:size-9"
      >
        <X className="size-6 sm:size-6.5" strokeWidth={1.7} />
      </Link>

      <div data-screen-reveal className="max-w-100 pr-10">
        <div>
          <div className="flex items-end gap-2">
            <div className="overflow-hidden pb-[0.08em]">
              <p
                ref={scoreRef}
                className="text-[clamp(3.6rem,13vw,4.95rem)] leading-[0.82] font-semibold tracking-normal"
                style={{ color: scoreColor }}
              >
                {formatScore(totalScore)}
              </p>
            </div>

            <div className="overflow-hidden">
              <p
                ref={maxScoreRef}
                className="pb-1 text-[clamp(1.15rem,4vw,1.5rem)] leading-none font-semibold text-white/35"
              >
                / {maxScore}
              </p>
            </div>
          </div>

          <p
            ref={assessmentRef}
            className="mt-4 max-w-[24rem] text-[0.95rem] leading-[1.22] font-medium text-white/84 sm:text-base"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            {assessmentWords.map((word, wordIndex) => (
              <span
                key={`${word}-${wordIndex}`}
                className="inline-block whitespace-nowrap"
              >
                {Array.from(word).map((char, charIndex) => (
                  <span
                    key={`${wordIndex}-${charIndex}-${char}`}
                    data-summary-assessment-char
                    className="inline-block will-change-transform"
                  >
                    {char}
                  </span>
                ))}

                {wordIndex < assessmentWords.length - 1 && (
                  <span
                    data-summary-assessment-char
                    className="inline-block w-[0.28em]"
                    aria-hidden="true"
                  />
                )}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div data-screen-reveal className="mt-7 w-full max-w-[32rem]">
        <div
          className={`grid w-full grid-cols-5 overflow-hidden ${
            hasWrappedTiles
              ? "scrollbar-hidden max-h-[13.5rem] overflow-y-auto"
              : ""
          }`}
        >
          {results.map((result) => (
            <div
              key={result.round}
              data-summary-tile
              className="relative aspect-square min-w-0 overflow-hidden"
              style={{ background: gradientBackground(result.target) }}
              title={t("room.roundTitle", {
                round: result.round,
                target: colorTitleLabel(result.target),
                guess: colorTitleLabel(result.guess),
              })}
            >
              <span
                data-summary-guess-layer
                className="pointer-events-none absolute inset-0"
                style={{
                  background: tileGradient(result),
                  clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                }}
              />

              <span
                data-summary-tile-score
                className={`absolute top-1.5 left-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate text-[clamp(0.86rem,3.15vw,1.05rem)] leading-none font-semibold tabular-nums sm:top-2 sm:left-2 sm:max-w-[calc(100%-1rem)] sm:text-[1.08rem] ${tileScoreTone(
                  colorToneHex(result.target)
                )}`}
              >
                {formatScore(result.score)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div data-screen-reveal className="mt-auto w-full max-w-[32rem]">
        <div className="relative w-full">
          <span
            ref={playAgainRingRef}
            className="pointer-events-none absolute inset-0 rounded-full border border-white/28"
          />

          <button
            ref={playAgainRef}
            type="button"
            onClick={onPlayAgain}
            className="rgb-hover-button card-action-height w-full rounded-full bg-white px-6 text-base font-semibold text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span className="relative z-10">{t("game.playAgain")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
