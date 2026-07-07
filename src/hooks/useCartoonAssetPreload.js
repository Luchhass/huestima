"use client";

import { useEffect } from "react";
import { CARTOON_OPTIONS } from "@/lib/cartoons";
import { preloadCartoonAssets } from "@/lib/cartoonImageCache";

export function useCartoonAssetPreload(
  enabled,
  cartoons = CARTOON_OPTIONS,
  mode = "full",
) {
  useEffect(() => {
    if (!enabled || !cartoons?.length) return undefined;

    const controller = new AbortController();

    void preloadCartoonAssets(cartoons, {
      concurrency: mode === "scene" ? 4 : 6,
      mode,
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [enabled, cartoons, mode]);
}
