import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import http from "node:http";
import { once } from "node:events";
import { registerHooks } from "node:module";
import { io as client } from "socket.io-client";
import { createSocketServer } from "../server/src/socket/index.js";
import { env } from "../server/src/config/env.js";
import * as rooms from "../server/src/rooms/roomService.js";
import { getRoom } from "../server/src/rooms/roomStore.js";
import { requestRoundTarget, requestRoundHint, submitRoundGuess, finishRushForPlayer } from "../server/src/game/gameService.js";
import { MULTIPLAYER_GAME_FAMILY_MODE_IDS } from "../shared/gameFamilyModes.mjs";
import { setGameConfiguration } from "../server/src/operations/service.js";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) return next(new URL("../src/" + specifier.slice(2) + ".js", import.meta.url).href, context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".js", context);
  return next(specifier, context);
} });
const originalTtl = env.roomTtlMs;
afterEach(() => { env.roomTtlMs = originalTtl; rooms.closeAllRooms(); setGameConfiguration({}); });
function create(mode = "normal", family = "color", extra = {}) {
  const result = rooms.createRoom({ playerId: "host", playerName: "Host", socketId: "original", gameMode: mode, gameFamily: family, roundCount: 3, ...extra });
  assert.equal(result.ok, true);
  return { result, room: getRoom(result.data.room.code), code: result.data.room.code };
}
function start(mode, family, extra) {
  const game = create(mode, family, extra);
  assert.equal(rooms.startRoomGame({ roomCode: game.code, playerId: "host" }).ok, true);
  return game;
}
function prepare(game, roundIndex = 0) {
  return requestRoundTarget(game.room, { playerId: "host", roundIndex });
}

test("public player IDs cannot be used to take over a session or bypass its password", () => {
  const { result, code, room } = create("normal", "color", { visibility: "private", password: "secret" });
  const preview = rooms.requestRoomState({ roomCode: code, socketId: "outsider" });
  assert.equal(preview.ok, true);
  assert.equal(JSON.stringify(preview).includes(result.data.sessionToken), false);
  assert.equal(rooms.requestRoomState({ roomCode: code, playerId: "host", socketId: "attacker" }).ok, false);
  assert.equal(rooms.joinRoom({ roomCode: code, playerId: "host", playerName: "Fake", socketId: "attacker" }).ok, false);
  assert.equal(room.players.get("host").socketId, "original");
  assert.equal(rooms.requestRoomState({ roomCode: code, playerId: "host", sessionToken: result.data.sessionToken, socketId: "restored" }).ok, true);
  assert.equal(room.players.get("host").socketId, "restored");
});

test("game snapshots contain neither future targets nor the generation seed", () => {
  const game = start("normal");
  const snapshot = rooms.getRoomSnapshot(game.room);
  assert.deepEqual(snapshot.game.targetColors, []);
  assert.notEqual(snapshot.game.seed, game.room.game.seed);
  assert.equal(prepare(game, 1).ok, false);
  const round = prepare(game).data.round;
  assert.ok(round.targetColor);
  assert.equal(round.targetColors, undefined);
});

test("Odd and Decoy only disclose their visible puzzle, not the answer metadata", () => {
  const odd = start("odd", "perception");
  const target = prepare(odd).data.round.targetColor;
  assert.equal(target.oddIndex, undefined);
  assert.equal(target.oddColor, undefined);
  assert.equal(target.colors.length, 6);
  const decoy = start("decoy");
  const visible = prepare(decoy).data.round.targetColor;
  assert.equal(visible.targetPosition, undefined);
  assert.ok(visible.decoy.hex);
});

test("Sequence discloses the sequence only to its active first round", () => {
  const game = start("sequence");
  assert.equal(prepare(game, 1).ok, false);
  assert.equal(prepare(game).data.round.targetColors.length, 3);
});

test("submissions require a prepared round and the full memorize phase", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 100000 });
  const game = start("normal");
  const payload = { playerId: "host", roundIndex: 0, guessColor: game.room.game.targetColors[0] };
  assert.equal(submitRoundGuess(game.room, payload).ok, false);
  prepare(game);
  assert.equal(submitRoundGuess(game.room, payload).ok, false);
  t.mock.timers.tick(5000);
  assert.equal(submitRoundGuess(game.room, payload).data.result.score, 10);
});

