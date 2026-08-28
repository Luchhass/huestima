import express from "express";
import { authenticate, clearAdminCookie, getClientIp, allowLoginAttempt, requireAdmin, revokeSession, setAdminCookie } from "./auth.js";
import { env, isAllowedOrigin } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { closeAllRooms } from "../rooms/roomService.js";
import {
  getSiteOperations,
  setAnnouncement,
  setMaintenanceEnabled,
  setMultiplayerEnabled,
  setGameConfiguration,
} from "../operations/service.js";
import { getSystemSummary } from "../operations/metrics.js";

const loginSchema = express.json({ limit: "2kb", strict: true, type: "application/json" });
const operationsSchema = express.json({ limit: "4kb", strict: true, type: "application/json" });

export default function createAdminRouter({ getIo, getActiveSockets }) {
const router = express.Router();

router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

function originGuard(request, response, next) {
  if (isAllowedOrigin(request.get("origin")) && request.get("x-admin-request") === "1") {
    next();
    return;
  }
  response.status(403).json({ ok: false, error: "Request rejected." });
}

router.use(originGuard);
router.post("/login", loginSchema, async (request, response) => {
  const body = request.body;
  if (!body || Array.isArray(body) || Object.keys(body).some((key) => !["username", "password", "code"].includes(key)) ||
      typeof body.username !== "string" || typeof body.password !== "string" || typeof body.code !== "string" ||
      body.username.length > 128 || body.password.length > 1024 || body.code.length !== 6) {
    response.status(400).json({ ok: false, error: "Invalid request." });
    return;
  }
  if (!allowLoginAttempt(request)) {
    response.setHeader("Retry-After", "900");
    response.status(429).json({ ok: false, error: "Too many attempts. Try again later." });
    return;
  }
  try {
    const result = await authenticate(body.username, body.password, body.code);
    if (!result.ok) {
      logger.warn("admin login failed", { ip: getClientIp(request) });
      response.status(401).json(result);
      return;
    }
    setAdminCookie(response, result.sessionId);
    logger.info("admin login succeeded", { ip: getClientIp(request) });
    response.json({ ok: true });
  } catch {
    response.status(401).json({ ok: false, error: "Authentication failed." });
  }
});

router.get("/me", requireAdmin, (request, response) => {
  response.json({ ok: true, admin: true });
});

router.post("/logout", express.json({ limit: "1kb", strict: true }), requireAdmin, (request, response) => {
  revokeSession(request);
  clearAdminCookie(response);
  logger.info("admin logout", { ip: getClientIp(request) });
  response.json({ ok: true });
});

router.get("/operations", requireAdmin, (_request, response) => {
  response.json({ ok: true, operations: getSiteOperations() });
});

router.post("/operations/game-configuration", operationsSchema, requireAdmin, (request, response) => {
  const configuration = request.body?.configuration;
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    response.status(400).json({ ok: false, error: "Invalid game configuration." });
    return;
  }

  const allowedFamilies = ["color", "flag", "cartoon", "brand", "team"];
  const cleanConfiguration = {};
  for (const family of allowedFamilies) {
    const source = configuration[family];
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      response.status(400).json({ ok: false, error: "Invalid game configuration." });
      return;
    }
    const modes = source.modes;
    if (!modes || typeof modes !== "object" || Array.isArray(modes)) {
      response.status(400).json({ ok: false, error: "Invalid game modes." });
      return;
    }
    cleanConfiguration[family] = {
      enabled: source.enabled === true,
      modes: Object.fromEntries(
        Object.entries(modes).map(([mode, enabled]) => [mode, enabled === true]),
      ),
    };
  }

  const operations = setGameConfiguration(cleanConfiguration);
  getIo()?.emit("operations:state", operations);
  logger.info("admin game configuration updated", { ip: getClientIp(request) });
  response.json({ ok: true, operations });
});

router.get("/system-summary", requireAdmin, (_request, response) => {
  response.json({
    ok: true,
    summary: getSystemSummary({
      activeSockets: getActiveSockets(),
      uptimeSeconds: process.uptime(),
    }),
  });
});

router.post("/operations/announcement", operationsSchema, requireAdmin, (request, response) => {
  const message = request.body?.message;
  if (typeof message !== "string" || message.length > 280) {
    response.status(400).json({ ok: false, error: "Announcement must be 280 characters or fewer." });
    return;
  }

  const operations = setAnnouncement(message);
  const io = getIo();
  io?.emit("operations:state", operations);
  if (operations.announcement) {
    io?.emit("operations:announcement", operations.announcement);
  }
  logger.info("admin announcement updated", {
    ip: getClientIp(request),
    active: Boolean(operations.announcement),
  });
  response.json({ ok: true, operations });
});

router.post("/operations/multiplayer", operationsSchema, requireAdmin, (request, response) => {
  const enabled = request.body?.enabled;
  if (typeof enabled !== "boolean") {
    response.status(400).json({ ok: false, error: "Invalid multiplayer state." });
    return;
  }

  const closedRooms = enabled ? 0 : closeAllRooms("multiplayer-disabled");
  const operations = setMultiplayerEnabled(enabled);
  getIo()?.emit("operations:state", operations);
  logger.info("admin multiplayer state changed", {
    ip: getClientIp(request),
    enabled,
    closedRooms,
  });
  response.json({ ok: true, operations, closedRooms });
});

router.post("/operations/maintenance", operationsSchema, requireAdmin, (request, response) => {
  const enabled = request.body?.enabled;
  if (typeof enabled !== "boolean") {
    response.status(400).json({ ok: false, error: "Invalid maintenance state." });
    return;
  }

  const closedRooms = enabled ? closeAllRooms("maintenance") : 0;
  const operations = setMaintenanceEnabled(enabled);
  getIo()?.emit("operations:state", operations);
  logger.info("admin maintenance state changed", {
    ip: getClientIp(request),
    enabled,
    closedRooms,
  });
  response.json({ ok: true, operations, closedRooms });
});

return router;
}
