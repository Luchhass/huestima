import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { CARTOON_ITEMS } from "../shared/cartoonCatalog.mjs";

const WIDTH = 1920;
const HEIGHT = 1080;
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_ROOT = path.resolve(PROJECT_ROOT, "public", "game-modes", "cartoon");
const DEFAULT_CARTOON_PACK = "adventure-time";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const IMAGE_ACCEPT_HEADER = "image/png,image/jpeg,image/apng,image/*;q=0.8,*/*;q=0.5";

const DEFAULT_MASK = {
  hueTolerance: 26,
  minS: 18,
  minV: 12,
  maxV: 100,
  minCoverage: 0.004,
  maxCoverage: 0.34,
  maxComponents: 18,
  discardLargeEdgeComponents: true,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hueDistance(left, right) {
  const distance = Math.abs(left - right) % 360;
  return Math.min(distance, 360 - distance);
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function inMaskBox(x, y, box) {
  if (!box) return true;

  const left = box.x * WIDTH;
  const top = box.y * HEIGHT;
  const right = left + box.w * WIDTH;
  const bottom = top + box.h * HEIGHT;

  return x >= left && x <= right && y >= top && y <= bottom;
}

function paintMatch(hsv, paint, mask) {
  if (mask.neutral) {
    return (
      hsv.s >= (mask.minS ?? 0) &&
      hsv.s <= (mask.maxS ?? 100) &&
      hsv.v >= (mask.minV ?? 0) &&
      hsv.v <= (mask.maxV ?? 100)
    );
  }

  return (
    hueDistance(hsv.h, paint.h) <= mask.hueTolerance &&
    hsv.s >= mask.minS &&
    hsv.s <= (mask.maxS ?? 100) &&
    hsv.v >= mask.minV &&
    hsv.v <= mask.maxV
  );
}

function relaxedMask(mask, amount) {
  if (mask.neutral) {
    return {
      ...mask,
      maxS: Math.min(100, (mask.maxS ?? 24) + amount * 0.3),
      minV: Math.max(0, (mask.minV ?? 0) - amount * 0.4),
      maxV: Math.min(100, (mask.maxV ?? 100) + amount * 0.2),
    };
  }

  return {
    ...mask,
    hueTolerance: (mask.hueTolerance ?? DEFAULT_MASK.hueTolerance) + amount,
    minS: Math.max(0, (mask.minS ?? DEFAULT_MASK.minS) - amount * 0.5),
    minV: Math.max(0, (mask.minV ?? DEFAULT_MASK.minV) - amount * 0.35),
    maxV: Math.min(100, (mask.maxV ?? DEFAULT_MASK.maxV) + amount * 0.25),
  };
}

function sourceUrlCandidates(url) {
  const candidates = [];

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("static.wikia.nocookie.net")) {
      parsed.searchParams.set("format", "original");
      candidates.push(parsed.toString());
    }
  } catch {
    // Fall back to the original URL below.
  }

  candidates.push(url);
  return [...new Set(candidates)];
}

