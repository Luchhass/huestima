"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { useTranslation } from "@/hooks/useLanguage";
import { playIntroStep } from "@/lib/sound";

const INTRO_TOTAL_DURATION_MS = 2420;

function getResumedStepIndex(elapsedMs) {
  if (elapsedMs < 740) return 0;
  if (elapsedMs < 1520) return 1;
  return 2;
}

export default function IntroPhase({
  onComplete,
  resumeElapsedMs = 0,
  resumeInstantly = false,
}) {
  const { t } = useTranslation();
  const scopeRef = useRef(null);
  const wordRefs = useRef([]);
  const onCompleteRef = useRef(onComplete);
  const steps = useMemo(
    () => [t("game.ready"), t("game.set"), t("game.go")],
    [t]
  );
  const widestStep = useMemo(
    () =>
      steps.reduce(
        (widest, step) => (step.length > widest.length ? step : widest),
        steps[0]
      ),
    [steps]
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!resumeInstantly) return undefined;

    const remainingMs = Math.max(INTRO_TOTAL_DURATION_MS - resumeElapsedMs, 0);

    if (remainingMs <= 0) {
      onCompleteRef.current?.();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [resumeElapsedMs, resumeInstantly]);

  useLayoutEffect(() => {
    if (resumeInstantly) return undefined;

    const ctx = gsap.context(() => {
      const words = wordRefs.current.filter(Boolean);

      gsap.set(words, {
        yPercent: -120,
        force3D: true,
      });

      const timeline = gsap.timeline({
        onComplete: () => {
          onCompleteRef.current?.();
        },
      });

      timeline
        // READY
        .addLabel("ready")
        .to(
          words[0],
          {
            yPercent: 0,
            duration: 0.58,
            ease: "power4.out",
          },
          "ready"
        )
        // Ses, ready görsel olarak satıra oturduğu hissinde vuruyor
        .call(() => playIntroStep(0), undefined, "ready+=0.33")
        .to({}, { duration: 0.16 })

        // SET
        .addLabel("set")
        .to(
          words[0],
          {
            yPercent: 120,
            duration: 0.62,
            ease: "power4.inOut",
          },
          "set"
        )
        .to(
          words[1],
          {
            yPercent: 0,
            duration: 0.62,
            ease: "power4.inOut",
          },
          "set"
        )
        // Set satıra otururken tick vuruyor
        .call(() => playIntroStep(1), undefined, "set+=0.42")
        .to({}, { duration: 0.16 })

        // GO
        .addLabel("go")
        .to(
          words[1],
          {
            yPercent: 120,
            duration: 0.62,
            ease: "power4.inOut",
          },
          "go"
        )
        .to(
          words[2],
          {
            yPercent: 0,
            duration: 0.62,
            ease: "power4.inOut",
          },
          "go"
        )
        // Go satıra otururken son tick vuruyor
        .call(() => playIntroStep(2), undefined, "go+=0.42")
        .to({}, { duration: 0.28 });
    }, scopeRef);

    return () => ctx.revert();
  }, [resumeInstantly, steps]);

  if (resumeInstantly) {
    const currentStep = steps[getResumedStepIndex(resumeElapsedMs)] || steps[2];

    return (
      <div
        ref={scopeRef}
        data-fullscreen-surface-transition
        className="relative h-full bg-black p-6 text-white sm:p-8"
      >
        <div className="pointer-events-none absolute top-6 right-6 text-7xl leading-none font-semibold tracking-normal lowercase sm:top-8 sm:right-8 sm:text-[7rem]">
          <div data-intro-word-mask className="relative overflow-hidden pb-[0.12em]">
            <span className="block select-none">{currentStep}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scopeRef}
      data-fullscreen-surface-transition
      className="relative h-full bg-black p-6 text-white sm:p-8"
    >
      <div className="pointer-events-none absolute top-6 right-6 text-7xl leading-none font-semibold tracking-normal lowercase sm:top-8 sm:right-8 sm:text-[7rem]">
        <div
          data-intro-word-mask
          className="relative overflow-hidden pb-[0.12em]"
        >
          <span className="invisible block select-none" aria-hidden="true">
            {widestStep}
          </span>

          {steps.map((step, index) => (
            <span
              key={step}
              ref={(element) => {
                wordRefs.current[index] = element;
              }}
              className="absolute inset-0 flex items-start justify-end whitespace-nowrap will-change-transform"
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
