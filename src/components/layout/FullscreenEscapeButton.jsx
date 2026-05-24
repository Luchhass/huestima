"use client";

import { useEffect, useRef } from "react";
import { Minimize2 } from "lucide-react";
import gsap from "gsap";
import {
  FULLSCREEN_CHANGE_EVENT,
  useFullscreenMode,
} from "@/hooks/useFullscreenMode";
import { useTranslation } from "@/hooks/useLanguage";
import {
  SCREEN_FADE_OUT_EVENT,
  SCREEN_REVEAL_PREPARE_EVENT,
  SCREEN_REVEAL_START_EVENT,
} from "@/hooks/useScreenReveal";

function shouldShowFullscreenEscape() {
  if (typeof document === "undefined") return false;

  const root = document.documentElement;
  const fullscreenEnabled = root.dataset.fullscreenMode === "on";
  const chromeHidden = root.dataset.appChromeHidden === "true";
  const gameImmersive = root.dataset.gameImmersive === "true";

  return fullscreenEnabled && (chromeHidden || gameImmersive);
}

export default function FullscreenEscapeButton() {
  const buttonRef = useRef(null);
  const revealRef = useRef(null);
  const { t } = useTranslation();
  const { exitFullscreen } = useFullscreenMode();

  useEffect(() => {
    const button = buttonRef.current;
    const reveal = revealRef.current;
    if (!button || !reveal) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const hide = (duration = 0.18) => {
      gsap.killTweensOf([button, reveal]);

      gsap.to(button, {
        autoAlpha: 0,
        duration: reducedMotion.matches ? 0 : duration,
        ease: "power2.out",
        overwrite: true,
      });

      gsap.to(reveal, {
        autoAlpha: 0,
        x: 18,
        scale: 0.96,
        duration: reducedMotion.matches ? 0 : duration,
        ease: "power2.out",
        overwrite: true,
      });
    };

    const show = (delay = 0.16) => {
      if (!shouldShowFullscreenEscape()) {
        hide(0.12);
        return;
      }

      gsap.killTweensOf([button, reveal]);
      gsap.set(button, { visibility: "visible", pointerEvents: "auto" });

      if (reducedMotion.matches) {
        gsap.set(button, { autoAlpha: 1 });
        gsap.set(reveal, { autoAlpha: 1, x: 0, scale: 1 });
        return;
      }

      gsap.fromTo(
        button,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.28,
          delay,
          ease: "power2.out",
          overwrite: true,
        },
      );

      gsap.fromTo(
        reveal,
        { autoAlpha: 0, x: 22, scale: 0.96 },
        {
          autoAlpha: 1,
          x: 0,
          scale: 1,
          duration: 0.56,
          delay,
          ease: "power4.out",
          overwrite: true,
        },
      );
    };

    const syncVisibility = () => {
      if (shouldShowFullscreenEscape()) {
        show(0.22);
      } else {
        hide(0.12);
      }
    };

    const handleScreenPrepare = () => hide(0.16);
    const handleScreenFadeOut = () => hide(0.2);
    const handleScreenRevealStart = () => show(0.28);

    const observer = new MutationObserver(syncVisibility);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-fullscreen-mode",
        "data-app-chrome-hidden",
        "data-game-immersive",
      ],
    });

    window.addEventListener(FULLSCREEN_CHANGE_EVENT, syncVisibility);
    window.addEventListener(SCREEN_REVEAL_PREPARE_EVENT, handleScreenPrepare);
    window.addEventListener(SCREEN_FADE_OUT_EVENT, handleScreenFadeOut);
    window.addEventListener(SCREEN_REVEAL_START_EVENT, handleScreenRevealStart);

    syncVisibility();

    return () => {
      observer.disconnect();
      window.removeEventListener(FULLSCREEN_CHANGE_EVENT, syncVisibility);
      window.removeEventListener(
        SCREEN_REVEAL_PREPARE_EVENT,
        handleScreenPrepare,
      );
      window.removeEventListener(SCREEN_FADE_OUT_EVENT, handleScreenFadeOut);
      window.removeEventListener(
        SCREEN_REVEAL_START_EVENT,
        handleScreenRevealStart,
      );
      gsap.killTweensOf([button, reveal]);
    };
  }, []);

  const handleExitFullscreen = () => {
    window.dispatchEvent(new Event(SCREEN_FADE_OUT_EVENT));
    exitFullscreen();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={t("toggles.fullscreenExit")}
      title={t("toggles.fullscreenExit")}
      onClick={handleExitFullscreen}
      className="fullscreen-escape-button focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span ref={revealRef} className="fullscreen-escape-button__reveal">
        <span className="fullscreen-escape-button__icon">
          <Minimize2 className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
