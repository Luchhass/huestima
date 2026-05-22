import http from "node:http";
import { env } from "./config/env.js";
import { createHttpApp } from "./http/app.js";
import { runRoomCleanup } from "./rooms/roomService.js";
import { createSocketServer } from "./socket/index.js";
import { logger } from "./utils/logger.js";

let io = null;

const app = createHttpApp({
  getActiveSockets: () => io?.engine?.clientsCount || 0,
});
const server = http.createServer(app);
io = createSocketServer(server);

const cleanupInterval = setInterval(runRoomCleanup, 30 * 1000);
cleanupInterval.unref?.();

server.listen(env.port, () => {
  logger.info("backend listening", {
    port: env.port,
    origins: env.clientOrigins,
  });
});

function shutdown(signal) {
  logger.info("shutdown requested", { signal });
  clearInterval(cleanupInterval);

  io.close(() => {
    server.close(() => {
      logger.info("shutdown complete");
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(1), 8000).unref?.();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
