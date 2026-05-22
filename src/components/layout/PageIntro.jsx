"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { APP_NAME } from "@/lib/constants";
import BrandLogoMark from "./BrandLogoMark";

let hasPlayedEntryIntro = false;

function isInviteRoomPath(pathname) {
  const segments = pathname.split("/").filter(Boolean);

  return segments.length === 1;
}

function shouldPlayEntryIntro(pathname) {
  return pathname === "/" || isInviteRoomPath(pathname);
}

function readViewportBox() {
  const visualViewport = window.visualViewport;
  const width =
    visualViewport?.width ||
    document.documentElement.clientWidth ||
    window.innerWidth;
  const height =
    visualViewport?.height ||
    document.documentElement.clientHeight ||
    window.innerHeight;
  const left = visualViewport?.offsetLeft || 0;
  const top = visualViewport?.offsetTop || 0;

  return {
    width,
    height,
    left,
    top,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export default function PageIntro() {
  const pathname = usePathname();
  const overlayRef = useRef(null);
  const blackLayerRef = useRef(null);
  const brandStageRef = useRef(null);
  const logoRef = useRef(null);
  const brandTextMaskRef = useRef(null);
  const brandTextRef = useRef(null);
  const timelineRef = useRef(null);
  const [dismissed, setDismissed] = useState(false);

  const shouldRender =
    shouldPlayEntryIntro(pathname) && !hasPlayedEntryIntro && !dismissed;

  useLayoutEffect(() => {
    if (!shouldRender) return undefined;

    const overlay = overlayRef.current;
    const blackLayer = blackLayerRef.current;
    const brandStage = brandStageRef.current;
    const logo = logoRef.current;
    const brandTextMask = brandTextMaskRef.current;
    const brandText = brandTextRef.current;

    if (
      !overlay ||
      !blackLayer ||
      !brandStage ||
      !logo ||
      !brandTextMask ||
      !brandText
    ) {
      hasPlayedEntryIntro = true;
      window.__pageIntroDoneForPath = pathname;
      setDismissed(true);
      return undefined;
    }

    let cancelled = false;
    let completed = false;
    let targetCard = null;
    let targetSnapshot = null;
    let targetObserver = null;
    let targetTimeoutId = null;

    const dispatchIntroEvent = (name) => {
      window.dispatchEvent(
        new CustomEvent(`page-intro:${name}`, {
          detail: { pathname },
        }),
      );
    };

    const clearTargetCard = () => {
      if (targetCard) {
        gsap.set(targetCard, { clearProps: "opacity,visibility" });
      }
    };

    const finishIntro = () => {
      if (completed) return;

      completed = true;
      hasPlayedEntryIntro = true;
      timelineRef.current = null;
      clearTargetCard();
      window.__pageIntroDoneForPath = pathname;
      gsap.set(overlay, { autoAlpha: 0, pointerEvents: "none" });
      dispatchIntroEvent("complete");
      setDismissed(true);
    };

    const readTargetSnapshot = () => {
      if (!targetCard) return null;

      const rect = targetCard.getBoundingClientRect();
      const styles = window.getComputedStyle(targetCard);

      return {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
      };
    };

    dispatchIntroEvent("start");

    gsap.set(overlay, {
      autoAlpha: 1,
      pointerEvents: "auto",
    });

    gsap.set(blackLayer, {
      position: "fixed",
      top: 0,
      left: 0,
      width: document.documentElement.clientWidth || window.innerWidth,
      height: document.documentElement.clientHeight || window.innerHeight,
      borderRadius: 0,
      backgroundColor: "#000",
      boxShadow: "none",
      transformOrigin: "top left",
    });

    gsap.set(brandStage, {
      autoAlpha: 0,
      xPercent: 0,
      yPercent: 0,
      x: 0,
      y: 0,
      scale: 1,
      transformOrigin: "top left",
    });

    gsap.set(logo, {
      autoAlpha: 0,
      scale: 0.82,
      yPercent: 0,
      transformOrigin: "center center",
    });

    gsap.set(brandTextMask, {
      clipPath: "inset(0 0 0 100%)",
      width: "auto",
      yPercent: 0,
    });

    gsap.set(brandText, { autoAlpha: 1 });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const buildTimeline = () => {
      if (cancelled || !targetCard) return;

      const viewport = readViewportBox();
      const textRect = brandText.getBoundingClientRect();
      const textWidth = Math.ceil(brandText.offsetWidth || textRect.width);
      const textHeight = Math.ceil(brandText.offsetHeight || textRect.height);
      const logoWidth = Math.ceil(logo.offsetWidth);
      const logoHeight = Math.ceil(logo.offsetHeight);
      const finalTextGap = Math.ceil(Math.max(30, logoWidth * 0.18));
      const maskOverlap = Math.ceil(logoWidth * 0.34);
      const textSafeArea = Math.ceil(Math.max(72, textWidth * 0.1));
      const textVerticalSafeArea = Math.ceil(Math.max(18, textHeight * 0.16));
      const maskWidth = maskOverlap + finalTextGap + textWidth + textSafeArea;
      const maskHeight = textHeight + textVerticalSafeArea;
      const finalStageWidth = logoWidth + finalTextGap + textWidth;
      const measuredStageWidth = finalStageWidth + textSafeArea;
      const stageHeight = Math.ceil(Math.max(logoHeight, textHeight));
      const availableStageWidth = Math.max(240, viewport.width - 40);
      const stageScale = Math.min(1, availableStageWidth / measuredStageWidth);
      const revealLogoX = finalTextGap + textWidth + textSafeArea;
      const logoTop = (stageHeight - logoHeight) / 2;
      const textMaskTop = (stageHeight - maskHeight) / 2;
      const textTop = textMaskTop + textVerticalSafeArea / 2;
      const visibleTop = Math.min(logoTop, textTop);
      const visibleBottom = Math.max(
        logoTop + logoHeight,
        textTop + textHeight,
      );
      const visibleCenterY = (visibleTop + visibleBottom) / 2;
      const startStageLeft =
        viewport.centerX - (revealLogoX + logoWidth / 2) * stageScale;
      const finalStageLeft =
        viewport.centerX - (finalStageWidth * stageScale) / 2;
      const stageTop = viewport.centerY - visibleCenterY * stageScale;
      const revealDuration = 1.12;

      gsap.set(brandStage, {
        left: startStageLeft,
        top: stageTop,
        width: finalStageWidth,
        height: stageHeight,
        autoAlpha: 1,
        scale: stageScale,
      });

      gsap.set(logo, {
        left: 0,
        top: logoTop,
        x: revealLogoX,
      });

      gsap.set(brandTextMask, {
        left: logoWidth - maskOverlap,
        top: textMaskTop,
        width: maskWidth,
        height: maskHeight,
      });

      gsap.set(brandText, {
        x: maskOverlap + finalTextGap,
        y: textVerticalSafeArea / 2,
      });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: finishIntro,
      });

      timelineRef.current = timeline;

      timeline
        .to({}, { duration: 0.2 })
        .to(logo, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.64,
          ease: "power3.out",
        })
        .to({}, { duration: 0.46 })
        .to(
          logo,
          {
            x: 0,
            duration: revealDuration,
            ease: "expo.inOut",
          },
          "+=0.05",
        )
        .to(
          brandStage,
          {
            left: finalStageLeft,
            duration: revealDuration,
            ease: "expo.inOut",
          },
          "<",
        )
        .to(
          brandTextMask,
          {
            clipPath: "inset(0 0 0 0%)",
            duration: revealDuration,
            ease: "expo.inOut",
          },
          "<",
        )
        .to({}, { duration: 0.72 })
        .to(brandStage, {
          autoAlpha: 0,
          scale: stageScale * 0.985,
          duration: 0.46,
          ease: "power2.inOut",
        })
        .call(() => {
          targetSnapshot = readTargetSnapshot();
        })
        .to(blackLayer, {
          top: () => targetSnapshot?.top || 0,
          left: () => targetSnapshot?.left || 0,
          width: () => targetSnapshot?.width || 0,
          height: () => targetSnapshot?.height || 0,
          borderRadius: () => targetSnapshot?.borderRadius || "24px",
          boxShadow: () => targetSnapshot?.boxShadow || "none",
          duration: 1.16,
          ease: "expo.inOut",
        });
    };

    const startIntroForTarget = (card) => {
      if (cancelled || targetCard) return;

      targetCard = card;

      if (targetObserver) {
        targetObserver.disconnect();
        targetObserver = null;
      }

      if (targetTimeoutId) {
        window.clearTimeout(targetTimeoutId);
        targetTimeoutId = null;
      }

      gsap.set(targetCard, { autoAlpha: 0 });

      if (prefersReducedMotion.matches) {
        finishIntro();
        return;
      }

      if (document.fonts?.ready) {
        document.fonts.ready.then(buildTimeline).catch(buildTimeline);
      } else {
        buildTimeline();
      }
    };

    const findIntroTarget = () => {
      return document.querySelector("[data-intro-card-target]");
    };

    const immediateTarget = findIntroTarget();

    if (immediateTarget) {
      startIntroForTarget(immediateTarget);
    } else {
      targetObserver = new MutationObserver(() => {
        const foundTarget = findIntroTarget();

        if (foundTarget) {
          startIntroForTarget(foundTarget);
        }
      });

      targetObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      targetTimeoutId = window.setTimeout(() => {
        if (!targetCard) {
          finishIntro();
        }
      }, 2400);
    }

    return () => {
      cancelled = true;

      if (targetObserver) {
        targetObserver.disconnect();
        targetObserver = null;
      }

      if (targetTimeoutId) {
        window.clearTimeout(targetTimeoutId);
        targetTimeoutId = null;
      }

      timelineRef.current?.kill();
      timelineRef.current = null;
      clearTargetCard();
      gsap.set(overlay, { autoAlpha: 0, pointerEvents: "none" });
    };
  }, [pathname, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      ref={overlayRef}
      data-page-intro-overlay
      aria-hidden="true"
      className="pointer-events-auto fixed inset-0 z-9999 overflow-hidden"
    >
      <div
        ref={blackLayerRef}
        className="fixed left-0 top-0 h-dvh w-screen bg-black will-change-[top,left,width,height,border-radius,box-shadow]"
      />

      <div
        ref={brandStageRef}
        className="fixed z-10 isolate opacity-0 will-change-[left,top,transform]"
      >
        <span ref={logoRef} className="absolute z-20 grid place-items-center">
          <BrandLogoMark
            className="size-28 sm:size-32 md:size-40"
            centerClassName="size-[44%]"
            hollow
          />
        </span>

        <span
          ref={brandTextMaskRef}
          className="absolute z-10 block overflow-hidden whitespace-nowrap"
        >
          <span
            ref={brandTextRef}
            className="inline-block text-7xl font-semibold uppercase leading-none tracking-normal text-white sm:text-8xl md:text-[7.5rem]"
          >
            {APP_NAME}
          </span>
        </span>
      </div>
    </div>
  );
}