test("late Timed submissions score zero and re-requesting a target cannot reset the deadline", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 200000 });
  const game = start("timed");
  prepare(game);
  const ready = game.room.players.get("host").roundTiming.guessReadyAt;
  t.mock.timers.tick(10000);
  prepare(game);
  assert.equal(game.room.players.get("host").roundTiming.guessReadyAt, ready);
  const result = submitRoundGuess(game.room, { playerId: "host", roundIndex: 0, guessColor: game.room.game.targetColors[0] });
  assert.equal(result.ok, true);
  assert.equal(result.data.result.score, 0);
});

test("Rush cannot finish early and its active play budget is enforced", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 300000 });
  const game = start("rush");
  assert.equal(finishRushForPlayer(game.room, { playerId: "host" }).ok, false);
  prepare(game);
  assert.equal(finishRushForPlayer(game.room, { playerId: "host" }).ok, false);
  t.mock.timers.tick(35000);
  assert.equal(finishRushForPlayer(game.room, { playerId: "host" }).ok, true);
  assert.equal(game.room.status, "completed");
});

test("hint allowance is checked on the server and requests are idempotent", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 400000 });
  const game = start("decoy");
  prepare(game);
  assert.equal(requestRoundHint(game.room, { playerId: "host", roundIndex: 0 }).ok, false);
  t.mock.timers.tick(5000);
  const first = requestRoundHint(game.room, { playerId: "host", roundIndex: 0 });
  assert.equal(first.ok, true);
  assert.equal(first.data.hintCount, 0);
  assert.deepEqual(first.data.targetColor, game.room.game.targetColors[0]);
  assert.equal(requestRoundHint(game.room, { playerId: "host", roundIndex: 0 }).data.hintCount, 0);
  assert.equal(requestRoundHint(game.room, { playerId: "host", roundIndex: 1 }).ok, false);
});

test("disabled modes cannot be selected or started in an existing lobby", () => {
  const game = create("normal");
  setGameConfiguration({ color: { enabled: true, modes: { flash: false } } });
  assert.equal(rooms.updateRoomSettings({ roomCode: game.code, playerId: "host", gameMode: "flash" }).ok, false);
  setGameConfiguration({ color: { enabled: false } });
  assert.equal(rooms.startRoomGame({ roomCode: game.code, playerId: "host" }).ok, false);
});

test("active rooms keep their renewed expiry instead of the original timer", (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 500000 });
  env.roomTtlMs = 200;
  const game = create();
  t.mock.timers.tick(120);
  rooms.requestRoomState({ roomCode: game.code, playerId: "host", socketId: "original" });
  t.mock.timers.tick(110);
  assert.ok(getRoom(game.code));
  t.mock.timers.tick(120);
  assert.equal(getRoom(game.code), null);
});

test("a reconnected socket resumes with its token and leaving broadcasts the final scoreboard", async () => {
  const server = http.createServer();
  const io = createSocketServer(server);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = "http://127.0.0.1:" + server.address().port;
  const a = client(address, { autoConnect: false, transports: ["websocket"], reconnection: false });
  const b = client(address, { autoConnect: false, transports: ["websocket"], reconnection: false });
  const ack = (socket, event, payload) => new Promise((resolve, reject) => socket.timeout(3000).emit(event, payload, (error, response) => error ? reject(error) : resolve(response)));
  try {
    const connected = Promise.all([once(a, "connect"), once(b, "connect")]); a.connect(); b.connect(); await connected;
    const created = await ack(a, "room:create", { playerId: "socket-host", playerName: "Host", gameMode: "spot", gameFamily: "color", roundCount: 1 });
    const code = created.room.code;
    await ack(b, "room:join", { roomCode: code, playerId: "socket-guest", playerName: "Guest" });
    await ack(a, "room:startGame", { roomCode: code, playerId: "socket-host" });
    a.disconnect(); await new Promise(resolve => setTimeout(resolve, 20));
    const restored = once(a, "connect"); a.connect(); await restored;
    assert.equal((await ack(a, "room:getState", { roomCode: code, playerId: "socket-host" })).ok, false);
    assert.equal((await ack(a, "room:getState", { roomCode: code, playerId: "socket-host", sessionToken: created.sessionToken })).ok, true);
    assert.equal((await ack(a, "round:requestTarget", { roomCode: code, playerId: "socket-host", roundIndex: 0 })).ok, true);
    assert.equal((await ack(a, "game:requestPerfect", { roomCode: code, playerId: "socket-host", roundIndex: 0 })).ok, false);
    const round = await ack(b, "round:requestTarget", { roomCode: code, playerId: "socket-guest", roundIndex: 0 });
    await ack(b, "game:submitGuess", { roomCode: code, playerId: "socket-guest", roundIndex: 0, guessColor: round.round.targetColor });
    const scoreboard = once(b, "game:scoreboard");
    const left = await ack(a, "room:leave", { roomCode: code, playerId: "socket-host" });
    assert.equal(left.room.status, "completed");
    assert.ok((await scoreboard)[0].leaderboard);
    const returned = await ack(b, "room:returnToLobby", { roomCode: code, playerId: "socket-guest" });
    assert.equal(returned.room.status, "lobby");
    assert.equal(returned.room.players.length, 1);
  } finally { a.close(); b.close(); await new Promise(resolve => io.close(resolve)); }
});

