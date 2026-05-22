import dotenv from "dotenv";

dotenv.config();

function parseInteger(name, fallback) {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseOrigins() {
  const raw =
    process.env.CLIENT_ORIGINS ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:3000";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInteger("PORT", 4000),
  clientOrigins: parseOrigins(),
  roomTtlMs: parseInteger("ROOM_TTL_MS", 60 * 60 * 1000),
  emptyRoomTtlMs: parseInteger("EMPTY_ROOM_TTL_MS", 2 * 60 * 1000),
  disconnectGraceMs: parseInteger("DISCONNECT_GRACE_MS", 45 * 1000),
  hostDisconnectGraceMs: parseInteger("HOST_DISCONNECT_GRACE_MS", 60 * 1000),
  maxPlayersPerRoom: parseInteger("MAX_PLAYERS_PER_ROOM", 5),
};

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  return env.clientOrigins.includes(origin);
}
