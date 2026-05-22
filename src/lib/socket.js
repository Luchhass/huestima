"use client";

import { io } from "socket.io-client";

let socket = null;

function waitForSocketConnection(activeSocket, timeoutMs) {
  if (activeSocket.connected) {
    return Promise.resolve({ ok: true });
  }

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      activeSocket.off("connect", handleConnect);
      window.clearTimeout(timeoutId);
    };

    const finish = (result) => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve(result);
    };

    const handleConnect = () => {
      finish({ ok: true });
    };

    const timeoutId = window.setTimeout(() => {
      finish({
        ok: false,
        error: "The multiplayer server did not respond. Try again.",
      });
    }, timeoutMs);

    activeSocket.once("connect", handleConnect);
    activeSocket.connect();
  });
}

export function getSocket() {
  if (typeof window === "undefined") return null;

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export async function emitWithAck(eventName, payload = {}, timeoutMs = 8000) {
  const activeSocket = getSocket();

  if (!activeSocket) {
    return Promise.resolve({
      ok: false,
      error: "Multiplayer is unavailable in this browser.",
    });
  }

  const connection = await waitForSocketConnection(
    activeSocket,
    Math.min(timeoutMs, 5000),
  );

  if (!connection.ok) {
    return connection;
  }

  return new Promise((resolve) => {
    activeSocket.timeout(timeoutMs).emit(eventName, payload, (error, response) => {
      if (error) {
        resolve({
          ok: false,
          error: "The multiplayer server did not respond. Try again.",
        });
        return;
      }

      resolve(response || { ok: false, error: "Unexpected multiplayer response." });
    });
  });
}
