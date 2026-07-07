"use client";

import Image from "next/image";
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
}) {
  const isSceneImage = Boolean(color?.scenePath);
  const imagePath = color?.scenePath || color?.imagePath || color?.assetPath;
  const originalScenePath = color?.originalScenePath;
  const baseScenePath = color?.baseScenePath || color?.scenePath;
  const maskPath = color?.maskPath || imagePath;
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

  if (!isCartoonColor(color) || !imagePath) return null;

  const maskStyle = {
    WebkitMaskImage: `url("${maskPath}")`,
    maskImage: `url("${maskPath}")`,
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: isSceneImage ? "cover" : "contain",
    maskSize: isSceneImage ? "cover" : "contain",
  };

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
            priority={variant !== "tile"}
            className="object-cover"
          />
          <span
            className="absolute inset-0"
            style={{
              ...maskStyle,
              backgroundColor: color.hex,
              mixBlendMode: "color",
              opacity: 1,
            }}
          />
          {originalScenePath && baseScenePath ? (
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
            />
          ) : (
            <span
              className="absolute inset-0"
              style={{
                ...maskStyle,
                backgroundColor: color.hex,
                mixBlendMode: "color",
                opacity: 1,
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
          className="object-contain grayscale contrast-110"
          style={{ opacity: variantStyle.baseOpacity }}
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
          className="object-contain grayscale contrast-125"
          style={{
            mixBlendMode: "multiply",
            opacity: variantStyle.shadeOpacity,
          }}
        />
      </span>
    </span>
  );
}
