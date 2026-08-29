import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { representativePaint } from "./lib/visual-scene-pipeline.mjs";

const WIDTH = 1920;
const HEIGHT = 1280;
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.resolve(PROJECT_ROOT, "public", "game-modes", "flag", "source");
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, "public", "game-modes", "flag", "generated");
const CATALOG_PATH = path.resolve(PROJECT_ROOT, "shared", "flagCatalog.mjs");

const FLAG_ITEMS = [
  ["afghanistan", "Afghanistan"],
  ["albania", "Albania"],
  ["algeria", "Algeria"],
  ["andorra", "Andorra"],
  ["angola", "Angola"],
  ["antigua-and-barbuda", "Antigua and Barbuda"],
  ["argentina", "Argentina"],
  ["armenia", "Armenia"],
  ["australia", "Australia"],
  ["austria", "Austria"],
  ["azerbaijan", "Azerbaijan"],
  ["bahamas", "Bahamas"],
  ["bahrain", "Bahrain"],
  ["bangladesh", "Bangladesh"],
  ["barbados", "Barbados"],
  ["belarus", "Belarus"],
  ["belgium", "Belgium"],
  ["belize", "Belize"],
  ["benin", "Benin"],
  ["bhutan", "Bhutan"],
  ["bolivia", "Bolivia"],
  ["bosnia-and-herzegovina", "Bosnia and Herzegovina"],
  ["botswana", "Botswana"],
  ["brazil", "Brazil"],
  ["brunei", "Brunei"],
  ["bulgaria", "Bulgaria"],
  ["burkina-faso", "Burkina Faso"],
  ["burundi", "Burundi"],
  ["cabo-verde", "Cabo Verde"],
  ["cambodia", "Cambodia"],
  ["cameroon", "Cameroon"],
  ["canada", "Canada"],
  ["central-african-republic", "Central African Republic"],
  ["chad", "Chad"],
  ["chile", "Chile"],
  ["china", "China"],
  ["colombia", "Colombia"],
  ["comoros", "Comoros"],
  ["congo-democratic-republic-of-the", "Democratic Republic of the Congo"],
  ["congo-republic-of-the", "Republic of the Congo"],
  ["costa-rica", "Costa Rica"],
  ["cote-d-ivoire", "Cote d'Ivoire"],
  ["croatia", "Croatia"],
  ["cuba", "Cuba"],
  ["cyprus", "Cyprus"],
  ["czech-republic", "Czech Republic"],
  ["denmark", "Denmark"],
  ["djibouti", "Djibouti"],
  ["dominica", "Dominica"],
  ["dominican-republic", "Dominican Republic"],
  ["east-timor", "East Timor"],
  ["ecuador", "Ecuador"],
  ["egypt", "Egypt"],
  ["el-salvador", "El Salvador"],
  ["equatorial-guinea", "Equatorial Guinea"],
  ["eritrea", "Eritrea"],
  ["estonia", "Estonia"],
  ["eswatini", "Eswatini"],
  ["ethiopia", "Ethiopia"],
  ["fiji", "Fiji"],
  ["finland", "Finland"],
  ["france", "France"],
  ["gabon", "Gabon"],
  ["gambia", "Gambia"],
  ["georgia", "Georgia"],
  ["germany", "Germany"],
  ["ghana", "Ghana"],
  ["greece", "Greece"],
  ["grenada", "Grenada"],
  ["guatemala", "Guatemala"],
  ["guinea", "Guinea"],
  ["guinea-bissau", "Guinea-Bissau"],
  ["guyana", "Guyana"],
  ["haiti", "Haiti"],
  ["honduras", "Honduras"],
  ["hungary", "Hungary"],
  ["iceland", "Iceland"],
  ["india", "India"],
  ["indonesia", "Indonesia"],
  ["iran", "Iran"],
  ["iraq", "Iraq"],
  ["ireland", "Ireland"],
  ["israel", "Israel"],
  ["italy", "Italy"],
  ["jamaica", "Jamaica"],
  ["japan", "Japan"],
  ["jordan", "Jordan"],
  ["kazakhstan", "Kazakhstan"],
  ["kenya", "Kenya"],
  ["kiribati", "Kiribati"],
  ["kosovo", "Kosovo"],
  ["kuwait", "Kuwait"],
  ["kyrgyzstan", "Kyrgyzstan"],
  ["laos", "Laos"],
  ["latvia", "Latvia"],
  ["lebanon", "Lebanon"],
  ["lesotho", "Lesotho"],
  ["liberia", "Liberia"],
  ["libya", "Libya"],
  ["liechtenstein", "Liechtenstein"],
  ["lithuania", "Lithuania"],
  ["luxembourg", "Luxembourg"],
  ["madagascar", "Madagascar"],
  ["malawi", "Malawi"],
  ["malaysia", "Malaysia"],
  ["maldives", "Maldives"],
  ["mali", "Mali"],
  ["malta", "Malta"],
  ["marshall-islands", "Marshall Islands"],
  ["mauritania", "Mauritania"],
  ["mauritius", "Mauritius"],
  ["mexico", "Mexico"],
  ["micronesia", "Micronesia"],
  ["moldova", "Moldova"],
  ["monaco", "Monaco"],
  ["mongolia", "Mongolia"],
  ["montenegro", "Montenegro"],
  ["morocco", "Morocco"],
  ["mozambique", "Mozambique"],
  ["myanmar", "Myanmar"],
  ["namibia", "Namibia"],
  ["nauru", "Nauru"],
  ["nepal", "Nepal"],
  ["netherlands", "Netherlands"],
  ["new-zealand", "New Zealand"],
  ["nicaragua", "Nicaragua"],
  ["niger", "Niger"],
  ["nigeria", "Nigeria"],
  ["north-korea", "North Korea"],
  ["north-macedonia", "North Macedonia"],
  ["norway", "Norway"],
  ["oman", "Oman"],
  ["pakistan", "Pakistan"],
  ["palau", "Palau"],
  ["palestine", "Palestine"],
  ["panama", "Panama"],
  ["papua-new-guinea", "Papua New Guinea"],
  ["paraguay", "Paraguay"],
  ["peru", "Peru"],
  ["philippines", "Philippines"],
  ["poland", "Poland"],
  ["portugal", "Portugal"],
  ["qatar", "Qatar"],
  ["romania", "Romania"],
  ["russia", "Russia"],
  ["rwanda", "Rwanda"],
  ["saint-kitts-and-nevis", "Saint Kitts and Nevis"],
  ["saint-lucia", "Saint Lucia"],
  ["saint-vincent-and-the-grenadines", "Saint Vincent and the Grenadines"],
  ["samoa", "Samoa"],
  ["san-marino", "San Marino"],
  ["sao-tome-and-principe", "Sao Tome and Principe"],
  ["saudi-arabia", "Saudi Arabia"],
  ["senegal", "Senegal"],
  ["serbia", "Serbia"],
  ["seychelles", "Seychelles"],
  ["sierra-leone", "Sierra Leone"],
  ["singapore", "Singapore"],
  ["slovakia", "Slovakia"],
  ["slovenia", "Slovenia"],
  ["solomon-islands", "Solomon Islands"],
  ["somalia", "Somalia"],
  ["south-africa", "South Africa"],
  ["south-korea", "South Korea"],
  ["south-sudan", "South Sudan"],
  ["spain", "Spain"],
  ["sri-lanka", "Sri Lanka"],
  ["sudan", "Sudan"],
  ["suriname", "Suriname"],
  ["sweden", "Sweden"],
  ["switzerland", "Switzerland"],
  ["syria", "Syria"],
  ["taiwan", "Taiwan"],
  ["tajikistan", "Tajikistan"],
  ["tanzania", "Tanzania"],
  ["thailand", "Thailand"],
  ["togo", "Togo"],
  ["tonga", "Tonga"],
  ["trinidad-and-tobago", "Trinidad and Tobago"],
  ["tunisia", "Tunisia"],
  ["turkey", "Turkey"],
  ["turkmenistan", "Turkmenistan"],
  ["tuvalu", "Tuvalu"],
  ["uganda", "Uganda"],
  ["ukraine", "Ukraine"],
  ["united-arab-emirates", "United Arab Emirates"],
  ["united-kingdom", "United Kingdom"],
  ["united-states-of-america", "United States of America"],
  ["uruguay", "Uruguay"],
  ["uzbekistan", "Uzbekistan"],
  ["vanuatu", "Vanuatu"],
  ["vatican-city", "Vatican City"],
  ["venezuela", "Venezuela"],
  ["vietnam", "Vietnam"],
  ["yemen", "Yemen"],
  ["zambia", "Zambia"],
  ["zimbabwe", "Zimbabwe"],
];

