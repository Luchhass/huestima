import { CARTOON_ITEMS } from "../../shared/cartoonCatalog.mjs";

const DEFAULT_CARTOON_PACK = "ben-10";
const CARTOON_LABELS = {
  "ben-10-9487993": { en: "Omnitrix", tr: "Omnitrix" },
  "ben-10-9487997": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9490714": { en: "Armodrillo", tr: "Armodrillo" },
  "ben-10-9491039": { en: "Diamondhead", tr: "Elmas Kafa" },
  "ben-10-9491338": { en: "Stinkfly", tr: "Pul Kanat" },
  "ben-10-9491363": { en: "Rustbucket", tr: "Rustbucket" },
  "ben-10-9491668": { en: "Upgrade", tr: "Guncelleme" },
  "ben-10-9491801": { en: "Heatblast", tr: "Ates Topu" },
  "ben-10-9492625": { en: "Wildvine", tr: "Vahsi Asma" },
  "ben-10-9492707": { en: "Darkstar", tr: "Darkstar" },
  "ben-10-9492732": { en: "Four Arms", tr: "Dort Kol" },
  "ben-10-9492960": { en: "Darkstar", tr: "Darkstar" },
  "ben-10-9494291": { en: "Wildmutt", tr: "Yaban Kopek" },
  "ben-10-9494769": { en: "Grey Matter", tr: "Gri Madde" },
  "ben-10-9495739": { en: "Hex", tr: "Hex" },
  "ben-10-9495875": { en: "Heatblast", tr: "Ates Topu" },
  "ben-10-9496217": { en: "Heatblast", tr: "Ates Topu" },
  "ben-10-9496247": { en: "Wildvine", tr: "Vahsi Asma" },
  "ben-10-9496599": { en: "Diamondhead", tr: "Elmas Kafa" },
  "ben-10-9497428": { en: "Max Tennyson", tr: "Max Tennyson" },
  "ben-10-9497459": { en: "Cannonbolt", tr: "Yildirim Gulle" },
  "ben-10-9500315": { en: "Looma Red Wind", tr: "Looma Red Wind" },
  "ben-10-9500320": { en: "Jetray", tr: "Yuzen Kanat" },
  "ben-10-9500434": { en: "Humungousaur", tr: "Insanazor" },
  "ben-10-9500517": { en: "Four Arms", tr: "Dort Kol" },
  "ben-10-9500646": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9501296": { en: "Swampfire", tr: "Camur Ates" },
  "ben-10-9501910": { en: "Forever Knight", tr: "Sonsuz Sovalye" },
  "ben-10-9502590": { en: "Charmcaster", tr: "Charmcaster" },
  "ben-10-9502690": { en: "Ghostfreak", tr: "Golge Hayalet" },
  "ben-10-9503595": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9504446": { en: "Doctor Animo", tr: "Doktor Animo" },
  "ben-10-9504467": { en: "Giant Toad", tr: "Dev Kurbaga" },
  "ben-10-9505183": { en: "Humungousaur", tr: "Insanazor" },
  "ben-10-9505308": { en: "Humungousaur", tr: "Insanazor" },
  "ben-10-9505942": { en: "Gwen Tennyson", tr: "Gwen Tennyson" },
  "ben-10-9505975": { en: "Humungousaur", tr: "Insanazor" },
  "ben-10-9506350": { en: "Omnitrix", tr: "Omnitrix" },
  "ben-10-9506485": { en: "Steam Smythe", tr: "Steam Smythe" },
  "ben-10-9508016": { en: "Gwen Tennyson", tr: "Gwen Tennyson" },
  "ben-10-9508436": { en: "Charmcaster", tr: "Charmcaster" },
  "ben-10-9509044": { en: "Julie Yamamoto", tr: "Julie Yamamoto" },
  "ben-10-9509245": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9509247": { en: "Warbot", tr: "Warbot" },
  "ben-10-9510860": { en: "Wildvine", tr: "Vahsi Asma" },
  "ben-10-9511349": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9513888": { en: "Cannonbolt", tr: "Yildirim Gulle" },
  "ben-10-9514000": { en: "Wildmutt", tr: "Yaban Kopek" },
  "ben-10-9514074": { en: "AmpFibian", tr: "Amperfiyan" },
  "ben-10-9514915": { en: "Wildvine", tr: "Vahsi Asma" },
  "ben-10-9515599": { en: "Echo Echo", tr: "Eko Eko" },
  "ben-10-9517105": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9517837": { en: "Sludgepuppy", tr: "Sludgepuppy" },
  "ben-10-9519416": { en: "Four Arms", tr: "Dort Kol" },
  "ben-10-9519839": { en: "Upchuck", tr: "Kusmuk" },
  "ben-10-9520244": { en: "XLR8", tr: "Simsek Hiz" },
  "ben-10-9521031": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9521759": { en: "Steam Smythe", tr: "Steam Smythe" },
};

function getGeneratedRoot(item) {
  const sourcePath = item.sourcePath?.replaceAll("\\", "/") || "";
  const packMatch = sourcePath.match(/^public\/game-modes\/cartoon\/([^/]+)\//);
  const pack = packMatch?.[1] || DEFAULT_CARTOON_PACK;

  return `/game-modes/cartoon/${pack}/generated`;
}

function cartoon(item) {
  const { id, label, series, paintLabel, paint } = item;
  const assetRoot = getGeneratedRoot(item);
  const scenePath = `${assetRoot}/${id}-scene.webp`;
  const originalScenePath = `${assetRoot}/${id}-original.webp`;
  const maskPath = `${assetRoot}/${id}-scene-mask.png`;
  const mainLayerPath = `${assetRoot}/${id}-main-layer.png`;

  return {
    id,
    label: CARTOON_LABELS[id]?.en || label,
    labels: CARTOON_LABELS[id] || { en: label, tr: label },
    series,
    paintLabel,
    originalScenePath,
    baseScenePath: scenePath,
    scenePath,
    imagePath: scenePath,
    maskPath,
    assetPath: scenePath,
    paint,
    layers: [
      {
        id: "main",
        label: paintLabel || "main",
        sourcePath: mainLayerPath,
        maskPath,
        base: paint,
      },
    ],
  };
}

export const CARTOON_OPTIONS = CARTOON_ITEMS.map(cartoon);

export const HAS_CARTOON_OPTIONS = CARTOON_OPTIONS.length > 0;

export const DEFAULT_CARTOON_ID = CARTOON_OPTIONS[0]?.id || null;

export function getCartoonOption(cartoonId) {
  return (
    CARTOON_OPTIONS.find((cartoonOption) => cartoonOption.id === cartoonId) ||
    CARTOON_OPTIONS.find((cartoonOption) => cartoonOption.id === DEFAULT_CARTOON_ID) ||
    null
  );
}
