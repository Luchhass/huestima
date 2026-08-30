"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import gsap from "gsap";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useLanguage";
import {
  playScreenFadeOut,
  SCREEN_REVEAL_REPLAY_EVENT,
  useScreenReveal,
} from "@/hooks/useScreenReveal";
import { useResponsiveCardHeight } from "@/hooks/useResponsiveCardHeight";
import { markDownloadReturn } from "@/hooks/useFooterPageTransition";

const STORES = {
  ios: process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com/us/genre/ios/id36",
  android: process.env.NEXT_PUBLIC_PLAY_STORE_URL || "https://play.google.com/store/games",
};

function AppleMark() {
  return <svg width="25" height="30" viewBox="0 0 24 28" fill="none" aria-hidden="true"><path fill="currentColor" d="M19.7 14.9c0-3 2.5-4.5 2.6-4.6a5.7 5.7 0 0 0-4.5-2.4c-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1a6 6 0 0 0-5 3.1c-2.2 3.8-.6 9.4 1.5 12.5 1 1.5 2.2 3.2 3.8 3.1 1.5-.1 2.1-1 4-1s2.4 1 4 1c1.7 0 2.7-1.5 3.7-3 .9-1.4 1.3-2.8 1.4-2.9-.1 0-2.7-1-2.7-5.8ZM16.6 5.9A5.4 5.4 0 0 0 17.8 2a5.5 5.5 0 0 0-3.6 1.9c-.8.9-1.5 2.3-1.3 3.6 1.4.1 2.8-.7 3.7-1.6Z" /></svg>;
}

function PlayMark() {
  return <svg width="30" height="30" viewBox="0 0 36 36" aria-hidden="true"><path fill="#4285F4" d="M5.1 3.8c-.7.7-1.1 1.8-1.1 3.2v22c0 1.4.4 2.5 1.1 3.2L19.9 18 5.1 3.8Z" /><path fill="#34A853" d="m20.8 18 5.1-5.1L9 3.7c-1.4-.8-2.7-.7-3.9.1L20.8 18Z" /><path fill="#EA4335" d="m20.8 18-15.7 14.2c1.2.8 2.5.9 3.9.1l16.9-9.2L20.8 18Z" /><path fill="#FBBC04" d="m25.9 12.9-5.1 5.1 5.1 4.9 5.6-3.1c1.9-1 1.9-2.7 0-3.8l-5.6-3.1Z" /></svg>;
}

function StoreButton({ platform, href, label, onHover }) {
  const isIos = platform === "ios";

  const storeName = isIos ? "App Store" : "Google Play";

  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} onMouseEnter={() => onHover(platform)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(platform)} onBlur={() => onHover(null)} className="rgb-hover-button card-action-height group flex w-fit min-w-0 items-center gap-3 rounded-full bg-white px-5 text-zinc-950 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
    <span className="relative z-10 grid w-8 shrink-0 place-items-center transition-[filter] group-hover:brightness-0 group-hover:invert">{isIos ? <AppleMark /> : <PlayMark />}</span>
    <span className="relative z-10 min-w-0 flex-1 whitespace-nowrap text-left text-sm font-semibold leading-none">{storeName}</span>
  </a>;
}

function cubicBezier(start, controlA, controlB, end, progress) {
  const inverse = 1 - progress;
  return (
    inverse ** 3 * start +
    3 * inverse ** 2 * progress * controlA +
    3 * inverse * progress ** 2 * controlB +
    progress ** 3 * end
  );
}

function interpolate(start, end, progress) {
  return start + (end - start) * progress;
}

const PREVIEW_DRAG_COMMIT_PROGRESS = 0.2;

