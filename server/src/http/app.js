import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, isAllowedOrigin } from "../config/env.js";
import { countRooms } from "../rooms/roomStore.js";
import { isoNow } from "../utils/time.js";

export function createHttpApp({ getActiveSockets }) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS."));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "48kb" }));

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

  return app;
}
