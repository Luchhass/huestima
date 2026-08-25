"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import HueSlider from "@/components/ui/color-picker/HueSlider";
import CartoonCanvas from "@/components/ui/game/CartoonCanvas";
import { useTranslation } from "@/hooks/useLanguage";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { CARTOON_OPTIONS } from "@/lib/cartoons";
import { hsvToHex } from "@/lib/color";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import FooterPageShell, {
  FooterPageAction,
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";

const HOW_IT_WORKS_CARTOON_ID = "adventure-time-9596374";
const CLASSIC_CUTOUT_SRC = "/how-it-works/lady-rainicorn-bad-cutout.png";
const DEMO_SATURATION = 50;
const DEMO_VALUE = 98;

const STEPS = [
  { key: "classic", visual: "classic" },
  { key: "whole", visual: "whole" },
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
      className="flex w-full flex-col items-center justify-center gap-3 lg:flex-row lg:gap-5"
      style={{
        "--how-card-height": cardHeight,
        "--how-card-mobile-height": "clamp(150px,30dvh,218px)",
        "--how-card-tablet-height": "clamp(220px,34dvh,280px)",
      }}
    >
      <div
        data-how-bar
        className="hidden h-[var(--how-card-height)] w-[50px] shrink-0 lg:block"
      >
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
        className="relative h-[var(--how-card-mobile-height)] w-full max-w-125 overflow-hidden rounded-[22px] bg-surface shadow-[var(--app-card-shadow)] md:h-[var(--how-card-tablet-height)] md:rounded-[26px] lg:h-[var(--how-card-height)]"
      >
        {children}
      </section>

      <div data-how-bar-mobile className="h-[50px] w-full max-w-125 shrink-0 lg:hidden">
        <div
          className="flag-control-stack flag-control-stack--horizontal grid h-full w-full overflow-hidden rounded-[22px] shadow-[0_18px_34px_rgba(0,0,0,0.2)]"
          style={{
            "--flag-control-count": 1,
          }}
        >
          <HueSlider
            value={hue}
            onChange={onHueChange}
            trackClassName="guess-picker-track !h-full !w-full rounded-none border-0 shadow-none"
            handleClassName="guess-picker-thumb size-8 shadow-[0_8px_22px_rgba(0,0,0,0.26)]"
            showLabel={false}
            orientation="horizontal"
          />
        </div>
      </div>
    </div>
  );
}

function VisualPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full flex-col items-center justify-center gap-3 opacity-0 pointer-events-none lg:flex-row lg:gap-5"
      style={{
        "--how-card-height": "300px",
        "--how-card-mobile-height": "clamp(150px,30dvh,218px)",
        "--how-card-tablet-height": "clamp(220px,34dvh,280px)",
      }}
    >
      <div className="relative h-[var(--how-card-mobile-height)] w-full max-w-125 md:h-[var(--how-card-tablet-height)] lg:h-[var(--how-card-height)]" />
      <div className="h-[50px] w-full max-w-125 shrink-0 lg:hidden" />
    </div>
  );
}

