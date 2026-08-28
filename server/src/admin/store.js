import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(process.env.ADMIN_SESSION_DB_PATH || "./data/admin.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id_hash TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_rate_limits (
    bucket TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_totp_steps (
    time_step INTEGER PRIMARY KEY,
    consumed_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS site_operations (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    maintenance_enabled INTEGER NOT NULL DEFAULT 0,
    multiplayer_enabled INTEGER NOT NULL DEFAULT 1,
    announcement_id TEXT,
    announcement_message TEXT,
    announcement_created_at INTEGER,
    updated_at INTEGER NOT NULL,
    game_configuration TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS game_activity (
    event_id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('started', 'completed')),
    game_family TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS game_activity_created_at_idx
    ON game_activity (created_at);
  CREATE INDEX IF NOT EXISTS game_activity_type_created_at_idx
    ON game_activity (event_type, created_at);
  INSERT OR IGNORE INTO site_operations (
    id,
    maintenance_enabled,
    multiplayer_enabled,
    updated_at
  ) VALUES (1, 0, 1, 0);
`);

try {
  database.exec("ALTER TABLE site_operations ADD COLUMN game_configuration TEXT NOT NULL DEFAULT '{}'");
} catch {}

export function createSession(idHash, now) {
  database.prepare("INSERT INTO admin_sessions VALUES (?, ?, ?)").run(idHash, now, now);
}

export function findSession(idHash, now, idleMs, absoluteMs) {
  const row = database.prepare("SELECT * FROM admin_sessions WHERE id_hash = ?").get(idHash);
  if (!row || now - row.last_seen_at > idleMs || now - row.created_at > absoluteMs) {
    if (row) database.prepare("DELETE FROM admin_sessions WHERE id_hash = ?").run(idHash);
    return false;
  }
  database.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE id_hash = ?").run(now, idHash);
  return true;
}

export function deleteSession(idHash) {
  database.prepare("DELETE FROM admin_sessions WHERE id_hash = ?").run(idHash);
}

export function cleanupExpired(now, idleMs, absoluteMs, rateWindowMs) {
  database
    .prepare("DELETE FROM admin_sessions WHERE last_seen_at < ? OR created_at < ?")
    .run(now - idleMs, now - absoluteMs);
  database
    .prepare("DELETE FROM admin_rate_limits WHERE window_started_at < ?")
    .run(now - rateWindowMs);
  database
    .prepare("DELETE FROM admin_totp_steps WHERE consumed_at < ?")
    .run(now - 2 * 60 * 1000);
}

// TOTP is intentionally one-time-use for the active 30-second time step. The
// INSERT OR IGNORE keeps this atomic when two login requests arrive together.
export function consumeTotpStep(timeStep, now) {
  const result = database
    .prepare("INSERT OR IGNORE INTO admin_totp_steps (time_step, consumed_at) VALUES (?, ?)")
    .run(timeStep, now);
  return result.changes === 1;
}

export function allowRateAttempt(bucket, now, windowMs, maxAttempts) {
  const row = database.prepare("SELECT * FROM admin_rate_limits WHERE bucket = ?").get(bucket);
  if (!row || now - row.window_started_at >= windowMs) {
    database.prepare("INSERT OR REPLACE INTO admin_rate_limits VALUES (?, ?, 1)").run(bucket, now);
    return true;
  }
  if (row.attempts >= maxAttempts) return false;
  database.prepare("UPDATE admin_rate_limits SET attempts = attempts + 1 WHERE bucket = ?").run(bucket);
  return true;
}

export function readSiteOperations() {
  return database.prepare("SELECT * FROM site_operations WHERE id = 1").get();
}

export function writeSiteOperations({
  maintenanceEnabled,
  multiplayerEnabled,
  announcementId,
  announcementMessage,
  announcementCreatedAt,
  gameConfiguration,
  updatedAt,
}) {
  database.prepare(`
    UPDATE site_operations
    SET maintenance_enabled = ?,
        multiplayer_enabled = ?,
        announcement_id = ?,
        announcement_message = ?,
        announcement_created_at = ?,
        game_configuration = ?,
        updated_at = ?
    WHERE id = 1
  `).run(
    maintenanceEnabled ? 1 : 0,
    multiplayerEnabled ? 1 : 0,
    announcementId,
    announcementMessage,
    announcementCreatedAt,
    gameConfiguration,
    updatedAt,
  );
}

export function insertGameActivity({
  eventId,
  roomCode,
  eventType,
  gameFamily,
  gameMode,
  playerCount,
  createdAt,
}) {
  const result = database.prepare(`
    INSERT OR IGNORE INTO game_activity (
      event_id,
      room_code,
      event_type,
      game_family,
      game_mode,
      player_count,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    roomCode,
    eventType,
    gameFamily,
    gameMode,
    playerCount,
    createdAt,
  );

  return result.changes === 1;
}

export function readGameActivitySummary(since) {
  const totals = database.prepare(`
    SELECT
      SUM(CASE WHEN event_type = 'started' THEN 1 ELSE 0 END) AS games_started_total,
      SUM(CASE WHEN event_type = 'completed' THEN 1 ELSE 0 END) AS games_completed_total,
      SUM(CASE WHEN event_type = 'started' AND created_at >= ? THEN 1 ELSE 0 END) AS games_started_recent,
      SUM(CASE WHEN event_type = 'completed' AND created_at >= ? THEN 1 ELSE 0 END) AS games_completed_recent,
      AVG(CASE WHEN event_type = 'started' AND created_at >= ? THEN player_count END) AS average_players_recent
    FROM game_activity
  `).get(since, since, since);

  const families = database.prepare(`
    SELECT game_family AS id, COUNT(*) AS games
    FROM game_activity
    WHERE event_type = 'started' AND created_at >= ?
    GROUP BY game_family
    ORDER BY games DESC, game_family ASC
  `).all(since);

  const modes = database.prepare(`
    SELECT game_mode AS id, COUNT(*) AS games
    FROM game_activity
    WHERE event_type = 'started' AND created_at >= ?
    GROUP BY game_mode
    ORDER BY games DESC, game_mode ASC
    LIMIT 5
  `).all(since);

  const recent = database.prepare(`
    SELECT
      room_code AS roomCode,
      game_family AS gameFamily,
      game_mode AS gameMode,
      player_count AS playerCount,
      created_at AS createdAt
    FROM game_activity
    WHERE event_type = 'started'
    ORDER BY created_at DESC
    LIMIT 8
  `).all();

  return { totals, families, modes, recent };
}