async function normalizeFlag(buffer) {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({
      width: WIDTH,
      height: HEIGHT,
      fit: "cover",
      position: "center",
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: false,
    })
    .ensureAlpha()
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function buildLayers(raw) {
  const original = Buffer.from(raw.data);
  const neutral = Buffer.from(raw.data);
  const maskData = Buffer.alloc(WIDTH * HEIGHT * 4);
  const layerData = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
    const offset = pixel * 4;
    const alpha = raw.data[offset + 3];

    if (alpha <= 0) continue;

    const luminance = Math.round(
      raw.data[offset] * 0.299 +
        raw.data[offset + 1] * 0.587 +
        raw.data[offset + 2] * 0.114,
    );

    neutral[offset] = luminance;
    neutral[offset + 1] = luminance;
    neutral[offset + 2] = luminance;
    neutral[offset + 3] = alpha;

    maskData[offset] = 255;
    maskData[offset + 1] = 255;
    maskData[offset + 2] = 255;
    maskData[offset + 3] = alpha;

    layerData[offset] = raw.data[offset];
    layerData[offset + 1] = raw.data[offset + 1];
    layerData[offset + 2] = raw.data[offset + 2];
    layerData[offset + 3] = alpha;

  }

  return {
    original,
    neutral,
    maskData,
    layerData,
    paint: representativePaint(raw.data, 4),
  };
}