test("team results and replay pools survive sharing", async () => {
  const { encodeSharedMatchEntry, decodeSharedMatchEntry } = await import("../src/lib/matchHistoryShare.js");
  const { randomTeamTargetColors } = await import("../src/lib/color.js");
  const { buildReplayMatchUrl } = await import("../src/lib/matchHistory.js");
  const target = randomTeamTargetColors(1)[0];
  const entry = { id: "team-test", gameType: "singleplayer", gameFamily: "team", gameMode: "normal", teamIds: [target.teamId], results: [{ target, guess: target, score: 10 }] };
  const restored = decodeSharedMatchEntry(encodeSharedMatchEntry(entry));
  assert.equal(restored.results[0].target.teamId, target.teamId);
  assert.deepEqual(restored.teamIds, entry.teamIds);
  globalThis.window = { location: { origin: "http://localhost:3000" } };
  try { assert.equal(new URL(buildReplayMatchUrl(restored)).searchParams.get("teams"), target.teamId); }
  finally { delete globalThis.window; }
});

test("analytics strips shared data, room codes and hashes", async () => {
  const { sanitizeAnalyticsLocation } = await import("../src/lib/analytics.js");
  assert.equal(sanitizeAnalyticsLocation("https://www.huestima.com/history?s=private-player#secret"), "https://www.huestima.com/history");
  assert.equal(sanitizeAnalyticsLocation("/color/123456?player=private"), "/color/room");
});

test("availability uses enabled families and preserves Turkish routes", async () => {
  const { getAvailableGameHref, isConfiguredGameModeEnabled } = await import("../src/lib/gameFamily.js");
  assert.equal(getAvailableGameHref({ color: { enabled: false } }, "tr"), "/tr/flag");
  assert.equal(isConfiguredGameModeEnabled({ flag: { modes: { timed: false } } }, "flag", "timed"), false);
});

test("every multiplayer family/mode supports the prepared-round submission protocol", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 600000 });
  for (const [family, modes] of Object.entries(MULTIPLAYER_GAME_FAMILY_MODE_IDS)) {
    for (const mode of modes) {
      const game = start(mode, family);
      const round = prepare(game);
      assert.equal(round.ok, true, family + "/" + mode);
      const target = game.room.game.targetColors[0];
      t.mock.timers.tick(20000);
      // Stay inside time limits after the memory/control entrance.
      game.room.players.get("host").roundTiming.guessReadyAt = Date.now();
      const result = submitRoundGuess(game.room, {
        playerId: "host", roundIndex: 0, guessColor: target,
        patternBoard: target.board?.map((_, index) => index), oddSelection: target.oddIndex,
      });
      assert.equal(result.ok, true, family + "/" + mode);
      assert.equal(result.data.result.score, mode === "odd" ? 0 : 10, family + "/" + mode);
      if (mode === "sequence") {
        const next = prepare(game, 1);
        assert.equal(next.ok, true);
        assert.deepEqual(next.data.round.targetColor, game.room.game.targetColors[1]);
        assert.equal(game.room.players.get("host").roundTiming.guessReadyAt, Date.now());
      }
      rooms.closeRoom(game.room, "test-complete", false);
    }
  }
});
