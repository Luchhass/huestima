"use client";

import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
import HueSlider from "@/components/ui/color-picker/HueSlider";
import CartoonCanvas from "@/components/ui/game/CartoonCanvas";
import { useTranslation } from "@/hooks/useLanguage";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { CARTOON_OPTIONS } from "@/lib/cartoons";
import { hsvToHex } from "@/lib/color";

const EXAMPLE_ID = "adventure-time-lady-rainicorn";
const CLASSIC_CUTOUT_SRC = "/adventure-time-lady-rainicorn.png";
const DEMO_SATURATION = 50;
const DEMO_VALUE = 98;

const STEPS = [
  { key: "classic", visual: "classic" },
  { key: "whole", visual: null },
  { key: "flat", visual: "flat" },
  { key: "delta", visual: "delta" },
];

function colorFromHue(hue) {
  return {
    h: hue,
    s: DEMO_SATURATION,
    v: DEMO_VALUE,
    hex: hsvToHex({ h: hue, s: DEMO_SATURATION, v: DEMO_VALUE }),
  };
}

function LineRevealText({ as: Tag = "p", text, className }) {
  return <Tag className={className}>{text}</Tag>;
}

function VisualShell({ hue, onHueChange, cardHeight, children }) {
  return (
    <div
      data-how-visual
      className="flex w-full items-center justify-center gap-4 sm:gap-5"
    >
      <div data-how-bar className="w-[50px] shrink-0" style={{ height: cardHeight }}>
        <div
          className="flag-control-stack flag-control-stack--vertical grid h-full overflow-hidden rounded-[22px] shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
          style={{
            "--flag-control-count": 1,
            gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
          }}
        >
          <HueSlider
            value={hue}
            onChange={onHueChange}
            trackClassName="guess-picker-track h-full w-full rounded-none border-0 shadow-none sm:h-full sm:w-full"
            handleClassName="guess-picker-thumb size-5 shadow-[0_5px_14px_rgba(0,0,0,0.24)]"
            showLabel={false}
            orientation="vertical"
          />
        </div>
      </div>

      <section
        data-how-card
        className="relative w-full max-w-125 overflow-hidden rounded-[26px] bg-surface shadow-[0_18px_38px_rgba(31,25,20,0.18),0_8px_18px_rgba(31,25,20,0.1)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.52),0_8px_18px_rgba(0,0,0,0.32)]"
        style={{ height: cardHeight }}
      >
        {children}
      </section>
    </div>
  );
}

function ThemeColorDemo({ color }) {
  return (
    <>
      <span className="absolute inset-0" style={{ backgroundColor: color.hex }} />
      <Image
        src={CLASSIC_CUTOUT_SRC}
        alt=""
        fill
        sizes="(max-width: 768px) 78vw, 500px"
        priority
        unoptimized
        className="object-cover"
      />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0)_42%,rgba(0,0,0,0.12))]" />
    </>
  );
}

function FlatWholeMaskDemo({ item, color }) {
  return (
    <>
      <Image
        src={item.baseScenePath}
        alt=""
        fill
        sizes="(max-width: 768px) 78vw, 500px"
        priority
        unoptimized
        className="object-cover"
      />
      <span
        className="absolute inset-0"
        style={{
          backgroundColor: color.hex,
          WebkitMaskImage: `url("${item.maskPath}")`,
          maskImage: `url("${item.maskPath}")`,
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "cover",
          maskSize: "cover",
        }}
      />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0)_42%,rgba(0,0,0,0.12))]" />
    </>
  );
}

function DeltaWholeMaskDemo({ item, color }) {
  const canvasColor = {
    ...item,
    ...color,
    paintBase: item.paint,
  };

  return (
    <>
      <CartoonCanvas
        baseSrc={item.baseScenePath}
        sourceSrc={item.originalScenePath}
        layers={item.layers}
        color={canvasColor}
      />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0)_42%,rgba(0,0,0,0.12))]" />
    </>
  );
}

