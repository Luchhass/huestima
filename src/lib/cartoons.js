import { CARTOON_ITEMS } from "../../shared/cartoonCatalog.mjs";

const DEFAULT_CARTOON_PACK = "ben-10";
const CARTOON_INDEX_BY_ID = Object.fromEntries(
  CARTOON_ITEMS.map((item, index) => [item.id, index + 1]),
);
const CARTOON_LABELS = {
  "ben-10-9487993": { en: "Omnitrix", tr: "Omnitrix" },
  "ben-10-9487997": { en: "Ben Tennyson", tr: "Ben Tennyson" },
  "ben-10-9490714": { en: "Kraab", tr: "Armodrillo" },
  "ben-10-9491039": { en: "Diamondhead", tr: "Elmas Kafa" },
  "ben-10-9491338": { en: "Stinkfly", tr: "Pul Kanat" },
  "ben-10-9491363": { en: "Rustbucket", tr: "Rustbucket" },
  "ben-10-9491668": { en: "Upgrade", tr: "Guncelleme" },  
  "ben-10-9491801": { en: "Heatblast", tr: "Ates Topu" },
  "ben-10-9492625": { en: "Wilgax", tr: "Vahsi Asma" },
  "ben-10-9492707": { en: "Rojo", tr: "Darkstar" },
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
  "ben-10-9493583": { en: "Zombozo", tr: "Zombozo" },
  
  "adventure-time-123756": { en: "Fern", tr: "Fern" },
  "adventure-time-289762": { en: "Lumpy Space Princess", tr: "Yumrulu Uzay Prensesi" },
  "adventure-time-290365": { en: "Pig", tr: "Domuz" },
  "adventure-time-301579": { en: "Princess Cookie", tr: "Prenses Kurabiye" },
  "adventure-time-302996": { en: "Slime Princess", tr: "Balcik Prensesi" },
  "adventure-time-305159": { en: "Jake", tr: "Jake" },
  "adventure-time-306261": { en: "Mr. Cupcake", tr: "Bay Cupcake" },
  "adventure-time-307227": { en: "The Lich", tr: "Lich" },
  "adventure-time-308780": { en: "Lady Rainicorn", tr: "Lady Rainicorn" },
  "adventure-time-310824": { en: "Cosmic Owl", tr: "Kozmik Baykus" },
  "adventure-time-311561": { en: "Simon Petrikov", tr: "Simon Petrikov" },
  "adventure-time-312932": { en: "King of Ooo", tr: "Ooo Krali" },
  "adventure-time-313070": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-334534": { en: "Ice King", tr: "Buz Krali" },
  "adventure-time-393018": { en: "Marceline", tr: "Marceline" },
  "adventure-time-394474": { en: "Tree Trunks' House", tr: "Tree Trunks'in Evi" },
  "adventure-time-394482": { en: "BMO", tr: "BMO" },
  "adventure-time-397539": { en: "Magic Man", tr: "Sihirli Adam" },
  "adventure-time-398866": { en: "Fionna", tr: "Fionna" },
  "adventure-time-401508": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-401974": { en: "Pinata", tr: "Pinata" },
  "adventure-time-402235": { en: "Wildberry Prince", tr: "Yabanmersini Prensi" },
  "adventure-time-402643": { en: "Jake", tr: "Jake" },
  "adventure-time-403029": { en: "Jake", tr: "Jake" },
  "adventure-time-403360": { en: "Punch Bowl", tr: "Punc Kasesi" },
  "adventure-time-403364": { en: "Donut Witch", tr: "Donut Cadisi" },
  "adventure-time-403383": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-403494": { en: "Fly Fairies", tr: "Ucan Periler" },
  "adventure-time-404118": { en: "Lumpy Space Princess", tr: "Yumrulu Uzay Prensesi" },
  "adventure-time-404463": { en: "Business Men", tr: "Is Adamlari" },
  "adventure-time-405144": { en: "Donny", tr: "Donny" },
  "adventure-time-405502": { en: "Jake", tr: "Jake" },
  "adventure-time-407162": { en: "Finn", tr: "Finn" },
  "adventure-time-407207": { en: "Ice King", tr: "Buz Krali" },
  "adventure-time-408393": { en: "Starchy", tr: "Starchy" },
  "adventure-time-408743": { en: "Magic Man", tr: "Sihirli Adam" },
  "adventure-time-408812": { en: "Jake", tr: "Jake" },
  "adventure-time-410352": { en: "Tree Trunks", tr: "Tree Trunks" },
  "adventure-time-410361": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-410516": { en: "Breezy", tr: "Breezy" },
  "adventure-time-412639": { en: "Candy Kingdom", tr: "Seker Kralligi" },
  "adventure-time-412678": { en: "Lemongrab", tr: "Lemongrab" },
  "adventure-time-413391": { en: "Finn", tr: "Finn" },
  "adventure-time-414059": { en: "Cake", tr: "Cake" },
  "adventure-time-414061": { en: "Fionna", tr: "Fionna" },
  "adventure-time-414160": { en: "Uncle Gumbald", tr: "Amca Gumbald" },
  "adventure-time-416625": { en: "Flower Princess", tr: "Cicek Prensesi" },
  "adventure-time-420341": { en: "Flame Princess", tr: "Alev Prensesi" },
  "adventure-time-420372": { en: "Flame King", tr: "Alev Krali" },
  "adventure-time-9595326": { en: "Flame Princess", tr: "Alev Prensesi" },
  "adventure-time-9595379": { en: "Finn", tr: "Finn" },
  "adventure-time-9596174": { en: "Finger Person", tr: "Parmak Kisi" },
  "adventure-time-9596374": { en: "Lady Rainicorn", tr: "Lady Rainicorn" },
  "adventure-time-9597442": { en: "Finn", tr: "Finn" },
  "adventure-time-9602447": { en: "Root Beer Guy", tr: "Root Beer Guy" },
  "adventure-time-9603315": { en: "Banana Guards", tr: "Muz Muhafizlari" },
  "adventure-time-9638052": { en: "Dirt Beer Guy", tr: "Dirt Beer Guy" },
  "adventure-time-9639792": { en: "Ice King", tr: "Buz Krali" },
  "adventure-time-9640808": { en: "King Man", tr: "Kral Adam" },
  "adventure-time-9642147": { en: "Flame King Monster", tr: "Alev Krali Canavar Formu" },
  "adventure-time-9642184": { en: "Fern", tr: "Fern" },
  "adventure-time-9642262": { en: "Finn Sword", tr: "Finn'in Kilici" },
  "adventure-time-9642263": { en: "Cake", tr: "Cake" },
  "adventure-time-291301": { en: "Jake", tr: "Jake" },
  "adventure-time-292598": { en: "Jake", tr: "Jake" },
  "adventure-time-299090": { en: "Toast Princess", tr: "Tost Prensesi" },
  "adventure-time-306655": { en: "Hunson Abadeer", tr: "Hunson Abadeer" },
  "adventure-time-396014": { en: "Tree Trunks", tr: "Tree Trunks" },
  "adventure-time-405549": { en: "Rattleballs", tr: "Rattleballs" },
  "adventure-time-408369": { en: "Flame Kingdom", tr: "Alev Kralligi" },
  "adventure-time-408665": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-414331": { en: "Ice Queen", tr: "Buz Kralicesi" },
  "adventure-time-420237": { en: "Flame King", tr: "Alev Krali" },
  "adventure-time-9603515": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-9603630": { en: "Lemongrab", tr: "Lemongrab" },
  "adventure-time-9613770": { en: "Finn", tr: "Finn" },
  "adventure-time-9614888": { en: "Canyon", tr: "Canyon" },
  "adventure-time-9631061": { en: "Root Beer Guy", tr: "Root Beer Guy" },
  "adventure-time-9631149": { en: "Doctor Princess", tr: "Doktor Prenses" },
  "adventure-time-9632452": { en: "Fern", tr: "Fern" },
  "adventure-time-9632464": { en: "Shelby", tr: "Shelby" },
  "adventure-time-9632519": { en: "Party Pat", tr: "Party Pat" },
  "adventure-time-9632683": { en: "BMO", tr: "BMO" },
  "adventure-time-9632814": { en: "Betty Grof", tr: "Betty Grof" },
  "adventure-time-9638299": { en: "Huntress Wizard", tr: "Avci Buyucu" },
  "adventure-time-9641066": { en: "Y5", tr: "Y5" },
  "adventure-time-9641348": { en: "Forest Wizard", tr: "Orman Buyucusu" },
  "adventure-time-9641666": { en: "Flame Princess", tr: "Alev Prensesi" },
  "adventure-time-9641700": { en: "Betty Grof", tr: "Betty Grof" },
  "adventure-time-9641725": { en: "Princess Bubblegum", tr: "Sakiz Prenses" },
  "adventure-time-9641859": { en: "Simon Petrikov", tr: "Simon Petrikov" },
  "adventure-time-9641913": { en: "Marceline", tr: "Marceline" },
};

