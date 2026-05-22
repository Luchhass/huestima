"use client";

import { useCallback, useState } from "react";

const SESSION_PREFIX = "huestima-room-session:";
const COPIED_PREFIX = "huestima-invite-copied:";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function createPlayerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getRoomSession(roomCode) {
  if (!canUseStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${roomCode}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRoomSession(roomCode, session) {
  if (!canUseStorage()) return;

  window.sessionStorage.setItem(
    `${SESSION_PREFIX}${roomCode}`,
    JSON.stringify({
      roomCode,
      playerId: session.playerId,
      playerName: session.playerName,
      isHost: Boolean(session.isHost),
      savedAt: Date.now(),
    }),
  );
}

export function clearRoomSession(roomCode) {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(`${SESSION_PREFIX}${roomCode}`);
}

export function markInviteCopied(roomCode) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(`${COPIED_PREFIX}${roomCode}`, "1");
}

export function consumeInviteCopied(roomCode) {
  if (!canUseStorage()) return false;

  const key = `${COPIED_PREFIX}${roomCode}`;
  const value = window.sessionStorage.getItem(key);
  window.sessionStorage.removeItem(key);
  return value === "1";
}

export function useRoomSession(roomCode) {
  const [session, setSession] = useState(() => getRoomSession(roomCode));

  const saveSession = useCallback(
    (nextSession) => {
      saveRoomSession(roomCode, nextSession);
      setSession(getRoomSession(roomCode));
    },
    [roomCode],
  );

  const clearSession = useCallback(() => {
    clearRoomSession(roomCode);
    setSession(null);
  }, [roomCode]);

  return {
    session,
    isLoaded: true,
    saveSession,
    clearSession,
  };
}
