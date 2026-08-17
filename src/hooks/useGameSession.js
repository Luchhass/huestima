"use client";

import { useCallback, useState } from "react";

const STORAGE_PREFIX = "huestima-game-session:";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function buildGameSessionKey(scope, parts = []) {
  const cleanScope = String(scope || "game").trim() || "game";
  const cleanParts = parts
    .flat()
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  return `${STORAGE_PREFIX}${cleanScope}:${cleanParts.join(":")}`;
}

export function getGameSession(key) {
  if (!canUseStorage() || !key) return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGameSession(key, session) {
  if (!canUseStorage() || !key) return;

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        ...session,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore unavailable sessionStorage or serialization issues.
  }
}

export function clearGameSession(key) {
  if (!canUseStorage() || !key) return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable sessionStorage.
  }
}

export function clearAllGameSessions() {
  if (!canUseStorage()) return;

  try {
    const keysToRemove = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);

      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      window.sessionStorage.removeItem(key);
    });
  } catch {
    // Ignore unavailable sessionStorage.
  }
}

export function useGameSession(key) {
  const [session, setSession] = useState(() => getGameSession(key));

  const persistSession = useCallback(
    (nextSession) => {
      saveGameSession(key, nextSession);
      setSession(getGameSession(key));
    },
    [key],
  );

  const deleteSession = useCallback(() => {
    clearGameSession(key);
    setSession(null);
  }, [key]);

  return {
    session,
    persistSession,
    deleteSession,
  };
}
