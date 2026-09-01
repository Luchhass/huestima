"use client";

import { useEffect, useMemo, useState } from "react";
import { CARTOON_OPTIONS } from "@/lib/cartoons";
import {
  getVisualAssetPaths,
  preloadVisualAssets,
} from "@/lib/cartoonImageCache";
import { renderCartoonFrame } from "@/lib/cartoonRenderService";

function preloadKey(visuals, mode) {
  return (visuals || [])
    .flatMap((visual) => [
      ...getVisualAssetPaths(visual, mode),
      visual?.h,
      visual?.s,
      visual?.v,
    ])
    .join("|");
}

async function prewarmVisualFrames(visuals, signal) {
  for (const visual of visuals || []) {
    if (signal.aborted) return;
    if (!visual?.baseScenePath || !visual?.layers?.length) continue;

    try {
      const bitmap = await renderCartoonFrame({
        baseSrc: visual.baseScenePath,
        sourceSrc: visual.originalScenePath,
        layers: visual.layers,
        color: visual,
        width: 768,
      });
      bitmap.close();
    } catch {
      // The visible overlay retains its decoded base-scene fallback.
    }
  }
}

export function useVisualAssetPreload(
  enabled,
  cartoons = CARTOON_OPTIONS,
  mode = "full",
) {
  const key = useMemo(() => preloadKey(cartoons, mode), [cartoons, mode]);
  const [readyKey, setReadyKey] = useState("");
  const [failedPaths, setFailedPaths] = useState([]);

  useEffect(() => {
    if (!enabled || !cartoons?.length) return undefined;

    const controller = new AbortController();

    void (async () => {
      const result = await preloadVisualAssets(cartoons, {
        concurrency: mode === "scene" ? 4 : 6,
        mode,
        signal: controller.signal,
      });
      if (mode === "full") {
        await prewarmVisualFrames(cartoons, controller.signal);
      }
      if (controller.signal.aborted) return;
      setFailedPaths(result.failedPaths);
      setReadyKey(key);
    })();

    return () => controller.abort();
  }, [enabled, cartoons, key, mode]);

  return {
    failedPaths: readyKey === key ? failedPaths : [],
    isReady: !enabled || (Boolean(cartoons?.length) && readyKey === key),
  };
}

export const useCartoonAssetPreload = useVisualAssetPreload;
