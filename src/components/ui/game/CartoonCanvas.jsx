"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { renderCartoonFrame } from "@/lib/cartoonRenderService";

function layerKey(layers) {
  return layers
    .map(
      (layer) =>
        `${layer.id || ""}:${layer.sourcePath || ""}:${layer.maskPath || ""}:` +
        `${layer.base?.h || 0}:${layer.base?.s || 0}:${layer.base?.v || 0}`,
    )
    .join("|");
}

export default function CartoonCanvas({
  baseSrc,
  sourceSrc,
  layers,
  color,
  className = "",
  fit = "cover",
  onReady,
  minRenderWidth = 0,
}) {
  const canvasRef = useRef(null);
  const requestRef = useRef(0);
  const frameRef = useRef(null);
  const widthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const inputRef = useRef(null);
  const visibleRef = useRef(false);
  const cleanLayers = useMemo(
    () =>
      Array.isArray(layers)
        ? layers.filter((layer) => layer?.sourcePath || layer?.maskPath)
        : [],
    [layers],
  );
  const cleanLayerKey = useMemo(() => layerKey(cleanLayers), [cleanLayers]);
  const targetKey = `${color?.h ?? 0}:${color?.s ?? 100}:${color?.v ?? 100}:` +
    `${color?.paintBase?.h ?? ""}:${color?.paintBase?.s ?? ""}:${color?.paintBase?.v ?? ""}`;

  const draw = () => {
    const canvas = canvasRef.current;
    const input = inputRef.current;
    if (!canvas || !input.baseSrc || !input.layers.length) return;
    const rect = canvas.getBoundingClientRect();
    const layoutWidth = Math.max(1, rect.width);
    const width = Math.max(layoutWidth, Number(minRenderWidth) || 0);
    layoutWidthRef.current = layoutWidth;
    widthRef.current = width;
    const requestId = ++requestRef.current;

    renderCartoonFrame({ ...input, width })
      .then((bitmap) => {
        if (requestId !== requestRef.current || !canvas.isConnected) {
          bitmap.close();
          return;
        }

        const context = canvas.getContext("2d", { alpha: true });
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        onReady?.();
      })
      .catch(() => {
        // Rendering failures are reflected by the surrounding fallback UI.
      });
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    inputRef.current = { baseSrc, sourceSrc, layers: cleanLayers, color };
    const rect = canvas.getBoundingClientRect();
    visibleRef.current =
      rect.bottom >= -1200 && rect.top <= window.innerHeight + 1200;
    if (!visibleRef.current) return undefined;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  // draw intentionally reads the latest render input from inputRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSrc, sourceSrc, cleanLayerKey, minRenderWidth, targetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let resizeTimer = null;
    let intersectionObserver = null;
    const observer = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      if (Math.abs(width - layoutWidthRef.current) < 2) return;
      if (!visibleRef.current) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(draw, 120);
    });
    observer.observe(canvas);

    if ("IntersectionObserver" in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry.isIntersecting;
          if (visibleRef.current) draw();
        },
        { rootMargin: "1200px" },
      );
      intersectionObserver.observe(canvas);
    } else {
      visibleRef.current = true;
    }

    return () => {
      observer.disconnect();
      intersectionObserver?.disconnect();
      window.clearTimeout(resizeTimer);
      requestRef.current += 1;
    };
  // draw intentionally reads the latest render input from inputRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSrc, sourceSrc, cleanLayerKey, minRenderWidth]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full ${
        fit === "contain" ? "object-contain" : "object-cover"
      } object-center ${className}`}
    />
  );
}
