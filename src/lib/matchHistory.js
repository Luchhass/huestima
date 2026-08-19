"use client";

import { encodeSharedMatchEntry } from "@/lib/matchHistoryShare";
import { serializeHintsEnabled } from "@/lib/hints";
import { getGameFamilyHref, normalizeGameFamily } from "@/lib/gameFamily";

const MATCH_HISTORY_STORAGE_KEY = "huestima-match-history";
export const MATCH_HISTORY_LIMIT = 20;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createFallbackId() {
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMatchHistoryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return createFallbackId();
}

export function readMatchHistory() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMatchHistory(entries) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      MATCH_HISTORY_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MATCH_HISTORY_LIMIT)),
    );
  } catch {
    // Ignore storage issues.
  }
}

export function upsertMatchHistoryEntry(entry) {
  if (!entry?.id) return [];

  const nextEntry = {
    ...entry,
    createdAt: entry.createdAt || Date.now(),
  };
  const currentEntries = readMatchHistory();
  const withoutDuplicate = currentEntries.filter((item) => item?.id !== nextEntry.id);
  const nextEntries = [nextEntry, ...withoutDuplicate].slice(0, MATCH_HISTORY_LIMIT);

  saveMatchHistory(nextEntries);
  return nextEntries;
}

export function removeMatchHistoryEntry(entryId) {
  if (!entryId) return [];

  const nextEntries = readMatchHistory().filter((entry) => entry?.id !== entryId);
  saveMatchHistory(nextEntries);
  return nextEntries;
}

export function getMatchHistoryEntry(entryId) {
  if (!entryId) return null;

  return readMatchHistory().find((entry) => entry?.id === entryId) || null;
}

export function buildSharedMatchUrl(entry) {
  if (typeof window === "undefined") return "";

  const encodedEntry = encodeSharedMatchEntry(entry);
  const url = new URL("/history", window.location.origin);
  url.searchParams.set("share", encodedEntry);
  url.searchParams.set("view", "detail");
  return url.toString();
}

export function buildReplayMatchUrl(entry) {
  if (typeof window === "undefined" || !entry) return "";

  const cleanFamily = normalizeGameFamily(entry.gameFamily);
  const gameType = entry.gameType === "multiplayer" ? "multiplayer" : "singleplayer";
  const url = new URL(getGameFamilyHref(cleanFamily, gameType), window.location.origin);

  if (entry.difficulty) {
    url.searchParams.set("difficulty", entry.difficulty);
  }

  if (entry.gameMode) {
    url.searchParams.set("gameMode", entry.gameMode);
  }

  if (entry.roundCount) {
    url.searchParams.set("roundCount", String(entry.roundCount));
  }

  url.searchParams.set("hints", serializeHintsEnabled(entry.hintsEnabled));
  return url.toString();
}
