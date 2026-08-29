import {
  isCartoonColor,
  isBrandColor,
  isFlagColor,
  withCartoonHex,
  withBrandHex,
  withFlagHex,
  withGradientHex,
  withHex,
} from "@/lib/color";
import { normalizeGameFamily } from "@/lib/gameFamily";

const SHARE_FORMAT_PREFIX = "v2.";

const FAMILY_CODES = { color: "c", flag: "f", cartoon: "t", brand: "b" };
const FAMILY_BY_CODE = Object.fromEntries(
  Object.entries(FAMILY_CODES).map(([family, code]) => [code, family]),
);

const MODE_CODES = {
  normal: "n",
  endless: "e",
  flash: "f",
  sequence: "s",
  timed: "t",
  gradient: "g",
  flag: "F",
  duel: "d",
};
const MODE_BY_CODE = Object.fromEntries(
  Object.entries(MODE_CODES).map(([mode, code]) => [code, mode]),
);

const DIFFICULTY_CODES = { easy: "e", normal: "n", hard: "h" };
const DIFFICULTY_BY_CODE = Object.fromEntries(
  Object.entries(DIFFICULTY_CODES).map(([difficulty, code]) => [code, difficulty]),
);

function roundScore(value) {
  return Math.round((Number(value) || 0) * 100);
}

function restoreScore(value) {
  return (Number(value) || 0) / 100;
}

function compactHsv(color) {
  return [
    Math.round(Number(color?.h) || 0),
    Math.round(Number(color?.s) || 0),
    Math.round(Number(color?.v) || 0),
  ];
}

function compactColor(color) {
  if (color?.left && color?.right) {
    return ["g", compactHsv(color.left), compactHsv(color.right)];
  }

  if (isFlagColor(color)) return ["f", color.flagId, ...compactHsv(color)];
  if (isCartoonColor(color)) return ["t", color.cartoonId, ...compactHsv(color)];
  if (isBrandColor(color)) return ["b", color.brandId, ...compactHsv(color)];

  return ["c", ...compactHsv(color)];
}

function expandColor(value) {
  if (!Array.isArray(value)) return withHex({ h: 0, s: 0, v: 0 });

  const [type, idOrHue, saturationOrLeft, valueOrRight, maybeValue] = value;

  if (type === "g") {
    return withGradientHex({
      left: {
        h: Number(idOrHue?.[0]) || 0,
        s: Number(idOrHue?.[1]) || 0,
        v: Number(idOrHue?.[2]) || 0,
      },
      right: {
        h: Number(saturationOrLeft?.[0]) || 0,
        s: Number(saturationOrLeft?.[1]) || 0,
        v: Number(saturationOrLeft?.[2]) || 0,
      },
    });
  }

  const hsv = {
    h: Number(saturationOrLeft) || 0,
    s: Number(valueOrRight) || 0,
    v: Number(maybeValue) || 0,
  };

  if (type === "f") return withFlagHex({ flagId: idOrHue, ...hsv });
  if (type === "t") return withCartoonHex({ cartoonId: idOrHue, ...hsv });
  if (type === "b") return withBrandHex({ brandId: idOrHue, ...hsv });

  return withHex({
    h: Number(idOrHue) || 0,
    s: Number(saturationOrLeft) || 0,
    v: Number(valueOrRight) || 0,
  });
}

function compactResults(results = []) {
  return results.map((result) => [
    compactColor(result?.target),
    compactColor(result?.guess),
    roundScore(result?.score),
  ]);
}

function expandResults(results = []) {
  return results.map((result, index) => ({
    round: index + 1,
    target: expandColor(result?.[0]),
    guess: expandColor(result?.[1]),
    score: restoreScore(result?.[2]),
  }));
}

function compactLeaderboard(leaderboard) {
  if (!leaderboard) return null;

  return [
    Number(leaderboard.totalRounds) || 0,
    roundScore(leaderboard.maxTotalScore),
    (leaderboard.leaderboard || []).map((row) => [
      row.playerId || "",
      row.playerName || "",
      Number(row.rank) || 0,
      roundScore(row.totalScore),
      compactResults(row.roundResults),
    ]),
  ];
}

function expandLeaderboard(value) {
  if (!Array.isArray(value)) return null;

  return {
    totalRounds: Number(value[0]) || 0,
    maxTotalScore: restoreScore(value[1]),
    leaderboard: (value[2] || []).map((row) => ({
      playerId: row?.[0] || "",
      playerName: row?.[1] || "",
      rank: Number(row?.[2]) || 0,
      totalScore: restoreScore(row?.[3]),
      roundResults: expandResults(row?.[4]),
      isCurrent: false,
    })),
  };
}

function compactEntry(entry, sharedBy) {
  return [
    entry?.id || "",
    entry?.gameType === "multiplayer" ? "m" : "s",
    FAMILY_CODES[normalizeGameFamily(entry?.gameFamily)] || FAMILY_CODES.color,
    MODE_CODES[entry?.gameMode] || MODE_CODES.normal,
    DIFFICULTY_CODES[entry?.difficulty] || DIFFICULTY_CODES.easy,
    Number(entry?.rounds) || 0,
    Number(entry?.roundCount) || 0,
    entry?.isEndlessMode ? 1 : 0,
    roundScore(entry?.totalScore),
    roundScore(entry?.averageScore),
    roundScore(entry?.maxScore),
    Math.round((Number(entry?.createdAt) || Date.now()) / 1000),
    String(sharedBy || "").trim(),
    entry?.gameType === "multiplayer"
      ? compactLeaderboard(entry?.leaderboard)
      : compactResults(entry?.results),
  ];
}

