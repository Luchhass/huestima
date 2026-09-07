"use client";

import { useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/useLanguage";
import FooterPageShell, { FooterPageHeader } from "@/components/sections/footer-pages/FooterPageShell";
import CardCloseButton from "@/components/ui/CardCloseButton";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import { GAME_LANDING_CONTENT } from "@/lib/gameLandingContent.mjs";
import { LANDING_FAMILIES, landingHref } from "../../../shared/landingRoutes.mjs";

export default function GameGuidePage({ family }) {
  const { locale } = useLanguage();
  const content = GAME_LANDING_CONTENT[family][locale];
  const tr = locale === "tr";
  const mainRef = useRef(null);
  const leavePage = useFooterPageTransition(mainRef);
  const returnPath = landingHref(family, locale);
  const navigate = async (event, href) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    await leavePage(href);
  };
  return (
    <FooterPageShell mainRef={mainRef} action={
      <CardCloseButton href={returnPath} onClick={(event) => navigate(event, returnPath)}
        label={tr ? "Oyuna dön" : "Back to game"}
        className="absolute right-6 top-6 text-foreground/62 sm:right-10 sm:top-8 lg:right-14" />
    }>
      <article aria-labelledby="game-guide-title">
        <FooterPageHeader titleId="game-guide-title" kicker={null} title={tr ? "Oyun rehberi" : "Game guide"} meta={content.name} metaPlacement="below" description={content.intro} />
        <div className="max-w-3xl space-y-6 pt-8 sm:pt-10">
        <section>
        <h2 className="text-xl font-semibold">{tr ? "Nasıl oynanır?" : "How to play"}</h2>
        <ol className="mt-1 list-decimal space-y-2 pl-5 text-[0.98rem] leading-7 text-foreground/68">{content.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section>
        <h2 className="text-xl font-semibold">{tr ? "Zorluğu kendin seç" : "Choose your difficulty"}</h2>
        <p className="mt-1 text-[0.98rem] leading-7 text-foreground/68">{tr
          ? "Kolayda yalnızca tonu ayarlarsın; doygunluk ve parlaklık hedef renge göre doğru değerlerinde tutulur. Normalde ton ve doygunluk, zorda ise ton, doygunluk ve parlaklık kontrolü açılır. Bazı özel modlar kendi zorluk ayarını kullanır."
          : "Easy gives you one hue slider, with saturation and brightness set to the target values. Normal adds saturation; Hard gives you hue, saturation and brightness. Some special modes use their own difficulty settings."}</p>
        </section>
        <section>
        <h2 className="text-xl font-semibold">{tr ? "Daha iyi tahmin için" : "A tip for your next round"}</h2>
        <p className="mt-1 text-[0.98rem] leading-7 text-foreground/68">{content.tip}</p>
        </section>
        <section>
        <h2 className="text-xl font-semibold">{tr ? "Sık sorulan sorular" : "Frequently asked questions"}</h2>
        <div className="mt-4 space-y-4">{content.faq.map(([question, answer]) => (
          <div key={question}>
            <h3 className="text-base font-semibold">{question}</h3>
            <p className="mt-1 text-[0.98rem] leading-7 text-foreground/68">{answer}</p>
          </div>
        ))}</div>
        </section>
        <section>
        <h2 className="text-xl font-semibold">{tr ? "Diğer renk hafıza oyunları" : "More color memory games"}</h2>
        <nav className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm text-foreground/68" aria-label={tr ? "Oyunlar" : "Games"}>
          {LANDING_FAMILIES.filter((id) => id !== family).map((id) => (
            <Link key={id} className="underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30" href={landingHref(id, locale)} onClick={(event) => navigate(event, landingHref(id, locale))}>{GAME_LANDING_CONTENT[id][locale].name}</Link>
          ))}
        </nav>
        </section>
        </div>
      </article>
    </FooterPageShell>
  );
}
