"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import FooterPageShell, { FooterPageAction, FooterPageHeader } from "@/components/sections/footer-pages/FooterPageShell";

const STORES = {
  ios: process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com/us/genre/ios/id36",
  android: process.env.NEXT_PUBLIC_PLAY_STORE_URL || "https://play.google.com/store/games",
};

function StoreBadge({ platform, label, href, unavailable }) {
  return <a href={href} target="_blank" rel="noreferrer" className="group flex min-h-[74px] items-center gap-4 rounded-xl border border-foreground/12 bg-foreground/[0.035] px-5 transition-colors hover:border-foreground/30 hover:bg-foreground/[0.07] focus-visible:ring-2 focus-visible:ring-foreground/30 sm:px-6">
    {platform === "ios" ? <svg width="30" height="36" viewBox="0 0 24 28" fill="none" aria-hidden="true"><path fill="currentColor" d="M19.7 14.9c0-3 2.5-4.5 2.6-4.6a5.7 5.7 0 0 0-4.5-2.4c-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1a6 6 0 0 0-5 3.1c-2.2 3.8-.6 9.4 1.5 12.5 1 1.5 2.2 3.2 3.8 3.1 1.5-.1 2.1-1 4-1s2.4 1 4 1c1.7 0 2.7-1.5 3.7-3 .9-1.4 1.3-2.8 1.4-2.9-.1 0-2.7-1-2.7-5.8ZM16.6 5.9A5.4 5.4 0 0 0 17.8 2a5.5 5.5 0 0 0-3.6 1.9c-.8.9-1.5 2.3-1.3 3.6 1.4.1 2.8-.7 3.7-1.6Z" /></svg> : <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><path fill="#34A853" d="m18 17.1 7.8-8.8-16.2 9.3L18 17.1Z"/><path fill="#FBBC04" d="m9.6 17.6-3.1 1.8a2 2 0 0 0 0 3.5l8.2 4.7 3.3-7.3-8.4-2.7Z"/><path fill="#EA4335" d="m18 20.3 3.7 3.8 8.8-5.1c.9-.5.9-1.8 0-2.3l-4.7-2.7-7.8 6.3Z"/><path fill="#4285F4" d="M9.6 17.6 27 7.7c.9-.5 1.9.3 1.8 1.3l-10.8 11.3-8.4-2.7Z"/></svg>}
    <span className="flex flex-1 flex-col text-left"><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-foreground/45">{platform === "ios" ? "Download on the" : "GET IT ON"}</span><span className="text-lg font-semibold tracking-[-0.03em]">{platform === "ios" ? "App Store" : "Google Play"}</span></span>
    <span className="text-base text-foreground/45 transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span>
  </a>;
}

export default function DownloadPage() {
  const { locale, t } = useTranslation();
  const mainRef = useRef(null);
  const params = useSearchParams();
  const from = ["color", "flag", "cartoon", "brand"].includes(params.get("from")) ? params.get("from") : "color";
  const leavePage = useFooterPageTransition(mainRef);
  const content = { title: t("download.title"), intro: t("download.intro") };

  useEffect(() => {
    const platform = params.get("platform");
    if (platform && STORES[platform]) window.location.replace(STORES[platform]);
  }, [params]);

  return <FooterPageShell mainRef={mainRef} scrollable={false} action={<FooterPageAction href={`/${from}`} onClick={(event) => { event.preventDefault(); void leavePage(`/${from}`); }} aria-label={t("download.back")} className="size-11 p-0 text-foreground/62"><X size={24} strokeWidth={1.8} /></FooterPageAction>}>
    <article className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-3xl flex-col justify-center pb-8">
      <FooterPageHeader kicker={t("download.kicker")} title={content.title} description={content.intro} />
      <div className="grid max-w-2xl gap-3 pt-8 sm:grid-cols-2 sm:pt-10">
        <StoreBadge platform="ios" href={STORES.ios} label={t("download.appStore")} unavailable={t("download.comingSoon")} />
        <StoreBadge platform="android" href={STORES.android} label={t("download.playStore")} unavailable={t("download.comingSoon")} />
      </div>
      <p className="pt-5 text-xs text-foreground/38">{locale === "tr" ? "Mobil deneyimi şimdi keşfet." : "Explore the mobile experience now."}</p>
    </article>
  </FooterPageShell>;
}