async function writeImage(buffer, channels, outputPath, format, options = {}) {
  let pipeline = sharp(buffer, {
    raw: { width: WIDTH, height: HEIGHT, channels },
  });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality: 100, effort: 6, ...options });
  } else if (format === "png") {
    pipeline = pipeline.png(options);
  }

  await pipeline.toFile(outputPath);
}

async function buildFlag(item) {
  const sourcePath = path.join(SOURCE_DIR, `${item.id}.png`);
  const source = await fs.readFile(sourcePath);
  const raw = await normalizeFlag(source);
  const layers = buildLayers(raw);
  const originalFile = `${item.id}-original.webp`;
  const sceneFile = `${item.id}-scene.webp`;
  const maskFile = `${item.id}-scene-mask.png`;
  const layerFile = `${item.id}-main-layer.png`;

  await writeImage(layers.original, 4, path.join(OUTPUT_DIR, originalFile), "webp");
  await writeImage(layers.neutral, 4, path.join(OUTPUT_DIR, sceneFile), "webp");
  await writeImage(layers.maskData, 4, path.join(OUTPUT_DIR, maskFile), "png");
  await writeImage(layers.layerData, 4, path.join(OUTPUT_DIR, layerFile), "png");

  return {
    id: item.id,
    label: item.label,
    paint: layers.paint,
    sourcePath: `public/game-modes/flag/source/${item.id}.png`,
  };
}

function buildCatalogModule(items) {
  return `export const FLAG_ITEMS = ${JSON.stringify(items, null, 2)};\n`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const missing = [];
  for (const [id] of FLAG_ITEMS) {
    const sourcePath = path.join(SOURCE_DIR, `${id}.png`);
    try {
      await fs.access(sourcePath);
    } catch {
      missing.push(id);
    }
  }

  if (missing.length) {
    throw new Error(`Missing source flag files: ${missing.join(", ")}`);
  }

  const catalog = [];
  for (const [id, label] of FLAG_ITEMS) {
    const item = await buildFlag({ id, label });
    catalog.push(item);
    console.log(`built ${id}`);
  }

  await fs.writeFile(CATALOG_PATH, buildCatalogModule(catalog), "utf8");
  console.log(`built ${catalog.length} flag scenes`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