function StepVisual({ type, example, colors, cardHeight, setters }) {
  if (type === "classic") {
    return (
      <VisualShell
        hue={colors.theme.h}
        onHueChange={setters.theme}
        cardHeight={cardHeight}
      >
        <ThemeColorDemo color={colors.theme} />
      </VisualShell>
    );
  }

  if (type === "flat") {
    return (
      <VisualShell hue={colors.flat.h} onHueChange={setters.flat} cardHeight={cardHeight}>
        <FlatWholeMaskDemo item={example} color={colors.flat} />
      </VisualShell>
    );
  }

  if (type === "delta") {
    return (
      <VisualShell
        hue={colors.delta.h}
        onHueChange={setters.delta}
        cardHeight={cardHeight}
      >
        <DeltaWholeMaskDemo item={example} color={colors.delta} />
      </VisualShell>
    );
  }

  return null;
}

export default function HowItWorksPage() {
  const { t } = useTranslation();
  const cardHeight = useResponsiveCardHeight(false, "compact") || "300px";
  const [activeStep, setActiveStep] = useState(0);
  const [themeHue, setThemeHue] = useState(145);
  const [flatHue, setFlatHue] = useState(145);
  const [deltaHue, setDeltaHue] = useState(145);
  const example = useMemo(
    () =>
      CARTOON_OPTIONS.find((item) => item.id === EXAMPLE_ID) ||
      CARTOON_OPTIONS[0],
    [],
  );
  const currentStep = STEPS[activeStep];
  const hasPrevious = activeStep > 0;
  const hasNext = activeStep < STEPS.length - 1;
  const colors = {
    theme: colorFromHue(themeHue),
    flat: colorFromHue(flatHue),
    delta: colorFromHue(deltaHue),
  };
  const setters = {
    theme: setThemeHue,
    flat: setFlatHue,
    delta: setDeltaHue,
  };
  const title = t(`howItWorks.steps.${currentStep.key}.title`);
  const copy = t(`howItWorks.steps.${currentStep.key}.copy`);

  if (!example) return null;

  return (
    <main className="app-gradient h-dvh w-full overflow-hidden px-5 pb-21 pt-24 text-zinc-950 dark:text-zinc-50 sm:px-8 sm:pb-24 sm:pt-28">
      <section
        data-route-transition-scope
        className="mx-auto flex h-full w-full max-w-[68rem] flex-col justify-center gap-4"
      >
        <div
          key={currentStep.key}
          className="grid min-h-0 flex-1 items-center gap-8 lg:grid-cols-[minmax(0,0.84fr)_minmax(27rem,1fr)]"
        >
          <article className="flex h-[20rem] min-w-0 flex-col justify-center sm:h-[21rem] lg:h-[22rem]">
            <LineRevealText
              as="h1"
              text={title}
              className="text-[clamp(1.55rem,2.35vw,2.45rem)] font-semibold leading-[1.04] tracking-normal"
            />
            <LineRevealText
              text={copy}
              className="mt-4 max-w-[42rem] text-[clamp(0.95rem,1.28vw,1.08rem)] font-medium leading-[1.42] text-zinc-700 dark:text-zinc-300"
            />
          </article>

          {currentStep.visual ? (
            <div className="min-w-0">
              <StepVisual
                type={currentStep.visual}
                example={example}
                colors={colors}
                setters={setters}
                cardHeight={cardHeight}
              />
            </div>
          ) : null}
        </div>

        <nav
          className="relative flex shrink-0 items-center justify-between gap-4"
          aria-label={t("howItWorks.navigation")}
        >
          <div className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            {STEPS.map((step, index) => (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveStep(index)}
                className="grid h-4 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                aria-label={t("howItWorks.goToStep", { step: index + 1 })}
              >
                <span
                  className={`h-2.5 rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    index === activeStep
                      ? "w-8 bg-black dark:bg-white"
                      : "w-2.5 bg-zinc-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
              disabled={!hasPrevious}
              className="rgb-hover-button inline-flex size-12 items-center justify-center rounded-full bg-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition disabled:pointer-events-none disabled:opacity-25 dark:bg-white dark:text-black"
              aria-label={t("howItWorks.previous")}
            >
              <span className="relative z-10 inline-flex items-center justify-center">
                <ChevronLeft size={19} strokeWidth={2.2} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep((step) => Math.min(STEPS.length - 1, step + 1))}
              disabled={!hasNext}
              className="rgb-hover-button inline-flex h-12 min-w-32 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition disabled:pointer-events-none disabled:opacity-25 dark:bg-white dark:text-black"
            >
              <span className="relative z-10">{t("howItWorks.next")}</span>
            </button>
          </div>
        </nav>
      </section>
    </main>
  );
}
