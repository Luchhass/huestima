"use client";

import { io } from "socket.io-client";

let socket = null;

export const SOCKET_ERROR_CODES = {
  BROWSER_UNAVAILABLE: "browser_unavailable",
  SERVER_UNAVAILABLE: "server_unavailable",
  SERVER_TIMEOUT: "server_timeout",
  UNEXPECTED_RESPONSE: "unexpected_response",
};

function waitForSocketConnection(activeSocket, timeoutMs) {
  if (activeSocket.connected) {
    return Promise.resolve({ ok: true });
  }

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      activeSocket.off("connect", handleConnect);
      activeSocket.off("connect_error", handleConnectError);
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

    const handleConnectError = () => {
      finish({
        ok: false,
        errorCode: SOCKET_ERROR_CODES.SERVER_UNAVAILABLE,
        error: "Multiplayer server is unavailable right now.",
      });
    };

    const timeoutId = window.setTimeout(() => {
      finish({
        ok: false,
        errorCode: SOCKET_ERROR_CODES.SERVER_TIMEOUT,
        error: "The multiplayer server did not respond in time.",
      });
    }, timeoutMs);

    activeSocket.once("connect", handleConnect);
    activeSocket.once("connect_error", handleConnectError);
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
      errorCode: SOCKET_ERROR_CODES.BROWSER_UNAVAILABLE,
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
          errorCode: activeSocket.connected
            ? SOCKET_ERROR_CODES.SERVER_TIMEOUT
            : SOCKET_ERROR_CODES.SERVER_UNAVAILABLE,
          error: activeSocket.connected
            ? "The multiplayer server did not respond in time."
            : "Multiplayer server is unavailable right now.",
        });
        return;
      }

      resolve(
        response || {
          ok: false,
          errorCode: SOCKET_ERROR_CODES.UNEXPECTED_RESPONSE,
          error: "Unexpected multiplayer response.",
        },
      );
    });
  });
}
