import { readFile, writeFile, mkdir, mkdtemp, access, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = resolve(root, "public");
const output = resolve(publicRoot, "social");
const preview = resolve(root, "output/og-preview");
const chrome = process.env.OG_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const workspace = await mkdtemp(join(tmpdir(), "huestima-og-"));
await access(chrome);
await mkdir(output, { recursive: true });
await mkdir(preview, { recursive: true });

const modes = {
  color: ["Renk", "Bir rengi kısa süre görürsün. Tonunu aklında tutar, kaybolduğunda hafızandan yeniden kurarsın.", "Rengi kendi tahmininle yeniden oluşturur, aslına ne kadar yaklaşabildiğini görürsün."],
  flag: ["Bayrak", "Amblemi sabit kalan bir bayrak görürsün. Görsel kaybolmadan önce arkasındaki rengi aklında tutarsın.", "Bayrak yerinde kalırken gizlenen zemin rengini yeniden kurar, hafızandaki tahminini aslıyla karşılaştırırsın."],
  cartoon: ["Çizgi Film", "Çizgi film sahnesinde hatırlaman gereken boyanabilir bir karakter alanı görürsün.", "Sahne sabit kalırken kaybolan karakter rengini yeniden kurar, tahmininin aslına yakınlığını görürsün."],
  pokemon: ["Pokémon", "Bir Pokémon ve hatırlaman gereken rengini görürsün. Kaybolmadan önce rengin tonunu aklında tutarsın.", "Rengi yeniden oluşturur, puan kazanır ve Pokémon'u Pokédex'ine eklersin."],
  brand: ["Marka", "Tanıdık bir logo kendi imza rengi üzerinde görünür. Logo ve altındaki tonu kaybolmadan önce aklında tutarsın.", "Logo değişmeden gizlenen zemin rengini yeniden kurar, tahminini orijinal renkle karşılaştırırsın."],
  team: ["Takımlar", "Bir takım logosu kendi renkleri üzerinde görünür. Logoyu ve renk paletini kaybolmadan önce aklında tutarsın.", "Logo sabit kalırken gizlenen takım rengini yeniden kurar, tahmininin aslına ne kadar yaklaştığını görürsün."],
  perception: ["Algı", "Renklerin oluşturduğu düzeni inceler, akışı bozan parçaları veya farklı tonu bulursun.", "Pattern modunda yanlış parçaları yerine koyar, Odd modunda giderek küçülen ton farkını seçerek ilerlersin."],
};

// One immutable layout for every mode, independent of content length.
const css = `
*{box-sizing:border-box}html,body{margin:0;width:1732px;height:908px;overflow:hidden;background:white}
body{font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
.card{position:absolute;left:174px;top:66px;width:1384px;height:772px;border-radius:44px;background:#000;overflow:hidden;box-shadow:0 22px 36px rgba(0,0,0,.28)}
h1,p,.caption,.buttons{position:absolute;left:84px;margin:0;z-index:2}
h1{top:68px;font-size:160px;line-height:176px;letter-spacing:-5px;font-weight:700;color:#fff;white-space:nowrap}
p{width:795px;height:129px;font-size:34px;line-height:43px;font-weight:600;color:#c9c9c9}
.first{top:264px}.second{top:412px}
.caption{top:559px;font-size:24px;line-height:30px;font-weight:700;letter-spacing:1px;color:#fff}
.buttons{top:612px;display:flex;gap:30px}
.button{width:126px;height:126px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center}
.button svg{width:56px;height:56px;fill:none;stroke:#080808;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.art{position:absolute;inset:0;z-index:1;pointer-events:none}.art img{position:absolute;max-width:none;height:auto}
`;
const icons = `<div class="buttons"><div class="button"><svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5 22v-3a7 7 0 0 1 14 0v3"/></svg></div><div class="button"><svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M2 22v-3a7 7 0 0 1 14 0v3M16 3a4 4 0 0 1 0 8M22 22v-3a7 7 0 0 0-4-6"/></svg></div></div>`;

async function asset(path, style) {
  const png = await sharp(resolve(publicRoot, path)).resize({ width: 1100, withoutEnlargement: true }).png().toBuffer();
  return `<img alt="" src="data:image/png;base64,${png.toString("base64")}" style="${style}">`;
}

async function artwork(mode) {
  if (mode === "color") return `<svg width="1384" height="772" viewBox="0 0 500 500" preserveAspectRatio="none">
    <defs>
      <path id="lower" d="M 90 520 C 100 474 112 438 148 428 C 186 418 207 399 232 370 C 260 337 285 307 319 315 C 356 325 379 338 410 312 C 441 286 450 251 476 237 C 494 228 510 238 525 251 L 525 525 L 90 525 Z"/>
      <path id="upper" d="M -35 -60 H 280 C 274 23 267 41 245 46 C 222 51 210 60 194 75 C 178 91 163 106 143 103 C 120 98 107 91 88 104 C 69 117 64 135 48 142 C 38 146 28 141 19 135 C 12 132 -12 116 -35 120 Z"/>
      <filter id="soften" x="-32%" y="-32%" width="164%" height="164%"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="blend" x="-18%" y="-8%" width="136%" height="116%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="12 1.5"/></filter>
      <mask id="lower-mask" maskUnits="userSpaceOnUse"><rect y="-30" width="500" height="560" fill="black"/><use href="#lower" fill="white" filter="url(#soften)"/></mask>
      <mask id="upper-mask" maskUnits="userSpaceOnUse"><rect y="-30" width="500" height="560" fill="black"/><use href="#upper" transform="translate(-35 -60) scale(1.1 1.04) translate(35 60)" fill="white" filter="url(#soften)"/></mask>
      <linearGradient id="s" x1="0" y1="0" x2="500" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat" color-interpolation="sRGB"><stop offset="0" stop-color="#ff5f7a"/><stop offset=".2" stop-color="#f7d046"/><stop offset=".4" stop-color="#32d989"/><stop offset=".6" stop-color="#45a6ff"/><stop offset=".8" stop-color="#9d6cff"/><stop offset="1" stop-color="#ff5f7a"/></linearGradient>
    </defs>
    <g filter="url(#blend)" mask="url(#lower-mask)"><rect x="-500" y="-30" width="1500" height="560" fill="url(#s)"/></g>
    <g filter="url(#blend)" mask="url(#upper-mask)" opacity=".82"><rect x="-500" y="-30" width="1500" height="560" fill="url(#s)"/></g>
  </svg>`;
  if (mode === "flag") return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 64% 90% at 100% 110%,#e30a17 0%,#bd0610 45%,#000 100%)"></div>${await asset("game-modes/flag/decorative/turkey-crescent-star.png", "width:600px;right:-74px;bottom:-112px")}`;
  if (mode === "cartoon") return asset("game-modes/cartoon/ben-10/ben-home-character-new.png", "width:300px;right:105px;top:195px");
  if (mode === "pokemon") {
    const characters = [
      ["001Bulbasaur", "left:calc(8% - 27px);bottom:-8%;z-index:1;width:69%;height:126%!important"],
      ["039Jigglypuff", "left:47%;bottom:0;z-index:6;width:37.44%;height:135%!important"],
      ["004Charmander", "right:-27px;bottom:4%;z-index:8;width:44.76%;height:120.6%!important"],
      ["025Pikachu", "left:29%;bottom:calc(20% - 91px);z-index:7;width:29.88%;height:135%!important"],
      ["007Squirtle", "right:-27px;bottom:calc(15% + 159px);z-index:2;width:40.44%;height:115.2%!important"],
    ];
    const pokedex = await asset("game-modes/pokemon/ui/Pokedex-closed.png", "width:170px;right:220px;top:150px;z-index:9;transform:rotate(13deg);filter:drop-shadow(0 16px 20px rgba(0,0,0,.38))");
    return `<div style="position:absolute;right:-21px;bottom:-21px;width:850px;height:500px;transform:scale(0.78);transform-origin:bottom right">${(await Promise.all(characters.map(([name, style]) => asset(`game-modes/pokemon/source/${name}_OS_anime.png`, `${style};object-fit:contain;object-position:center bottom;filter:drop-shadow(0 18px 27px rgba(0,0,0,.32))`)))).join("")}</div>${pokedex}`;
  }
  if (mode === "team") return `${await asset("game-modes/team/team-logos/galatasaray.png", "width:105px;right:8px;top:408px")}${await asset("game-modes/team/team-logos/fenerbahce.png", "width:520px;right:-18px;bottom:-134px;transform:rotate(-8deg)")}`;
  if (mode === "perception") {
    const swapped = { 7: 17, 17: 7, 13: 14, 14: 13 };
    const tiles = Array.from({ length: 25 }, (_, index) => {
      const source = swapped[index] ?? index;
      const row = Math.floor(source / 5);
      const column = source % 5;
      const hue = (338 + column * 13 + row * 8) % 360;
      return `<span style="border-radius:18px;background:hsl(${hue} ${72 - row}% ${76 - row * 5 - column * 2}%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)"></span>`;
    }).join("");
    return `<div style="position:absolute;right:-34px;bottom:-52px;width:510px;height:510px;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:14px;transform:rotate(8deg);transform-origin:58% 62%">${tiles}</div>`;
  }
  const logos = [
    ["google-chrome", "width:180px;right:265px;bottom:135px;transform:rotate(-17deg)"],
    ["facebook", "width:430px;right:-55px;bottom:-158px;transform:rotate(7deg)"],
    ["discord", "width:240px;right:290px;bottom:-15px;transform:rotate(-13deg)"],
    ["netflix", "width:215px;right:-6px;bottom:66px;transform:rotate(-8deg)"],
    ["spotify", "width:205px;right:152px;bottom:108px;transform:rotate(10deg);background:#000;border-radius:50%"],
    ["snapchat", "width:186px;right:63px;bottom:259px;transform:rotate(18deg)"],
    ["instagram", "width:214px;right:6px;bottom:417px;transform:rotate(-14deg)"],
  ];
  return (await Promise.all(logos.map(([name, style]) => asset(`game-modes/brand/brand-logos/${name}.png`, style)))).join("");
}

function run(args) {
  return new Promise((done, fail) => {
    const child = spawn(chrome, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let errors = "";
    child.stderr.on("data", chunk => { errors += chunk; });
    child.on("error", fail);
    child.on("exit", code => code === 0 ? done() : fail(new Error(errors)));
  });
}

for (const [mode, [title, first, second]] of Object.entries(modes)) {
  const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${css}</style><body><main class="card"><div class="art">${await artwork(mode)}</div><h1>${title}</h1><p class="first">${first}</p><p class="second">${second}</p><div class="caption">SOLO YA DA MULTIPLAYER</div>${icons}</main></body></html>`;
  const file = join(workspace, `${mode}.html`);
  await writeFile(file, html);
  await run(["--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1732,908", "--virtual-time-budget=2500", `--user-data-dir=${join(workspace, `chrome-${mode}`)}`, `--screenshot=${join(preview, `og-${mode}.png`)}`, pathToFileURL(file).href]);
  console.log(`Rendered ${mode}`);
}

const names = Object.keys(modes);
// Compare inside the shared buttons; decorative backgrounds may differ around them.
const controlRegions = [
  { left: 277, top: 697, width: 88, height: 88 },
  { left: 433, top: 697, width: 88, height: 88 },
];
const exteriorRegion = { left: 0, top: 0, width: 1732, height: 65 };
for (const region of [...controlRegions, exteriorRegion]) {
  const baseline = await sharp(join(preview, "og-color.png")).extract(region).raw().toBuffer();
  for (const mode of names.slice(1)) {
    const pixels = await sharp(join(preview, `og-${mode}.png`)).extract(region).raw().toBuffer();
    assert.ok(baseline.equals(pixels), `Shared pixels differ for ${mode}: ${JSON.stringify(region)}`);
  }
}
for (const mode of names) {
  const file = join(preview, `og-${mode}.png`);
  const meta = await sharp(file).metadata();
  assert.equal(meta.width, 1732);
  assert.equal(meta.height, 908);
  const pending = join(output, `.og-${mode}.tmp.png`);
  await writeFile(pending, await readFile(file));
  await rename(pending, join(output, `og-${mode}.png`));
}
await sharp({ create: { width: 1732, height: Math.ceil(names.length / 2) * 454, channels: 3, background: "#eee" } })
  .composite(await Promise.all(names.map(async (mode, i) => ({ input: await sharp(join(preview, `og-${mode}.png`)).resize(866, 454).png().toBuffer(), left: (i % 2) * 866, top: Math.floor(i / 2) * 454 }))))
  .png().toFile(join(preview, "comparison.png"));
console.log(`${names.length} OG images saved. Dimensions and shared control/exterior pixels match exactly.`);
await import("./build-landing-og.mjs");
