function toBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

export function encodeSharedMatchEntry(entry) {
  return toBase64Url(
    JSON.stringify({
      ...entry,
      sharedAt: Date.now(),
    }),
  );
}

export function decodeSharedMatchEntry(value) {
  if (!value) return null;

  try {
    const decoded = JSON.parse(fromBase64Url(value));
    return decoded && typeof decoded === "object" ? decoded : null;
  } catch {
    return null;
  }
}
