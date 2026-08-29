import path from "node:path";
import sharp from "sharp";

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsv(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta > 0.00001) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }

  if (hue < 0) hue += 360;

  return {
    h: hue,
    s: max > 0 ? (delta / max) * 100 : 0,
    v: max * 100,
  };
}

export function representativePaint(data, channels = 4) {
  let hueX = 0;
  let hueY = 0;
  let hueWeight = 0;
  let saturation = 0;
  let value = 0;
  let colorWeight = 0;

  for (let offset = 0; offset < data.length; offset += channels) {
    const alpha = channels >= 4 ? data[offset + 3] / 255 : 1;
    if (alpha <= 0.01) continue;

    const hsv = rgbToHsv(data[offset], data[offset + 1], data[offset + 2]);
    const chromaWeight = alpha * (hsv.s / 100) * Math.max(0.12, hsv.v / 100);

    if (chromaWeight > 0.001) {
      const radians = (hsv.h * Math.PI) / 180;
      hueX += Math.cos(radians) * chromaWeight;
      hueY += Math.sin(radians) * chromaWeight;
      hueWeight += chromaWeight;
    }

    saturation += hsv.s * alpha;
    value += hsv.v * alpha;
    colorWeight += alpha;
  }

  let hue = hueWeight > 0 ? (Math.atan2(hueY, hueX) * 180) / Math.PI : 0;
  if (hue < 0) hue += 360;

  return {
    h: Math.round(hue) % 360,
    s: Math.round(clamp(colorWeight ? saturation / colorWeight : 0, 0, 100)),
    v: Math.round(clamp(colorWeight ? value / colorWeight : 0, 0, 100)),
  };
}

export async function normalizeTransparentArtwork(
  sourcePath,
  {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    artworkWidth = 1420,
    artworkHeight = 700,
  } = {},
) {
  const artwork = await sharp(sourcePath, { animated: false })
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: artworkWidth,
      height: artworkHeight,
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: artwork, gravity: "center" }])
    .png()
    .toBuffer();
}

export async function buildTransparentArtworkLayers(sourcePath, options) {
  const normalized = await normalizeTransparentArtwork(sourcePath, options);
  const { data, info } = await sharp(normalized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = Buffer.alloc(data.length);
  const scene = Buffer.alloc(data.length);

  for (let offset = 0; offset < data.length; offset += 4) {
    mask[offset] = 255;
    mask[offset + 1] = 255;
    mask[offset + 2] = 255;
    mask[offset + 3] = data[offset + 3];
  }

  return {
    data,
    mask,
    scene,
    raw: { width: info.width, height: info.height, channels: 4 },
    paint: representativePaint(data, 4),
  };
}

export async function writeTransparentArtworkScene({ layers, outputDir, id }) {
  const { data, mask, scene, raw } = layers;

  await Promise.all([
    sharp(data, { raw }).webp({ quality: 96, alphaQuality: 100 }).toFile(
      path.join(outputDir, `${id}-original.webp`),
    ),
    sharp(scene, { raw }).webp({ lossless: true, alphaQuality: 100 }).toFile(
      path.join(outputDir, `${id}-scene.webp`),
    ),
    sharp(mask, { raw }).png().toFile(path.join(outputDir, `${id}-scene-mask.png`)),
    sharp(data, { raw }).png().toFile(path.join(outputDir, `${id}-main-layer.png`)),
  ]);
}
