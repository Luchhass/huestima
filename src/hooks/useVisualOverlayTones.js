"use client";

import { useEffect, useState } from "react";
import {
  colorToneHex,
  isCartoonColor,
  isFlagColor,
  relativeLuminance,
} from "@/lib/color";
import { loadVisualImage } from "@/lib/cartoonImageCache";

const SAMPLE_REGIONS = {
  topLeft: [0.04, 0.04, 0.28, 0.2],
  topRight: [0.68, 0.04, 0.28, 0.2],
  bottomLeft: [0.04, 0.7, 0.46, 0.22],
  bottomRight: [0.62, 0.7, 0.34, 0.22],
};

function toneForLuminance(luminance) {
  // Pick the foreground with the stronger WCAG contrast ratio.
  return luminance > 0.179 ? "dark" : "light";
}

function toneForHex(hex) {
  return toneForLuminance(relativeLuminance(hex || "#000000"));
}

function fallbackTones(color) {
  return unifiedTones(toneForHex(colorToneHex(color)));
}

function unifiedTones(tone) {
  return Object.fromEntries(
    Object.keys(SAMPLE_REGIONS).map((region) => [region, tone]),
  );
}

function getScenePath(color) {
  return (
    color?.baseScenePath ||
    color?.scenePath ||
    color?.imagePath ||
    color?.assetPath ||
    ""
  );
}

function sampleLuminance(context, region) {
  const [x, y, width, height] = region;
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;
  const startX = Math.max(0, Math.floor(x * canvasWidth));
  const startY = Math.max(0, Math.floor(y * canvasHeight));
  const sampleWidth = Math.max(1, Math.floor(width * canvasWidth));
  const sampleHeight = Math.max(1, Math.floor(height * canvasHeight));
  const { data } = context.getImageData(startX, startY, sampleWidth, sampleHeight);

  let total = 0;
  let samples = 0;

  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3] / 255;
    if (alpha <= 0.08) continue;

    const channels = [data[index], data[index + 1], data[index + 2]].map(
      (channel) => {
        const value = channel / 255;
        return value <= 0.03928
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      },
    );

    total +=
      (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) *
      alpha;
    samples += alpha;
  }

  return samples ? total / samples : 0;
}

export function overlayTextColor(tone) {
  return tone === "dark" ? "#171413" : "#ffffff";
}

export function overlayTextShadow(tone) {
  return tone === "dark"
    ? "0 0.5px 1px rgba(255,255,255,0.18), 0 0 10px rgba(255,255,255,0.08)"
    : "0 0.5px 1px rgba(0,0,0,0.24), 0 0 10px rgba(0,0,0,0.14)";
}

export default function useVisualOverlayTones(color) {
  const imagePath = getScenePath(color);
  const colorKey = `${imagePath}|${color?.hex || ""}|${color?.toneHex || ""}`;
  const fallback = fallbackTones(color);
  const [sampled, setSampled] = useState(null);
  const isVisual = isFlagColor(color) || isCartoonColor(color);

  useEffect(() => {
    if (!isVisual || !imagePath) return undefined;

    let cancelled = false;

    void loadVisualImage(imagePath).then((image) => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;

      const canvas = document.createElement("canvas");
      canvas.width = 220;
      canvas.height = Math.max(
        1,
        Math.round((image.naturalHeight / image.naturalWidth) * canvas.width),
      );
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const luminances = Object.values(SAMPLE_REGIONS).map((region) =>
        sampleLuminance(context, region),
      );
      const darkestOverlayArea = Math.min(...luminances);
      // A card is a single visual surface. Favor the hardest overlay area so
      // every label can share one deliberate foreground tone.
      const tones = unifiedTones(toneForLuminance(darkestOverlayArea));

      if (!cancelled) setSampled({ colorKey, tones });
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [colorKey, imagePath, isVisual]);

  return sampled?.colorKey === colorKey ? sampled.tones : fallback;
}
