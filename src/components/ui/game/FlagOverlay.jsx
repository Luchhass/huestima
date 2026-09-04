"use client";

import Image from "next/image";
import { useState } from "react";
import { isFlagColor } from "@/lib/color";
import CartoonCanvas from "./CartoonCanvas";

export default function FlagOverlay({
  color,
  slice = "full",
  className = "",
  minRenderWidth = 0,
}) {
  const [isSurfaceReady, setIsSurfaceReady] = useState(false);
  const imagePath = color?.scenePath || color?.imagePath || color?.assetPath;
  const originalScenePath = color?.originalScenePath;
  const baseScenePath = color?.baseScenePath || color?.scenePath;
  const sceneObjectPosition = color?.sceneObjectPosition || "50% 50%";
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

  if (!isFlagColor(color) || !imagePath) return null;

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
          className={`object-cover ${isSurfaceReady ? "invisible" : "visible"}`}
          style={{ objectPosition: sceneObjectPosition }}
        />
        {originalScenePath && baseScenePath && (
          <CartoonCanvas
            baseSrc={baseScenePath}
            sourceSrc={originalScenePath}
            layers={
              color.layers || [
                {
                  id: "main",
                  sourcePath: originalScenePath,
                  maskPath: color.maskPath,
                  base: color.paintBase,
                },
              ]
            }
            color={color}
            objectPosition={sceneObjectPosition}
            minRenderWidth={minRenderWidth}
            onReady={() => setIsSurfaceReady(true)}
          />
        )}
      </span>
    </span>
  );
}
