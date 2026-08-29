"use client";

import confetti from "canvas-confetti";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import { playCreditsArrival, resumeAudioIfAllowed } from "@/lib/sound";
import FooterPageShell, {
  FooterPageAction,
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";
import { X } from "lucide-react";

const CONTRIBUTORS = [
  {
    name: "Beyza Birdal",
    role: "Cartoon Visual Archive",
    href: "https://www.instagram.com/beyzosndl/",
  },
];

const CONFETTI_COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#00c2ff", "#6a4c93"];
const CONFETTI_COLUMNS = 22;

function buildConfettiWave() {
  return Array.from({ length: CONFETTI_COLUMNS }, (_, index) => {
    const progress = index / (CONFETTI_COLUMNS - 1);
    const edgeInset = 0.028;
    const zigZag = (index % 2 === 0 ? -1 : 1) * 0.012;

    return {
      delay: (index % 4) * 24 + (index % 2) * 5,
      drift: (progress - 0.5) * 2.2,
      origin: {
        x: Math.min(0.98, Math.max(0.02, edgeInset + progress * (1 - edgeInset * 2) + zigZag)),
        y: -0.03,
      },
      particleCount: index % 5 === 0 ? 18 : 15,
      scalar: 1.62 + (index % 4) * 0.12,
      spread: 74 + (index % 4) * 7,
      startVelocity: 22 + (index % 3) * 3,
    };
  });
}

function CreditsConfetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const launchConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    });
    const timers = buildConfettiWave().map(
      ({
        delay,
        drift,
        origin,
        particleCount,
        scalar,
        spread,
        startVelocity,
      }) =>
      window.setTimeout(() => {
        launchConfetti({
          particleCount,
          angle: 270,
          spread,
          startVelocity,
          gravity: 1.08,
          drift,
          scalar,
          ticks: 360,
          colors: CONFETTI_COLORS,
          shapes: ["square", "square", "circle"],
          origin,
        });
      }, delay),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      launchConfetti.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
    />
  );
}

export default function CreditsPage() {
  const { locale, t } = useTranslation();
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const family = ["color", "flag", "cartoon", "brand", "team"].includes(searchParams.get("from"))
    ? searchParams.get("from")
    : "color";
  const leavePage = useFooterPageTransition(mainRef);

  useEffect(() => {
    resumeAudioIfAllowed();
    const soundTimer = window.setTimeout(playCreditsArrival, 90);
    return () => window.clearTimeout(soundTimer);
  }, []);

  const handleClose = async (event) => {
    event.preventDefault();
    await leavePage(`/${family}`);
  };

  return (
    <FooterPageShell
      mainRef={mainRef}
      className="text-zinc-950 dark:text-zinc-50"
      action={
        <FooterPageAction href={`/${family}`} onClick={handleClose} aria-label={t("common.closeCredits")} className="size-11 p-0 text-foreground/62">
          <X size={24} strokeWidth={1.8} aria-hidden="true" />
        </FooterPageAction>
      }
    >
      <CreditsConfetti />
      <div className="relative z-10">
        <FooterPageHeader
          title={locale === "tr" ? "Emeği geçenler" : "Credits"}
          description={
            locale === "tr"
              ? "Bu projeye fikri, emeği ve desteğiyle katkı sunan, projeyi geliştirmemde bana yardımcı olan herkese teşekkür ederim."
              : "Thank you to everyone who contributed their ideas, effort, and support, and helped me develop this project."
          }
        />
        <section data-route-transition-scope className="mt-8 w-full">
          <div className="divide-y divide-foreground/10">
            {CONTRIBUTORS.map((contributor) => (
              <div key={contributor.name} className="flex items-baseline justify-between gap-6 py-4 first:pt-0">
                <h2 className="shrink-0 whitespace-nowrap text-base font-semibold text-foreground sm:text-lg">
                  {contributor.href ? (
                    <a
                      href={contributor.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-opacity hover:opacity-55"
                    >
                      {contributor.name}
                    </a>
                  ) : (
                    contributor.name
                  )}
                </h2>
                <p className="text-right text-sm font-medium text-foreground/55">
                  {locale === "tr" ? "Çizgi Film Görsel Arşivi" : contributor.role}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </FooterPageShell>
  );
}
