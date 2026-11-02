import { readFile, writeFile, mkdir, mkdtemp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VolumeX, Music2, Sun, LockOpen, Bell, History, UserRound } from "lucide-react";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "public/social/og-landing.png");
const preview = resolve(root, "output/og-preview");
const chrome = process.env.OG_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const workspace = await mkdtemp(join(tmpdir(), "huestima-landing-og-"));
await access(chrome);
await mkdir(resolve(root, "public/social"), { recursive: true });
await mkdir(preview, { recursive: true });
const font = await readFile(require.resolve("next/dist/next-devtools/server/font/geist-latin.woff2"));
const logo = '<span class="logo"><span></span></span>';
const icon = (component) => renderToStaticMarkup(createElement(component, { size: 29, strokeWidth: 1.8 }));
const description = "Chase a color after it disappears, pull the defining shade from a flag, rebuild a cartoon character's palette, catch Pokémon by remembering their colors, recognize a brand by its signature hue, prove how well you know your team's colors, or test your perception by spotting what breaks a color pattern. Each game turns color into a different visual challenge.";
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Huestima landing social image</title><style>
@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');font-weight:100 900;font-style:normal}
*{box-sizing:border-box}html,body{margin:0;width:1732px;height:908px;overflow:hidden;background:#000;color:#fff}
body{font-family:Geist,Arial,sans-serif;-webkit-font-smoothing:antialiased}
header{position:absolute;top:42px;left:48px;right:48px;height:48px;display:flex;align-items:center;gap:52px}
.brand{display:flex;align-items:center;gap:14px;font-size:22px;font-weight:700;letter-spacing:-.4px}
.logo{display:inline-grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:conic-gradient(from 25deg,#ff5f7a,#f7d046,#32d989,#45a6ff,#9d6cff,#ff5f7a)}
.logo>span{width:19px;height:19px;background:#fff;border-radius:50%}
nav{display:flex;gap:26px;align-items:center;color:#b8b8bc;font-size:16px;font-weight:650}
.chevron{display:inline-block;width:7px;height:7px;border-bottom:2px solid currentColor;border-right:2px solid currentColor;transform:translateY(-3px) rotate(45deg);margin-left:7px}
.controls{margin-left:auto;display:flex;align-items:center;gap:24px}.controls b{font-size:21px}.divider{height:28px;width:1px;background:#666}
main{position:absolute;left:48px;right:48px;top:283px}
h1{margin:0;font-size:122px;line-height:.86;letter-spacing:-.075em;font-weight:600}h1 span{display:block}
p{margin:42px 0 0;width:1080px;color:#a3a3a3;font-size:22px;line-height:1.5;font-weight:500}
footer{position:absolute;left:48px;right:48px;bottom:43px;display:flex;align-items:center;gap:27px;color:#858585;font-size:14px;font-weight:500}
.site{display:flex;align-items:center;gap:9px}.site .logo{width:19px;height:19px}.site .logo>span{width:8px;height:8px}.footer-links{margin-left:auto;display:flex;align-items:center;gap:22px}
</style><body>
<header><div class="brand">${logo}<span>HUESTIMA</span></div><nav><span>COLOR</span><span>FLAG</span><span>TOONS<i class="chevron"></i></span><span>PERCEPTION</span><span>LOGOS<i class="chevron"></i></span></nav><div class="controls"><b>EN</b>${[VolumeX, Music2, Sun, LockOpen].map(icon).join("")}<span class="divider"></span>${[Bell, History, UserRound].map(icon).join("")}</div></header>
<main><h1><span>how well do you</span><span>remember color?</span></h1><p>${description}</p></main>
<footer><span class="site">${logo} huestima.com</span><span>© ${new Date().getFullYear()} Huestima All rights reserved</span><span class="footer-links">privacy policy <span>▪</span> credits</span></footer>
</body></html>`;

const htmlPath = join(preview, "og-landing.html");
await writeFile(htmlPath, html);
const screenshot = join(preview, "og-landing.png");
await new Promise((done, fail) => {
  const child = spawn(chrome, ["--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1732,908", "--virtual-time-budget=2500", `--user-data-dir=${join(workspace, "chrome")}`, `--screenshot=${screenshot}`, pathToFileURL(htmlPath).href], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  let errors = "";
  child.stderr.on("data", (chunk) => { errors += chunk; });
  child.on("error", fail);
  child.on("exit", (code) => code === 0 ? done() : fail(new Error(errors)));
});
const metadata = await sharp(screenshot).metadata();
assert.equal(metadata.width, 1732);
assert.equal(metadata.height, 908);
await writeFile(output, await readFile(screenshot));
console.log("Landing OG saved: public/social/og-landing.png (1732 × 908, HTML source in output/og-preview/og-landing.html).");
