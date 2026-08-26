import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { TEAM_ITEMS } from "../shared/brandCatalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "public", "game-modes", "team", "team-logos");
const outputDir = path.join(root, "public", "game-modes", "team", "generated");
const width = 1920;
const height = 1080;

async function build(team) {
  const normalized = await sharp(path.join(sourceDir, team.assetFile))
    .ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: 1420, height: 700, fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png().toBuffer();
  const canvas = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: normalized, gravity: "center" }]).png().toBuffer();
  const { data, info } = await sharp(canvas).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    mask[i] = 255; mask[i + 1] = 255; mask[i + 2] = 255; mask[i + 3] = data[i + 3];
  }
  const raw = { width: info.width, height: info.height, channels: 4 };
  await Promise.all([
    sharp(data, { raw }).webp({ quality: 96, alphaQuality: 100 }).toFile(path.join(outputDir, `${team.id}-original.webp`)),
    sharp(data, { raw }).webp({ lossless: true }).toFile(path.join(outputDir, `${team.id}-scene.webp`)),
    sharp(mask, { raw }).png().toFile(path.join(outputDir, `${team.id}-scene-mask.png`)),
    sharp(data, { raw }).png().toFile(path.join(outputDir, `${team.id}-main-layer.png`)),
  ]);
}

await fs.mkdir(sourceDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await Promise.all(TEAM_ITEMS.map(build));
console.log(`Built ${TEAM_ITEMS.length} team scenes in ${outputDir}`);