function expandEntry(value) {
  if (!Array.isArray(value)) return null;

  const [
    id,
    gameType,
    gameFamily,
    gameMode,
    difficulty,
    rounds,
    roundCount,
    isEndlessMode,
    totalScore,
    averageScore,
    maxScore,
    createdAt,
    sharedBy,
    details,
  ] = value;

  const entry = {
    id: id || "",
    gameType: gameType === "m" ? "multiplayer" : "singleplayer",
    gameFamily: FAMILY_BY_CODE[gameFamily] || "color",
    gameMode: MODE_BY_CODE[gameMode] || "normal",
    difficulty: DIFFICULTY_BY_CODE[difficulty] || "easy",
    rounds: Number(rounds) || 0,
    roundCount: Number(roundCount) || 0,
    isEndlessMode: Boolean(isEndlessMode),
    totalScore: restoreScore(totalScore),
    averageScore: restoreScore(averageScore),
    maxScore: restoreScore(maxScore),
    createdAt: (Number(createdAt) || 0) * 1000,
    sharedBy: String(sharedBy || "").trim(),
  };

  if (entry.gameType === "multiplayer") {
    entry.leaderboard = expandLeaderboard(details);
  } else {
    entry.results = expandResults(details);
  }

  return entry;
}

function bytesToBase64Url(bytes) {
  let base64 = "";

  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    const chunkSize = 8192;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }

    base64 = window.btoa(binary);
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${normalized}${padding}`, "base64").toString("binary")
      : window.atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(base64.length);

  for (let index = 0; index < base64.length; index += 1) {
    bytes[index] = base64.charCodeAt(index);
  }

  return bytes;
}

// The payload starts as encodeURIComponent(JSON), so LZW only handles ASCII bytes.
function lzwEncode(input) {
  if (!input) return [];

  const dictionary = new Map(
    Array.from({ length: 256 }, (_, index) => [String.fromCharCode(index), index]),
  );
  const output = [];
  let nextCode = 256;
  let phrase = input[0];

  for (let index = 1; index < input.length; index += 1) {
    const character = input[index];
    const combined = `${phrase}${character}`;

    if (dictionary.has(combined)) {
      phrase = combined;
      continue;
    }

    output.push(dictionary.get(phrase));
    dictionary.set(combined, nextCode);
    nextCode += 1;
    phrase = character;
  }

  output.push(dictionary.get(phrase));
  return output;
}

function lzwDecode(codes) {
  if (!codes.length) return "";

  const dictionary = new Map(
    Array.from({ length: 256 }, (_, index) => [index, String.fromCharCode(index)]),
  );
  let nextCode = 256;
  let phrase = dictionary.get(codes[0]);
  let output = phrase;

  for (let index = 1; index < codes.length; index += 1) {
    const code = codes[index];
    const entry = dictionary.get(code) || (code === nextCode ? `${phrase}${phrase[0]}` : "");

    if (!entry) throw new Error("Invalid compressed match payload");

    output += entry;
    dictionary.set(nextCode, `${phrase}${entry[0]}`);
    nextCode += 1;
    phrase = entry;
  }

  return output;
}

function encodeCompactPayload(entry, sharedBy) {
  const input = encodeURIComponent(JSON.stringify(compactEntry(entry, sharedBy)));
  const codes = lzwEncode(input);
  const bytes = new Uint8Array(codes.length * 2);

  codes.forEach((code, index) => {
    bytes[index * 2] = code >> 8;
    bytes[index * 2 + 1] = code & 0xff;
  });

  return `${SHARE_FORMAT_PREFIX}${bytesToBase64Url(bytes)}`;
}

function decodeCompactPayload(value) {
  const bytes = base64UrlToBytes(value.slice(SHARE_FORMAT_PREFIX.length));
  if (bytes.length % 2) throw new Error("Invalid compressed match payload");

  const codes = Array.from({ length: bytes.length / 2 }, (_, index) =>
    (bytes[index * 2] << 8) | bytes[index * 2 + 1],
  );

  return expandEntry(JSON.parse(decodeURIComponent(lzwDecode(codes))));
}

function decodeLegacyPayload(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return JSON.parse(Buffer.from(`${normalized}${padding}`, "base64").toString("utf8"));
}

export function encodeSharedMatchEntry(entry, sharedBy = "") {
  return encodeCompactPayload(entry, sharedBy);
}

export function decodeSharedMatchEntry(value) {
  if (!value) return null;

  try {
    const decoded = value.startsWith(SHARE_FORMAT_PREFIX)
      ? decodeCompactPayload(value)
      : decodeLegacyPayload(value);

    return decoded && typeof decoded === "object" ? decoded : null;
  } catch {
    return null;
  }
}
