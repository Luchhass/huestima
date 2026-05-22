import { Server } from "socket.io";
import { env, isAllowedOrigin } from "../config/env.js";
import { registerSocketEvents } from "./events.js";

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS."));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  registerSocketEvents(io);

  if (env.nodeEnv !== "production") {
    io.engine.on("connection_error", (error) => {
      console.warn("[huestima:socket] connection error", error.message);
    });
  }

  return io;
}