function ThemeColorDemo({ color, imageSrc }) {
  return (
    <>
      <span className="absolute inset-0" style={{ backgroundColor: color.hex }} />
      <Image
        src={imageSrc}
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

function WholeCharacterDemo({ item }) {
  return (
    <>
      <Image
        src={item.sourceImagePath || item.originalScenePath}
        alt=""
        fill
        sizes="(max-width: 768px) 78vw, 500px"
        priority
        unoptimized
        className="object-cover"
      />
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
        <ThemeColorDemo color={colors.theme} imageSrc={CLASSIC_CUTOUT_SRC} />
      </VisualShell>
    );
  }

  if (type === "whole") {
    return (
      <div
        data-how-visual
        className="flex w-full flex-col items-center justify-center gap-3 lg:flex-row lg:gap-5"
        style={{
          "--how-card-height": cardHeight,
          "--how-card-mobile-height": "clamp(150px,30dvh,218px)",
          "--how-card-tablet-height": "clamp(220px,34dvh,280px)",
        }}
      >
        <div
          aria-hidden="true"
          className="hidden h-[var(--how-card-height)] w-[50px] shrink-0 opacity-0 lg:block"
        />

        <section
          data-how-card
          className="relative h-[var(--how-card-mobile-height)] w-full max-w-125 overflow-hidden rounded-[22px] bg-surface shadow-[var(--app-card-shadow)] md:h-[var(--how-card-tablet-height)] md:rounded-[26px] lg:h-[var(--how-card-height)]"
        >
          <WholeCharacterDemo item={example} />
        </section>

        <div aria-hidden="true" className="h-[50px] w-full max-w-125 shrink-0 opacity-0 lg:hidden" />
      </div>
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
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const returnPath = ["color", "flag", "cartoon", "brand"].includes(
    searchParams.get("from"),
  )
    ? `/${searchParams.get("from")}`
    : "/color";

  const leavePage = useFooterPageTransition(mainRef);

  const handleClose = async (event) => {
    event.preventDefault();
    await leavePage(returnPath);
  };
  const cardHeight = useResponsiveCardHeight(false, "compact") || "300px";
  const [activeStep, setActiveStep] = useState(0);
  const [themeHue, setThemeHue] = useState(145);
  const [flatHue, setFlatHue] = useState(145);
  const [deltaHue, setDeltaHue] = useState(145);
  const example = useMemo(
    () =>
      CARTOON_OPTIONS.find((item) => item.id === HOW_IT_WORKS_CARTOON_ID) ||
      CARTOON_OPTIONS.find((item) => item.pack === "adventure-time") ||
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
    <FooterPageShell
      mainRef={mainRef}
      scrollable={false}
      className="text-zinc-950 dark:text-zinc-50"
      action={
        <FooterPageAction
          href={returnPath}
          onClick={handleClose}
          aria-label={t("common.closeMenu")}
          className="size-11 p-0 text-foreground/62"
        >
          <X size={24} strokeWidth={1.8} aria-hidden="true" />
        </FooterPageAction>
      }
    >
      <FooterPageHeader
        title={t("howItWorks.eyebrow")}
        meta={`${activeStep + 1} / ${STEPS.length}`}
        description={t("howItWorks.title")}
      />
      <section
        data-route-transition-scope
        className="flex w-full flex-col items-center gap-6 pt-8 sm:pt-10 lg:items-stretch"
      >
        <div
          key={currentStep.key}
          className={`grid min-h-0 w-full items-start gap-5 md:gap-7 lg:items-center lg:gap-10 ${
            "lg:grid-cols-[minmax(27rem,1fr)_minmax(0,0.84fr)]"
          }`}
        >
          <article
            className="order-2 mx-auto flex w-full max-w-125 min-w-0 flex-col justify-start lg:mx-0 lg:max-w-none lg:justify-center"
          >
            <LineRevealText
              as="h2"
              text={title}
              className="text-[clamp(1.55rem,2.35vw,2.45rem)] font-semibold leading-[1.04] tracking-normal"
            />
            <LineRevealText
              text={copy}
              className="mt-3 max-w-[42rem] text-[clamp(0.88rem,1.28vw,1.08rem)] font-medium leading-[1.36] text-zinc-700 dark:text-zinc-300 md:mt-4 md:leading-[1.42]"
            />
          </article>

          <div className="order-1 mx-auto w-full max-w-125 min-w-0 lg:order-1 lg:mx-0 lg:max-w-none">
            {currentStep.visual ? (
              <StepVisual
                type={currentStep.visual}
                example={example}
                colors={colors}
                setters={setters}
                cardHeight={cardHeight}
              />
            ) : (
              <VisualPlaceholder />
            )}
          </div>
        </div>

        <nav
          className="relative mx-auto flex w-full max-w-125 shrink-0 flex-col items-center gap-3 pb-1 md:flex-row md:justify-between md:gap-4 md:pb-0 lg:max-w-none"
          aria-label={t("howItWorks.navigation")}
        >
          {/*
          <div className="pointer-events-auto order-2 flex items-center gap-2 md:absolute md:left-1/2 md:order-1 md:-translate-x-1/2">
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
          */}

          <div className="order-1 ml-auto flex items-center gap-3 self-end md:order-2 md:self-auto">
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
              className="rgb-hover-button inline-flex size-12 items-center justify-center rounded-full bg-black text-white shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition disabled:pointer-events-none disabled:opacity-25 dark:bg-white dark:text-black"
              aria-label={t("howItWorks.next")}
            >
              <span className="relative z-10 inline-flex items-center justify-center">
                <ChevronRight size={19} strokeWidth={2.2} />
              </span>
            </button>
          </div>
        </nav>
      </section>
    </FooterPageShell>
  );
}
