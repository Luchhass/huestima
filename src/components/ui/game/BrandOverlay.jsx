"use client";

import Image from "next/image";
import { useState } from "react";
import { isBrandColor } from "@/lib/color";
import CartoonCanvas from "./CartoonCanvas";

const SIZE_CLASSES = {
  card: "",
  result: "scale-[0.58]",
  tile: "scale-[0.72]",
};

export default function BrandOverlay({
  color,
  className = "",
  size = "card",
  contentOffset = 0,
  sceneRef = null,
}) {
  const [readyScenePath, setReadyScenePath] = useState(null);
  if (!isBrandColor(color) || !color.originalScenePath || !color.baseScenePath) return null;
  const isSurfaceReady = readyScenePath === color.baseScenePath;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit] ${className}`}
    >
      <span
        ref={sceneRef}
        className="absolute inset-y-0 right-0"
        style={{ left: `${Math.max(0, Number(contentOffset) || 0)}px` }}
      >
        {size !== "tile" && <span className="brand-team-spotlight" aria-hidden="true" />}
        <Image
          src={color.baseScenePath}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 768px"
          unoptimized
          className={`relative z-[1] object-contain ${
            isSurfaceReady ? "invisible" : "visible"
          } ${SIZE_CLASSES[size] || SIZE_CLASSES.card}`}
        />
        <CartoonCanvas
          baseSrc={color.baseScenePath}
          sourceSrc={color.originalScenePath}
          layers={color.layers}
          color={color}
          fit="contain"
          minRenderWidth={768}
          onReady={() => setReadyScenePath(color.baseScenePath)}
          className={`relative z-[2] ${SIZE_CLASSES[size] || SIZE_CLASSES.card}`}
        />
      </span>
    </span>
  );
}
