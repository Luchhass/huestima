"use client";

import { isBrandColor } from "@/lib/color";
import CartoonCanvas from "./CartoonCanvas";

const SIZE_CLASSES = {
  card: "",
  result: "scale-[0.58]",
  tile: "scale-[0.72]",
};

export default function BrandOverlay({ color, className = "", size = "card" }) {
  if (!isBrandColor(color) || !color.originalScenePath || !color.baseScenePath) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit] ${className}`}
    >
      {size !== "tile" && <span className="brand-team-spotlight" aria-hidden="true" />}
      <CartoonCanvas
        baseSrc={color.baseScenePath}
        sourceSrc={color.originalScenePath}
        layers={color.layers}
        color={color}
        fit="contain"
        minRenderWidth={768}
        className={`relative z-[1] ${SIZE_CLASSES[size] || SIZE_CLASSES.card}`}
      />
    </span>
  );
}
