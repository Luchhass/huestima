import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "public", "Teams Assets");
const logoRoot = path.join(root, "public", "game-modes", "team", "team-logos");
const catalogPath = path.join(root, "shared", "brandCatalog.mjs");
const leagueNames = ["Bundesliga", "La Liga", "Ligue 1", "Premier League", "Seria A", "Süper Lig"];
const overrides = {
  "as-monaco": "AS Monaco",
  "bayer-leverkusen": "Bayer Leverkusen",
  "bayern-munchen": "Bayern München",
  "borussia-monchengladbach": "Borussia Mönchengladbach",
  "deportivo-la-coruna": "Deportivo La Coruña",
  "goztepe-izmir": "Göztepe",
  "koln": "Köln",
  "mainz-05": "Mainz 05",
  "paris-saint-germain": "Paris Saint-Germain",
  "rb-leipzig": "RB Leipzig",
  "rc-lens": "RC Lens",
  "rc-strasbourg-alsace": "RC Strasbourg Alsace",
  "schalke-04": "Schalke 04",
  "vfb-stuttgart": "VfB Stuttgart",
};
const slugAliases = { "bayern-munchen": "bayern-munich", "sv-elversberg": "elversberg", milan: "ac-milan", "como-1907": "como", ipswich: "ipswich-town", newcastle: "newcastle-united", tottenham: "tottenham-hotspur", celta: "celta-vigo", deportivo: "deportivo-alaves", "atletico-madrid": "atletico-madrid", "as-monaco": "monaco", "paris-saint-germain": "psg", "goztepe-izmir": "goztepe" };
const title = (slug) => overrides[slug] || slug.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
const files = [];
for (const league of leagueNames) {
  const dir = path.join(sourceRoot, league);
  for (const file of await fs.readdir(dir)) {
    if (!file.endsWith(".png")) continue;
    const base = file.replace(/_3000x3000\.football-logos\.cc\.png$/, "");
    const rawSlug = base.replace(/^[^_]+_/, "");
    const slug = slugAliases[rawSlug] || rawSlug;
    files.push({
      slug,
      label: title(rawSlug),
      league,
      assetFile: `${slug}.png`,
      sourcePath: path.join(dir, file),
    });
  }
}
const unique = [...new Map(files.map((entry) => [entry.slug, entry])).values()];
await fs.mkdir(logoRoot, { recursive: true });
await Promise.all(unique.map(({ sourcePath, assetFile }) =>
  fs.copyFile(sourcePath, path.join(logoRoot, assetFile)),
));
const source = await fs.readFile(catalogPath, "utf8");
const items = unique.map(({ slug, label }) => `  [${JSON.stringify(slug)}, ${JSON.stringify(label)}],`).join("\n");
const leagues = unique.map(({ slug, league }) => `  ${JSON.stringify(slug)}: ${JSON.stringify(league)},`).join("\n");
const next = source
  .replace(/const NEW_TEAM_ITEMS = \[[\s\S]*?\n\]\.map\(\(\[slug, label\]\) => \(\{/, `const NEW_TEAM_ITEMS = [\n${items}\n].map(([slug, label]) => ({`)
  .replace(/const TEAM_LEAGUES = \{[\s\S]*?\n\};/, `const TEAM_LEAGUES = {\n${leagues}\n};`);
await fs.writeFile(catalogPath, next);
console.log(`Copied and cataloged ${unique.length} team assets.`);