export default function DownloadPage({ initialFrom = "", initialPlatform = "" }) {
  const { locale, t } = useTranslation();
  const router = useRouter();
  const scopeRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredStore, setHoveredStore] = useState(null);
  const [activePreview, setActivePreview] = useState(0);
  const previewRefs = useRef([]);
  const previewAnimatingRef = useRef(false);
  const previewTweenRef = useRef(null);
  const previewDragRef = useRef(null);
  const from = ["color", "flag", "cartoon", "brand"].includes(initialFrom) ? initialFrom : "color";
  const cardHeight = useResponsiveCardHeight(isExpanded);

  useScreenReveal(scopeRef, [locale], { defer: true });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsExpanded(true), 40);
    const revealTimeoutId = window.setTimeout(() => {
      window.dispatchEvent(new Event(SCREEN_REVEAL_REPLAY_EVENT));
    }, 780);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(revealTimeoutId);
    };
  }, []);

  useEffect(() => {
    const front = previewRefs.current[0];
    const back = previewRefs.current[1];
    if (front) gsap.set(front, { x: 0, y: 0, rotate: -2, scale: 1, autoAlpha: 1, zIndex: 3 });
    if (back) gsap.set(back, { x: -58, y: 18, rotate: -8, scale: 0.94, autoAlpha: 1, zIndex: 2 });
    return () => previewTweenRef.current?.kill();
  }, []);

  const handleClose = async () => {
    await playScreenFadeOut(scopeRef, { duration: 0.24 });
    setIsExpanded(false);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    markDownloadReturn();
    router.push(`/${from}`);
  };

  const applyPreviewProgress = (current, next, progress) => {
    const currentX = cubicBezier(0, 138, 132, -58, progress);
    const currentY = cubicBezier(0, -58, 54, 18, progress);
    const nextX = cubicBezier(-58, -152, -126, 0, progress);
    const nextY = cubicBezier(18, 34, -64, 0, progress);
    const hasSwappedDepth = progress >= 0.48;

    gsap.set(current, {
      x: currentX,
      y: currentY,
      rotate: interpolate(-2, -8, progress),
      rotateY: interpolate(0, -4, progress),
      scale: interpolate(1, 0.94, progress),
      autoAlpha: 1,
      zIndex: hasSwappedDepth ? 2 : 3,
      transformPerspective: 900,
    });
    gsap.set(next, {
      x: nextX,
      y: nextY,
      rotate: interpolate(-8, -2, progress),
      rotateY: interpolate(4, 0, progress),
      scale: interpolate(0.94, 1, progress),
      autoAlpha: 1,
      zIndex: hasSwappedDepth ? 3 : 2,
      transformPerspective: 900,
    });
  };

  const completePreviewSwap = (nextIndex, startProgress = 0, ease = "power3.inOut") => {
    const current = previewRefs.current[activePreview];
    const next = previewRefs.current[nextIndex];
    if (!current || !next) return;
    previewAnimatingRef.current = true;
    gsap.killTweensOf([current, next]);
    previewTweenRef.current?.kill();

    const motion = { progress: startProgress };
    previewTweenRef.current = gsap.to(motion, {
      progress: 1,
      duration: Math.max(0.2, 0.82 * (1 - startProgress)),
      ease,
      onUpdate: () => applyPreviewProgress(current, next, motion.progress),
      onComplete: () => {
        setActivePreview(nextIndex);
        previewAnimatingRef.current = false;
        previewTweenRef.current = null;
      },
      onInterrupt: () => {
        previewAnimatingRef.current = false;
        previewTweenRef.current = null;
      },
    });
  };

  const restorePreviewSwap = (nextIndex, startProgress) => {
    const current = previewRefs.current[activePreview];
    const next = previewRefs.current[nextIndex];
    if (!current || !next) return;
    previewAnimatingRef.current = true;
    previewTweenRef.current?.kill();

    const motion = { progress: startProgress };
    previewTweenRef.current = gsap.to(motion, {
      progress: 0,
      duration: Math.max(0.16, 0.5 * startProgress),
      ease: "power2.out",
      onUpdate: () => applyPreviewProgress(current, next, motion.progress),
      onComplete: () => {
        applyPreviewProgress(current, next, 0);
        previewAnimatingRef.current = false;
        previewTweenRef.current = null;
      },
      onInterrupt: () => {
        previewAnimatingRef.current = false;
        previewTweenRef.current = null;
      },
    });
  };

  const showPreview = (nextIndex) => {
    if (nextIndex === activePreview || previewAnimatingRef.current) return;
    completePreviewSwap(nextIndex);
  };

  const handlePreviewPointerDown = (event) => {
    if (previewAnimatingRef.current) return;
    const nextIndex = activePreview === 0 ? 1 : 0;
    previewDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      progress: 0,
      moved: false,
      nextIndex,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePreviewPointerMove = (event) => {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.max(0, event.clientX - drag.startX);
    const progress = Math.min(distance / 190, 0.98);
    drag.progress = progress;
    drag.moved ||= distance > 5;
    if (!drag.moved) return;
    const current = previewRefs.current[activePreview];
    const next = previewRefs.current[drag.nextIndex];
    if (current && next) applyPreviewProgress(current, next, progress);
  };

  const handlePreviewPointerEnd = (event) => {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    previewDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) {
      if (drag.progress >= PREVIEW_DRAG_COMMIT_PROGRESS) {
        completePreviewSwap(drag.nextIndex, drag.progress, "power2.out");
      } else {
        restorePreviewSwap(drag.nextIndex, drag.progress);
      }
    }
  };

  useEffect(() => {
    if (initialPlatform && STORES[initialPlatform]) {
      window.location.replace(STORES[initialPlatform]);
    }
  }, [initialPlatform]);

  return <main className="app-gradient flex h-dvh w-full items-center justify-center overflow-hidden p-6 sm:p-8">
    <article data-intro-card-target style={cardHeight ? { height: cardHeight } : undefined} className={`relative w-full overflow-hidden rounded-[24px] bg-black p-6 text-white shadow-[var(--app-card-shadow)] transition-[height,max-width] duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] sm:rounded-[26px] sm:p-8 ${isExpanded ? "max-w-125 lg:max-w-[64rem]" : "max-w-125"}`}>
      <button type="button" onClick={() => void handleClose()} aria-label={t("download.back")} className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full text-white/70 transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-7 sm:top-7"><X size={25} strokeWidth={1.8} /></button>
      <div ref={scopeRef} data-route-transition-scope className="relative grid h-full min-h-0 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
        <section className="flex min-h-0 flex-col">
          <div data-screen-reveal className="max-w-[40rem]">
            <h1 className="max-w-[40rem] whitespace-pre-line text-[clamp(2.8rem,7vw,3.85rem)] font-semibold leading-[0.92] tracking-normal text-white">{t("download.title")}</h1>
            <div className="mt-5 max-w-[29rem] space-y-3 text-[0.95rem] font-medium leading-[1.22] text-white/72 sm:text-base">
              <p>{t("download.intro")}</p>
              <p>{t("download.support")}</p>
            </div>
          </div>
          <div data-screen-reveal className="mt-auto pt-6">
            <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/82">
              {hoveredStore === "ios"
                ? locale === "tr"
                  ? "APP STORE'DAN İNDİR"
                  : "DOWNLOAD ON APP STORE"
                : hoveredStore === "android"
                  ? locale === "tr"
                    ? "GOOGLE PLAY'DEN İNDİR"
                    : "DOWNLOAD ON GOOGLE PLAY"
                  : locale === "tr"
                    ? "MOBİLDE OYNA"
                    : "PLAY ON MOBILE"}
            </p>
            <div className="flex flex-wrap gap-3">
              <StoreButton platform="ios" href={STORES.ios} label={t("download.appStore")} onHover={setHoveredStore} />
              <StoreButton platform="android" href={STORES.android} label={t("download.playStore")} onHover={setHoveredStore} />
            </div>
          </div>
        </section>

        <section data-screen-reveal className="relative hidden min-h-0 items-center justify-center lg:flex">
          <div className="relative aspect-[942/1900] h-[84%] max-h-[27rem] w-auto">
            {["download-preview-game-v3.jpeg", "download-preview-result-v3.jpeg"].map((source, index) => (
              <button key={source} type="button" aria-label={index === activePreview ? "Active preview" : "Show next preview"} onClick={() => showPreview(index)} onPointerDown={handlePreviewPointerDown} onPointerMove={handlePreviewPointerMove} onPointerUp={handlePreviewPointerEnd} onPointerCancel={handlePreviewPointerEnd} onDragStart={(event) => event.preventDefault()} ref={(node) => { previewRefs.current[index] = node; }} className={`absolute inset-0 cursor-grab touch-none select-none overflow-hidden rounded-[22px] shadow-[0_24px_48px_rgba(0,0,0,0.5)] active:cursor-grabbing ${index === activePreview ? "z-[3]" : "z-[2]"}`}>
                <Image src={`/images/${source}`} alt={locale === "tr" ? "Huestima mobil oyun ekranı" : "Huestima mobile game screen"} fill priority={index === 0} sizes="210px" draggable={false} className="pointer-events-none object-contain" />
              </button>
            ))}
          </div>
        </section>

      </div>
    </article>
  </main>;
}
