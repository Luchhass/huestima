import { randomUUID } from "node:crypto";
import {
  readSiteOperations,
  writeSiteOperations,
} from "../admin/store.js";

function normalizeRow(row) {
  let gameConfiguration = {};
  try {
    gameConfiguration = JSON.parse(row?.game_configuration || "{}");
  } catch {}

  return {
    maintenanceEnabled: Boolean(row?.maintenance_enabled),
    multiplayerEnabled: row?.multiplayer_enabled !== 0,
    announcement:
      row?.announcement_id && row?.announcement_message
        ? {
            id: row.announcement_id,
            message: row.announcement_message,
            createdAt: row.announcement_created_at,
          }
        : null,
    updatedAt: row?.updated_at || 0,
    gameConfiguration,
  };
}

let cachedState = normalizeRow(readSiteOperations());

export function getSiteOperations() {
  return cachedState;
}

function persistOperations(nextState) {
  writeSiteOperations({
    maintenanceEnabled: nextState.maintenanceEnabled,
    multiplayerEnabled: nextState.multiplayerEnabled,
    announcementId: nextState.announcement?.id || null,
    announcementMessage: nextState.announcement?.message || null,
    announcementCreatedAt: nextState.announcement?.createdAt || null,
    gameConfiguration: JSON.stringify(nextState.gameConfiguration || {}),
    updatedAt: nextState.updatedAt,
  });

  cachedState = nextState;
  return nextState;
}

export function setGameConfiguration(gameConfiguration) {
  const current = getSiteOperations();
  return persistOperations({
    ...current,
    gameConfiguration,
    updatedAt: Date.now(),
  });
}

export function setAnnouncement(message) {
  const current = getSiteOperations();
  const cleanMessage = typeof message === "string" ? message.trim() : "";
  const now = Date.now();

  return persistOperations({
    ...current,
    announcement: cleanMessage
      ? {
          id: randomUUID(),
          message: cleanMessage,
          createdAt: now,
        }
      : null,
    updatedAt: now,
  });
}

export function setMultiplayerEnabled(enabled) {
  const current = getSiteOperations();
  const now = Date.now();

  return persistOperations({
    ...current,
    multiplayerEnabled: Boolean(enabled),
    updatedAt: now,
  });
}

export function setMaintenanceEnabled(enabled) {
  const current = getSiteOperations();
  const now = Date.now();

  return persistOperations({
    ...current,
    maintenanceEnabled: Boolean(enabled),
    updatedAt: now,
  });
}

export function isMultiplayerAvailable() {
  const state = getSiteOperations();
  return state.multiplayerEnabled && !state.maintenanceEnabled;
}
