import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BRAND_ITEMS } from "../shared/brandCatalog.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const SOURCE_DIR = path.join(
  PROJECT_ROOT,
  "public",
  "game-modes",
  "brand",
  "brand-logos",
);
const OUTPUT_DIR = path.join(
  PROJECT_ROOT,
  "public",
  "game-modes",
  "brand",
  "generated",
);
const WIDTH = 1920;
const HEIGHT = 1080;
const LOGO_WIDTH = 1420;
const LOGO_HEIGHT = 700;

async function normalizeLogo(sourcePath) {
  const trimmed = await sharp(sourcePath, { animated: false })
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: LOGO_WIDTH,
      height: LOGO_HEIGHT,
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: "center" }])
    .png()
    .toBuffer();
}

async function buildBrandScene(brand) {
  const sourcePath = path.join(SOURCE_DIR, brand.assetFile);
  const normalized = await normalizeLogo(sourcePath);
  const { data, info } = await sharp(normalized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const mask = Buffer.alloc(pixelCount * 4);
  const scene = Buffer.alloc(pixelCount * 4);
  const layer = Buffer.from(data);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    mask[offset] = 255;
    mask[offset + 1] = 255;
    mask[offset + 2] = 255;
    mask[offset + 3] = alpha;
  }

  const raw = { width: info.width, height: info.height, channels: 4 };
  await Promise.all([
    sharp(data, { raw }).webp({ quality: 96, alphaQuality: 100 }).toFile(
      path.join(OUTPUT_DIR, `${brand.id}-original.webp`),
    ),
    sharp(scene, { raw }).webp({ lossless: true, alphaQuality: 100 }).toFile(
      path.join(OUTPUT_DIR, `${brand.id}-scene.webp`),
    ),
    sharp(mask, { raw }).png().toFile(
      path.join(OUTPUT_DIR, `${brand.id}-scene-mask.png`),
    ),
    sharp(layer, { raw }).png().toFile(
      path.join(OUTPUT_DIR, `${brand.id}-main-layer.png`),
    ),
  ]);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all(BRAND_ITEMS.map(buildBrandScene));
console.log(`Built ${BRAND_ITEMS.length} brand scenes in ${OUTPUT_DIR}`);
