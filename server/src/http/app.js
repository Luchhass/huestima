import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, isAllowedOrigin } from "../config/env.js";
import { countRooms } from "../rooms/roomStore.js";
import { isoNow } from "../utils/time.js";
import createAdminRouter from "../admin/router.js";
import { logger } from "../utils/logger.js";
import { getSiteOperations } from "../operations/service.js";

export function createHttpApp({ getActiveSockets, getIo }) {
  const app = express();

  app.set("trust proxy", env.trustProxyHops);
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        // Let the request reach the route-level origin guard so rejected API
        // calls receive the same JSON response instead of Express' HTML 500.
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use("/api/admin", createAdminRouter({ getIo, getActiveSockets }));
  app.use(express.json({ limit: "48kb" }));

  app.get("/api/operations", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({ ok: true, operations: getSiteOperations() });
  });

  app.get("/", (request, response) => {
    response.json({
      ok: true,
      service: "huestima-backend",
      environment: env.nodeEnv,
    });
  });

  app.get("/health", (request, response) => {
    response.json({
      ok: true,
      uptime: process.uptime(),
      rooms: countRooms(),
      activeSockets: getActiveSockets(),
      timestamp: isoNow(),
    });
  });

  app.use((request, response) => {
    response.status(404).json({ ok: false, error: "Not found." });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const status = error?.type === "entity.too.large"
      ? 413
      : Number.isInteger(error?.status) && error.status >= 400 && error.status < 500
        ? error.status
        : 500;
    logger.warn("http request rejected", {
      method: request.method,
      path: request.path,
      status,
      reason: error?.type || "request-error",
    });
    response.status(status).json({
      ok: false,
      error:
        status === 413
          ? "Request too large."
          : status < 500
            ? "Invalid request."
            : "Request failed.",
    });
  });

  return app;
}
