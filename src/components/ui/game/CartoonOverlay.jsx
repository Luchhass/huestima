"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { isCartoonColor } from "@/lib/color";
import CartoonCanvas from "./CartoonCanvas";

const VARIANT_CLASSES = {
  reference: {
    baseOpacity: 0.7,
    paintOpacity: 0.96,
    shadeOpacity: 0.54,
  },
  guess: {
    baseOpacity: 0.62,
    paintOpacity: 0.92,
    shadeOpacity: 0.5,
  },
  tile: {
    baseOpacity: 0.64,
    paintOpacity: 0.9,
    shadeOpacity: 0.46,
  },
};

const SIZE_CLASSES = {
  card: "h-[68%] w-[68%] max-h-[380px] max-w-[380px]",
  result: "h-[76%] w-[62%] max-h-[320px] max-w-[320px]",
  tile: "h-[78%] w-[78%] max-h-[120px] max-w-[120px]",
};

export default function CartoonOverlay({
  color,
  variant = "reference",
  size = "card",
  slice = "full",
  className = "",
  useCanvas = true,
  highlightPulse = false,
  pulseKey = null,
  minRenderWidth = 0,
}) {
  const isSceneImage = Boolean(color?.scenePath);
  const pulseRef = useRef(null);
  const imagePath = color?.scenePath || color?.imagePath || color?.assetPath;
  const originalScenePath = color?.originalScenePath;
  const baseScenePath = color?.baseScenePath || color?.scenePath;
  const maskPath = color?.maskPath || imagePath;
  const [readySurfacePath, setReadySurfacePath] = useState(null);
  const [hasImageError, setHasImageError] = useState(false);
  const sceneObjectPosition = color?.sceneObjectPosition || "50%";
  const isSurfaceReady = readySurfacePath === imagePath;
  const variantStyle = VARIANT_CLASSES[variant] || VARIANT_CLASSES.reference;
  const scenePlacementStyle =
    slice === "top"
      ? {
          left: "-1px",
          right: "-1px",
          top: "-1px",
          height: "calc(200% + 2px)",
        }
      : slice === "bottom"
        ? {
            left: "-1px",
            right: "-1px",
            bottom: "-1px",
            height: "calc(200% + 2px)",
          }
        : { inset: "-1px" };

  const maskStyle = {
    WebkitMaskImage: `url("${maskPath}")`,
    maskImage: `url("${maskPath}")`,
    WebkitMaskPosition: sceneObjectPosition,
    maskPosition: sceneObjectPosition,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: isSceneImage ? "cover" : "contain",
    maskSize: isSceneImage ? "cover" : "contain",
  };

  useLayoutEffect(() => {
    const pulse = pulseRef.current;
    if (!pulse || !highlightPulse || !isSurfaceReady) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(pulse, { autoAlpha: 0 });
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.killTweensOf(pulse);
      gsap.fromTo(
        pulse,
        { autoAlpha: 0, scale: 0.99 },
        {
          autoAlpha: 0.58,
          scale: 1.012,
          duration: 1 / 6,
          repeat: 5,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "center center",
          force3D: true,
          onComplete: () =>
            gsap.set(pulse, {
              clearProps: "transform,opacity,visibility",
            }),
        },
      );
    }, pulse.parentElement);

    return () => ctx.revert();
  }, [highlightPulse, imagePath, isSurfaceReady, pulseKey]);

  useEffect(() => {
    // Reset visual fallback state whenever the source asset changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasImageError(false);
    setReadySurfacePath(null);
  }, [imagePath]);

  if (!isCartoonColor(color) || !imagePath) return null;

  if (isSceneImage) {
    return (
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit] ${className}`}
        style={{
          borderRadius: "inherit",
          backgroundColor: color.hex || "transparent",
        }}
      >
        <span className="absolute" style={scenePlacementStyle}>
          <Image
            src={baseScenePath || imagePath}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 500px"
            unoptimized
            onError={() => setHasImageError(true)}
            className={`object-cover ${isSurfaceReady ? "invisible" : "visible"}`}
            style={{ objectPosition: sceneObjectPosition }}
          />
          {!hasImageError && useCanvas && originalScenePath && baseScenePath && (
            <CartoonCanvas
              baseSrc={baseScenePath}
              sourceSrc={originalScenePath}
              layers={
                color.layers || [
                  {
                    id: "main",
                    maskPath,
                    base: color.paintBase,
                  },
                ]
              }
              color={color}
              objectPosition={sceneObjectPosition}
              minRenderWidth={minRenderWidth}
              onReady={() => setReadySurfacePath(imagePath)}
            />
          )}
          {highlightPulse && (
            <span
              ref={pulseRef}
              data-cartoon-highlight-pulse
              className="absolute inset-0 opacity-0"
              style={{
                ...maskStyle,
                backgroundColor: "rgba(255,255,255,0.24)",
                filter:
                  "drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 24px rgba(255,245,190,0.88)) drop-shadow(0 0 42px rgba(255,214,112,0.58))",
                mixBlendMode: "screen",
              }}
            />
          )}
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0)_42%,rgba(0,0,0,0.12))]" />
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[2] grid place-items-center overflow-hidden rounded-[inherit] bg-black ${className}`}
      style={{ borderRadius: "inherit" }}
    >
      <span
        className={`relative block overflow-visible drop-shadow-[0_18px_28px_rgba(0,0,0,0.24)] ${
          SIZE_CLASSES[size] || SIZE_CLASSES.card
        }`}
      >
        <Image
          src={imagePath}
          alt=""
          fill
          sizes="(max-width: 640px) 68vw, 380px"
          unoptimized
          onError={() => setHasImageError(true)}
          className="object-contain grayscale contrast-110"
          style={{ opacity: hasImageError ? 0 : variantStyle.baseOpacity }}
        />
        <span
          className="absolute inset-0"
          style={{
            ...maskStyle,
            backgroundColor: color.hex,
            mixBlendMode: "color",
            opacity: variantStyle.paintOpacity,
          }}
        />
        <Image
          src={imagePath}
          alt=""
          fill
          sizes="(max-width: 640px) 68vw, 380px"
          unoptimized
          onError={() => setHasImageError(true)}
          className="object-contain grayscale contrast-125"
          style={{
            mixBlendMode: "multiply",
            opacity: hasImageError ? 0 : variantStyle.shadeOpacity,
          }}
        />
      </span>
    </span>
  );
}