async function downloadBuffer(url) {
  const origin = new URL(url).origin;
  let lastError;

  for (const candidateUrl of sourceUrlCandidates(url)) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(candidateUrl, {
          headers: {
            accept: IMAGE_ACCEPT_HEADER,
            referer: `${origin}/`,
            "user-agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(25000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        return Buffer.from(await response.arrayBuffer());
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

async function loadSourceBuffer(item) {
  if (item.sourcePath) {
    return fs.readFile(path.resolve(PROJECT_ROOT, item.sourcePath));
  }

  if (item.sourceUrl) {
    return downloadBuffer(item.sourceUrl);
  }

  throw new Error(`Missing source for ${item.id}`);
}

function getCartoonPack(item) {
  const sourcePath = item.sourcePath?.replaceAll("\\", "/") || "";
  const packMatch = sourcePath.match(/^public\/game-modes\/cartoon\/([^/]+)\//);

  return packMatch?.[1] || item.pack || DEFAULT_CARTOON_PACK;
}

function getOutputDir(item) {
  return path.resolve(ASSET_ROOT, getCartoonPack(item), "generated");
}

async function normalizeScene(buffer, item) {
  const position = item.cropPosition || "center";

  return sharp(buffer, { animated: false })
    .rotate()
    .resize({
      width: WIDTH,
      height: HEIGHT,
      fit: "cover",
      position,
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: false,
    })
    .removeAlpha()
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function buildCandidateFlags(data, paint, mask) {
  const flags = new Uint8Array(WIDTH * HEIGHT);
  let count = 0;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!inMaskBox(x, y, mask.box)) continue;

      const pixel = y * WIDTH + x;
      const offset = pixel * 3;
      const hsv = rgbToHsv(data[offset], data[offset + 1], data[offset + 2]);

      if (!paintMatch(hsv, paint, mask)) continue;

      flags[pixel] = 1;
      count += 1;
    }
  }

  return { flags, count };
}

function findComponents(flags) {
  const seen = new Uint8Array(flags.length);
  const queue = new Int32Array(flags.length);
  const components = [];

  for (let start = 0; start < flags.length; start += 1) {
    if (!flags[start] || seen[start]) continue;

    let head = 0;
    let tail = 0;
    let size = 0;
    let left = WIDTH;
    let right = 0;
    let top = HEIGHT;
    let bottom = 0;
    let touchesEdge = false;
    let sumX = 0;
    let sumY = 0;

    seen[start] = 1;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const pixel = queue[head];
      head += 1;
      const x = pixel % WIDTH;
      const y = Math.floor(pixel / WIDTH);

      size += 1;
      sumX += x;
      sumY += y;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      touchesEdge ||= x <= 1 || y <= 1 || x >= WIDTH - 2 || y >= HEIGHT - 2;

      const neighbors = [pixel - 1, pixel + 1, pixel - WIDTH, pixel + WIDTH];
      for (const next of neighbors) {
        if (next < 0 || next >= flags.length || seen[next] || !flags[next]) continue;
        const nx = next % WIDTH;
        if ((x === 0 && nx === WIDTH - 1) || (x === WIDTH - 1 && nx === 0)) continue;
        seen[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }

    components.push({
      size,
      left,
      right,
      top,
      bottom,
      touchesEdge,
      centerX: sumX / size,
      centerY: sumY / size,
      pixels: Array.from(queue.slice(0, tail)),
    });
  }

  return components;
}

function boxScore(component, box) {
  if (!box) return 0;

  const cx = component.centerX / WIDTH;
  const cy = component.centerY / HEIGHT;
  const bx = box.x + box.w / 2;
  const by = box.y + box.h / 2;
  const distance = Math.hypot(cx - bx, cy - by);

  return Math.max(0, 1 - distance * 2);
}

function chooseComponents(components, mask) {
  const minSize = mask.minComponentSize ?? 80;
  const maxComponentPixels = Math.round(WIDTH * HEIGHT * (mask.maxComponentCoverage ?? 0.24));
  const maxPixels = Math.round(WIDTH * HEIGHT * (mask.maxCoverage ?? DEFAULT_MASK.maxCoverage));

  const candidates = components
    .filter((component) => component.size >= minSize)
    .filter((component) => component.size <= maxComponentPixels || mask.keepLargeComponents)
    .filter((component) => {
      if (!mask.discardLargeEdgeComponents) return true;
      if (!component.touchesEdge) return true;
      return component.size < WIDTH * HEIGHT * 0.008;
    })
    .map((component) => ({
      ...component,
      score: component.size * (1 + boxScore(component, mask.box) * 2.8),
    }))
    .sort((left, right) => right.score - left.score);

  const selected = [];
  let selectedPixels = 0;

  for (const component of candidates) {
    if (selected.length >= (mask.maxComponents ?? DEFAULT_MASK.maxComponents)) break;
    if (selectedPixels + component.size > maxPixels && selected.length > 0) continue;

    selected.push(component);
    selectedPixels += component.size;
  }

  return selected;
}

function pointInPolygon(x, y, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function inManualShape(x, y, shape) {
  const nx = x / WIDTH;
  const ny = y / HEIGHT;

  if (shape.box) {
    return (
      nx >= shape.box.x &&
      nx <= shape.box.x + shape.box.w &&
      ny >= shape.box.y &&
      ny <= shape.box.y + shape.box.h
    );
  }

  if (shape.ellipse) {
    const dx = (nx - shape.ellipse.cx) / shape.ellipse.rx;
    const dy = (ny - shape.ellipse.cy) / shape.ellipse.ry;

    return dx * dx + dy * dy <= 1;
  }

  if (shape.polygon) return pointInPolygon(nx, ny, shape.polygon);

  return false;
}

function manualPixelMatch(data, pixel, match) {
  if (!match) return true;

  const offset = pixel * 3;
  const hsv = rgbToHsv(data[offset], data[offset + 1], data[offset + 2]);

  return (
    hsv.s >= (match.minS ?? 0) &&
    hsv.s <= (match.maxS ?? 100) &&
    hsv.v >= (match.minV ?? 0) &&
    hsv.v <= (match.maxV ?? 100) &&
    (match.h == null || hueDistance(hsv.h, match.h) <= (match.hueTolerance ?? DEFAULT_MASK.hueTolerance)) &&
    !(match.excludeHues || []).some(
      (excludeHue) => hueDistance(hsv.h, excludeHue.h) <= (excludeHue.hueTolerance ?? DEFAULT_MASK.hueTolerance),
    )
  );
}

function buildManualPaintLayers(data, manual) {
  const neutral = Buffer.from(data);
  const maskData = Buffer.alloc(WIDTH * HEIGHT * 4);
  const layerData = Buffer.alloc(WIDTH * HEIGHT * 4);
  const include = manual.include || [];
  const exclude = manual.exclude || [];
  let coverage = 0;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const pixel = y * WIDTH + x;
      const isIncluded = include.some(
        (shape) => inManualShape(x, y, shape) && manualPixelMatch(data, pixel, shape.match),
      );
      if (!isIncluded || exclude.some((shape) => inManualShape(x, y, shape))) continue;

      if (!manualPixelMatch(data, pixel, manual.match)) continue;

      const sourceOffset = pixel * 3;
      const maskOffset = pixel * 4;
      const luminance = Math.round(
        data[sourceOffset] * 0.299 + data[sourceOffset + 1] * 0.587 + data[sourceOffset + 2] * 0.114,
      );

      neutral[sourceOffset] = luminance;
      neutral[sourceOffset + 1] = luminance;
      neutral[sourceOffset + 2] = luminance;

      maskData[maskOffset] = 255;
      maskData[maskOffset + 1] = 255;
      maskData[maskOffset + 2] = 255;
      maskData[maskOffset + 3] = 255;
      layerData[maskOffset] = data[sourceOffset];
      layerData[maskOffset + 1] = data[sourceOffset + 1];
      layerData[maskOffset + 2] = data[sourceOffset + 2];
      layerData[maskOffset + 3] = 255;
      coverage += 1;
    }
  }

  return { neutral, maskData, layerData, coverage: coverage / (WIDTH * HEIGHT) };
}

function renderMaskFromComponents(data, components) {
  const neutral = Buffer.from(data);
  const maskData = Buffer.alloc(WIDTH * HEIGHT * 4);
  const layerData = Buffer.alloc(WIDTH * HEIGHT * 4);
  let coverage = 0;

  for (const component of components) {
    for (const pixel of component.pixels) {
      const sourceOffset = pixel * 3;
      const maskOffset = pixel * 4;
      const luminance = Math.round(
        data[sourceOffset] * 0.299 + data[sourceOffset + 1] * 0.587 + data[sourceOffset + 2] * 0.114,
      );

      neutral[sourceOffset] = luminance;
      neutral[sourceOffset + 1] = luminance;
      neutral[sourceOffset + 2] = luminance;

      maskData[maskOffset] = 255;
      maskData[maskOffset + 1] = 255;
      maskData[maskOffset + 2] = 255;
      maskData[maskOffset + 3] = 255;
      layerData[maskOffset] = data[sourceOffset];
      layerData[maskOffset + 1] = data[sourceOffset + 1];
      layerData[maskOffset + 2] = data[sourceOffset + 2];
      layerData[maskOffset + 3] = 255;
      coverage += 1;
    }
  }

  return { neutral, maskData, layerData, coverage: coverage / (WIDTH * HEIGHT) };
}

async function buildMaskFilePaintLayers(raw, item) {
  const maskBuffer = await fs.readFile(path.resolve(PROJECT_ROOT, item.maskPath));
  const maskImage = await sharp(maskBuffer, { animated: false })
    .rotate()
    .resize({
      width: WIDTH,
      height: HEIGHT,
      fit: "cover",
      position: item.maskPosition || item.cropPosition || "center",
      kernel: sharp.kernel.nearest,
      fastShrinkOnLoad: false,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const neutral = Buffer.from(raw.data);
  const maskData = Buffer.alloc(WIDTH * HEIGHT * 4);
  const layerData = Buffer.alloc(WIDTH * HEIGHT * 4);
  const threshold = item.maskThreshold ?? 12;
  const maskChannels = maskImage.info.channels;
  let hasTransparentPixel = false;
  let coverage = 0;

  for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
    const maskOffset = pixel * maskChannels;
    if (maskImage.data[maskOffset + 3] < 250) {
      hasTransparentPixel = true;
      break;
    }
  }

  for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
    const maskOffset = pixel * maskChannels;
    const alpha = maskImage.data[maskOffset + 3];
    const luminance = Math.round(
      maskImage.data[maskOffset] * 0.299 +
        maskImage.data[maskOffset + 1] * 0.587 +
        maskImage.data[maskOffset + 2] * 0.114,
    );
    const maskValue = hasTransparentPixel ? alpha : luminance;

    if (maskValue <= threshold) continue;

    const sourceOffset = pixel * 3;
    const layerOffset = pixel * 4;
    const selectedAlpha = clamp(maskValue, 0, 255);
    const sourceLuminance = Math.round(
      raw.data[sourceOffset] * 0.299 + raw.data[sourceOffset + 1] * 0.587 + raw.data[sourceOffset + 2] * 0.114,
    );
    const mix = selectedAlpha / 255;

    neutral[sourceOffset] = Math.round(raw.data[sourceOffset] * (1 - mix) + sourceLuminance * mix);
    neutral[sourceOffset + 1] = Math.round(raw.data[sourceOffset + 1] * (1 - mix) + sourceLuminance * mix);
    neutral[sourceOffset + 2] = Math.round(raw.data[sourceOffset + 2] * (1 - mix) + sourceLuminance * mix);

    maskData[layerOffset] = 255;
    maskData[layerOffset + 1] = 255;
    maskData[layerOffset + 2] = 255;
    maskData[layerOffset + 3] = selectedAlpha;
    layerData[layerOffset] = raw.data[sourceOffset];
    layerData[layerOffset + 1] = raw.data[sourceOffset + 1];
    layerData[layerOffset + 2] = raw.data[sourceOffset + 2];
    layerData[layerOffset + 3] = selectedAlpha;
    coverage += mix;
  }

  return { neutral, maskData, layerData, coverage: coverage / (WIDTH * HEIGHT) };
}

async function buildPaintLayers(raw, item) {
  if (item.maskPath) return buildMaskFilePaintLayers(raw, item);

  const baseMask = {
    ...DEFAULT_MASK,
    ...(item.mask || {}),
  };

  if (baseMask.manual) return buildManualPaintLayers(raw.data, baseMask.manual);

  for (const mask of [baseMask, relaxedMask(baseMask, 18), relaxedMask(baseMask, 36)]) {
    const candidates = buildCandidateFlags(raw.data, item.paint, mask);
    const components = chooseComponents(findComponents(candidates.flags), mask);
    const paintedPixels = components.reduce((sum, component) => sum + component.size, 0);
    const coverage = paintedPixels / (WIDTH * HEIGHT);

    if (coverage >= (mask.minCoverage ?? DEFAULT_MASK.minCoverage)) {
      return renderMaskFromComponents(raw.data, components);
    }
  }

  const fallback = buildCandidateFlags(raw.data, item.paint, {
    ...baseMask,
    keepLargeComponents: true,
    discardLargeEdgeComponents: false,
    maxCoverage: 0.18,
  });
  const components = chooseComponents(findComponents(fallback.flags), {
    ...baseMask,
    keepLargeComponents: true,
    discardLargeEdgeComponents: false,
    maxCoverage: 0.18,
    maxComponents: 8,
  });

  return renderMaskFromComponents(raw.data, components);
}

async function makeScene(item) {
  const source = await loadSourceBuffer(item);
  const raw = await normalizeScene(source, item);
  const layers = await buildPaintLayers(raw, item);
  const outputDir = getOutputDir(item);
  const originalFile = `${item.id}-original.webp`;
  const sceneFile = `${item.id}-scene.webp`;
  const maskFile = `${item.id}-scene-mask.png`;
  const layerFile = `${item.id}-main-layer.png`;

  await sharp(raw.data, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
    .sharpen({ sigma: 0.55, m1: 0.75, m2: 1.35 })
    .webp({ quality: 98, effort: 6, smartSubsample: false })
    .toFile(path.join(outputDir, originalFile));

  await sharp(layers.neutral, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
    .sharpen({ sigma: 0.55, m1: 0.75, m2: 1.35 })
    .webp({ quality: 98, effort: 6, smartSubsample: false })
    .toFile(path.join(outputDir, sceneFile));

  await sharp(layers.maskData, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .png()
    .toFile(path.join(outputDir, maskFile));

  await sharp(layers.layerData, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .png()
    .toFile(path.join(outputDir, layerFile));

  return { id: item.id, originalFile, sceneFile, maskFile, layerFile, coverage: layers.coverage };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runNext() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, runNext));
  return results;
}

async function main() {
  const outputDirs = Array.from(new Set(CARTOON_ITEMS.map((item) => getOutputDir(item))));

  for (const outputDir of outputDirs) {
    if (!outputDir.startsWith(ASSET_ROOT)) {
      throw new Error(`Refusing to write outside asset root: ${outputDir}`);
    }
  }

  await Promise.all(
    outputDirs.map(async (outputDir) => {
      await fs.rm(outputDir, { recursive: true, force: true });
      await fs.mkdir(outputDir, { recursive: true });
    }),
  );

  const failures = [];
  const results = await mapWithConcurrency(CARTOON_ITEMS, 4, async (item) => {
    try {
      const result = await makeScene(item);
      console.log(`built ${result.id} (${(result.coverage * 100).toFixed(2)}%)`);
      return result;
    } catch (error) {
      failures.push({ item, error });
      console.error(`failed ${item.id}: ${error.message}`);
      return null;
    }
  });

  const built = results.filter(Boolean);
  console.log(`built ${built.length}/${CARTOON_ITEMS.length} real cartoon scenes`);

  if (failures.length > 0) {
    throw new Error(`Cartoon scene build failed for: ${failures.map(({ item }) => item.id).join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
