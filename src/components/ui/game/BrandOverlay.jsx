"use client";

import Image from "next/image";
import { useState } from "react";
import { isBrandColor } from "@/lib/color";
import CartoonCanvas from "./CartoonCanvas";

export default function BrandOverlay({ color, className = "" }) {
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  if (!isBrandColor(color) || !color.assetPath) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[1] grid place-items-center ${className}`}
    >
      <span className="relative h-[76%] w-[84%]">
        <Image
          src={color.assetPath}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 76vw, 440px"
          className={`object-contain transition-opacity duration-150 ${
            isCanvasReady ? "opacity-0" : "opacity-100"
          }`}
        />
        <CartoonCanvas
          baseSrc={color.baseScenePath}
          sourceSrc={color.assetPath}
          layers={color.layers}
          color={color}
          fit="contain"
          minRenderWidth={768}
          onReady={() => setIsCanvasReady(true)}
        />
      </span>
    </span>
  );
}
