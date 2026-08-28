import {
  insertGameActivity,
  readGameActivitySummary,
} from "../admin/store.js";
import { listRooms } from "../rooms/roomStore.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function playerCount(room) {
  return Array.from(room?.players?.values?.() || []).filter(
    (player) => !player.kicked,
  ).length;
}

export function recordGameActivity(room, eventType) {
  const startedAt = room?.game?.startedAt;
  if (!room?.code || !startedAt) return false;

  return insertGameActivity({
    eventId: `${room.code}:${startedAt}:${eventType}`,
    roomCode: room.code,
    eventType,
    gameFamily: room.gameFamily || "color",
    gameMode: room.gameMode || room.game?.mode || "normal",
    playerCount: room.game?.participantPlayerIds?.size || playerCount(room),
    createdAt: eventType === "started" ? startedAt : Date.now(),
  });
}

export function getSystemSummary({ activeSockets = 0, uptimeSeconds = 0 } = {}) {
  const rooms = listRooms();
  const connectedPlayerIds = new Set();
  let openLobbies = 0;
  let gamesInProgress = 0;
  let completedRooms = 0;

  for (const room of rooms) {
    if (room.status === "lobby") openLobbies += 1;
    if (room.status === "starting" || room.status === "in_game") {
      gamesInProgress += 1;
    }
    if (room.status === "completed") completedRooms += 1;

    for (const player of room.players.values()) {
      if (!player.kicked && player.connected && player.socketId) {
        connectedPlayerIds.add(player.id);
      }
    }
  }

  const activity = readGameActivitySummary(Date.now() - DAY_MS);
  const totals = activity.totals || {};

  return {
    generatedAt: Date.now(),
    uptimeSeconds: Math.max(0, Math.floor(uptimeSeconds)),
    live: {
      onlineVisitors: activeSockets,
      activePlayers: connectedPlayerIds.size,
      totalRooms: rooms.length,
      openLobbies,
      gamesInProgress,
      completedRooms,
    },
    games: {
      startedTotal: Number(totals.games_started_total || 0),
      completedTotal: Number(totals.games_completed_total || 0),
      started24h: Number(totals.games_started_recent || 0),
      completed24h: Number(totals.games_completed_recent || 0),
      averagePlayers24h: Number(
        Number(totals.average_players_recent || 0).toFixed(1),
      ),
      families24h: activity.families.map((entry) => ({
        id: entry.id,
        games: Number(entry.games),
      })),
      modes24h: activity.modes.map((entry) => ({
        id: entry.id,
        games: Number(entry.games),
      })),
      recent: activity.recent.map((entry) => ({
        roomCode: entry.roomCode,
        gameFamily: entry.gameFamily,
        gameMode: entry.gameMode,
        playerCount: Number(entry.playerCount || 0),
        createdAt: Number(entry.createdAt),
      })),
    },
  };
}