function toPublicUrl(filePath) {
  if (!filePath) return null;

  return filePath.startsWith("public/")
    ? `/${filePath.slice("public/".length)}`
    : filePath;
}

function getCartoonPack(item) {
  const sourcePath = item.sourcePath?.replaceAll("\\", "/") || "";
  const packMatch = sourcePath.match(/^public\/game-modes\/cartoon\/([^/]+)\//);

  return packMatch?.[1] || DEFAULT_CARTOON_PACK;
}

function getGeneratedRoot(item) {
  const pack = getCartoonPack(item);

  return `/game-modes/cartoon/${pack}/generated`;
}

function cartoon(item, index) {
  const { id, label, series, paintLabel, paint } = item;
  const assetRoot = getGeneratedRoot(item);
  const scenePath = `${assetRoot}/${id}-scene.webp`;
  const originalScenePath = `${assetRoot}/${id}-original.webp`;
  const maskPath = `${assetRoot}/${id}-scene-mask.png`;
  const mainLayerPath = `${assetRoot}/${id}-main-layer.png`;

  return {
    id,
    catalogNumber: index + 1,
    label: CARTOON_LABELS[id]?.en || label,
    labels: CARTOON_LABELS[id] || { en: label, tr: label },
    series,
    pack: getCartoonPack(item),
    paintLabel,
    sourceImagePath: toPublicUrl(item.sourcePath),
    sourceMaskPath: toPublicUrl(item.maskPath),
    sourceTitle: item.sourceTitle || null,
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

export const CARTOON_OPTIONS = CARTOON_ITEMS.map((item, index) => cartoon(item, index));

export const CARTOON_REFERENCE = CARTOON_ITEMS.map((item) => ({
  catalogNumber: CARTOON_INDEX_BY_ID[item.id],
  id: item.id,
  series: item.series,
  en: CARTOON_LABELS[item.id]?.en || item.label,
  tr: CARTOON_LABELS[item.id]?.tr || item.label,
}));

export const HAS_CARTOON_OPTIONS = CARTOON_OPTIONS.length > 0;

export const DEFAULT_CARTOON_ID = CARTOON_OPTIONS[0]?.id || null;

export function getCartoonOption(cartoonId) {
  return (
    CARTOON_OPTIONS.find((cartoonOption) => cartoonOption.id === cartoonId) ||
    CARTOON_OPTIONS.find((cartoonOption) => cartoonOption.id === DEFAULT_CARTOON_ID) ||
    null
  );
}
