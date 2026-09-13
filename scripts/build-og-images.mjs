import { readFile, writeFile, mkdir, mkdtemp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "public");
const preview = resolve(root, "output/og-preview");
const chrome = process.env.OG_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const workspace = await mkdtemp(join(tmpdir(), "huestima-og-"));
await access(chrome);
await mkdir(preview, { recursive: true });

const modes = {
  color: ["Renk", "Bir rengi kısa süre görürsün. Tonunu aklında tutar, kaybolduğunda hafızandan yeniden kurarsın.", "Rengi kendi tahmininle yeniden oluşturur, aslına ne kadar yaklaşabildiğini görürsün."],
  flag: ["Bayrak", "Amblemi sabit kalan bir bayrak görürsün. Görsel kaybolmadan önce arkasındaki rengi aklında tutarsın.", "Bayrak yerinde kalırken gizlenen zemin rengini yeniden kurar, hafızandaki tahminini aslıyla karşılaştırırsın."],
  cartoon: ["Çizgi Film", "Çizgi film sahnesinde hatırlaman gereken boyanabilir bir karakter alanı görürsün.", "Sahne sabit kalırken kaybolan karakter rengini yeniden kurar, tahmininin aslına yakınlığını görürsün."],
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
  const png = await sharp(resolve(output, path)).resize({ width: 1100, withoutEnlargement: true }).png().toBuffer();
  return `<img alt="" src="data:image/png;base64,${png.toString("base64")}" style="${style}">`;
}

async function artwork(mode) {
  if (mode === "color") return `<svg width="1384" height="772" viewBox="0 0 1384 772"><defs><linearGradient id="s"><stop stop-color="#b1398b"/><stop offset=".21" stop-color="#ff9750"/><stop offset=".38" stop-color="#e4d64e"/><stop offset=".56" stop-color="#37cf84"/><stop offset=".77" stop-color="#35b3eb"/><stop offset="1" stop-color="#7771f8"/></linearGradient><filter id="blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="38"/></filter></defs><path d="M470 850 C560 700 670 688 750 555 S895 458 990 485 S1190 470 1265 347 S1384 235 1480 225 L1480 890Z" fill="url(#s)" filter="url(#blur)"/></svg>`;
  if (mode === "flag") return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 64% 90% at 100% 110%,#e30a17 0%,#bd0610 45%,#000 100%)"></div>${await asset("game-modes/flag/decorative/turkey-crescent-star.png", "width:600px;right:-74px;bottom:-112px")}`;
  if (mode === "cartoon") return asset("game-modes/cartoon/ben-10/ben-home-character-new.png", "width:300px;right:105px;top:195px");
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
// Exact pixel equality for the shared controls and exterior whitespace/shadow.
const controlRegion = { left: 250, top: 620, width: 340, height: 192 };
const exteriorRegion = { left: 0, top: 0, width: 1732, height: 65 };
for (const region of [controlRegion, exteriorRegion]) {
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
  await writeFile(join(output, `og-${mode}.png`), await readFile(file));
}
await sharp({ create: { width: 1732, height: 1362, channels: 3, background: "#eee" } })
  .composite(await Promise.all(names.map(async (mode, i) => ({ input: await sharp(join(preview, `og-${mode}.png`)).resize(866, 454).png().toBuffer(), left: (i % 2) * 866, top: Math.floor(i / 2) * 454 }))))
  .png().toFile(join(preview, "comparison.png"));
console.log(`${names.length} OG images saved. Dimensions and shared control/exterior pixels match exactly.`);
