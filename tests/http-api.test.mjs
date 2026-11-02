import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import { createHttpApp } from "../server/src/http/app.js";
import { env } from "../server/src/config/env.js";
import { GAME_FAMILY_MODE_IDS } from "../shared/gameFamilyModes.mjs";
import { getSiteOperations, setGameConfiguration, setMaintenanceEnabled, setMultiplayerEnabled } from "../server/src/operations/service.js";

const require = createRequire(new URL("../server/package.json", import.meta.url));
const argon2 = require("argon2");
const { generateSync } = require("otplib");

test("HTTP APIs validate requests, protect admin operations and complete the authenticated lifecycle", async (t) => {
  // The test runner supplies a temporary database; never modify a running site's state.
  assert.ok(process.env.ADMIN_SESSION_DB_PATH);
  const previous = { username: env.adminUsername, hash: env.adminPasswordHash, secret: env.adminTotpSecret };
  const initialOperations = structuredClone(getSiteOperations());
  env.adminUsername = "api-test-admin";
  env.adminPasswordHash = await argon2.hash("api-test-password", { type: argon2.argon2id });
  env.adminTotpSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
  const events = [];
  const server = http.createServer(createHttpApp({ getActiveSockets: () => 0, getIo: () => ({ emit: (...args) => events.push(args) }) }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const origin = env.clientOrigins[0];
  let cookie = "";
  async function request(path, { method = "GET", body, headers = {}, admin = false } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(admin ? { origin, "x-admin-request": "1", cookie } : {}), ...headers },
      ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
    });
    assert.match(response.headers.get("content-type"), /application\/json/);
    return { status: response.status, headers: response.headers, data: await response.json() };
  }
  try {
    await t.test("public health, operations, CORS and HTTP error responses", async () => {
      for (const path of ["/", "/health", "/api/operations"]) {
        const result = await request(path, { headers: { origin } });
        assert.equal(result.status, 200);
        assert.equal(result.data.ok, true);
        assert.equal(result.headers.get("access-control-allow-origin"), origin);
        assert.equal(result.headers.get("x-powered-by"), null);
      }
      const operations = await request("/api/operations");
      assert.equal(operations.headers.get("cache-control"), "no-store");
      assert.ok(Array.isArray(operations.data.announcements));
      assert.equal((await request("/missing")).status, 404);
      assert.equal((await request("/missing", { method: "POST", body: "{" })).status, 400);
      assert.equal((await request("/missing", { method: "POST", body: { text: "x".repeat(50000) } })).status, 413);
    });
    await t.test("every admin operation rejects missing authentication and foreign origins", async () => {
      const paths = [["GET", "/me"], ["GET", "/operations"], ["GET", "/system-summary"], ...["/logout", "/operations/game-configuration", "/operations/announcement", "/operations/announcement/delete", "/operations/multiplayer", "/operations/maintenance"].map(path => ["POST", path])];
      for (const [method, path] of paths) {
        const options = { method, ...(method === "POST" ? { body: {} } : {}) };
        assert.equal((await request("/api/admin" + path, options)).status, 403, path);
        assert.equal((await request("/api/admin" + path, { ...options, admin: true })).status, 401, path);
        assert.equal((await request("/api/admin" + path, { ...options, admin: true, headers: { origin: "https://invalid.example" } })).status, 403, path);
      }
    });
    await t.test("login validates payloads, issues a private cookie and rejects reused TOTP", async () => {
      const login = { username: env.adminUsername, password: "api-test-password", code: generateSync({ secret: env.adminTotpSecret }) };
      assert.equal((await request("/api/admin/login", { method: "POST", admin: true, body: { ...login, extra: true } })).status, 400);
      assert.equal((await request("/api/admin/login", { method: "POST", admin: true, body: "{" })).status, 400);
      assert.equal((await request("/api/admin/login", { method: "POST", admin: true, body: { text: "x".repeat(2500) } })).status, 413);
      assert.equal((await request("/api/admin/login", { method: "POST", admin: true, body: { ...login, password: "wrong" } })).status, 401);
      const result = await request("/api/admin/login", { method: "POST", admin: true, body: login });
      assert.equal(result.status, 200);
      assert.match(result.headers.get("set-cookie"), /HttpOnly/);
      assert.match(result.headers.get("set-cookie"), /SameSite=Strict/);
      cookie = result.headers.get("set-cookie").split(";")[0];
      assert.equal((await request("/api/admin/me", { admin: true })).data.admin, true);
      assert.equal((await request("/api/admin/login", { method: "POST", admin: true, body: login })).status, 401);
    });
    await t.test("game configuration includes Pokémon and persists to the public API", async () => {
      const configuration = Object.fromEntries(Object.entries(GAME_FAMILY_MODE_IDS).map(([family, modes]) => [family, { enabled: true, modes: Object.fromEntries(modes.map(mode => [mode, true])) }]));
      assert.equal((await request("/api/admin/operations/game-configuration", { method: "POST", admin: true, body: { configuration: {} } })).status, 400);
      const saved = await request("/api/admin/operations/game-configuration", { method: "POST", admin: true, body: { configuration } });
      assert.equal(saved.status, 200);
      assert.equal(saved.data.operations.gameConfiguration.pokemon.enabled, true);
      assert.deepEqual((await request("/api/operations")).data.operations.gameConfiguration, configuration);
      assert.equal((await request("/api/admin/operations", { admin: true })).status, 200);
      assert.equal((await request("/api/admin/system-summary", { admin: true })).status, 200);
    });
    await t.test("announcements validate, publish and delete successfully", async () => {
      const options = { method: "POST", admin: true };
      assert.equal((await request("/api/admin/operations/announcement", { ...options, body: { message: "x".repeat(281) } })).status, 400);
      const saved = await request("/api/admin/operations/announcement", { ...options, body: { message: "API verification" } });
      assert.equal(saved.status, 200);
      const id = saved.data.operations.announcement.id;
      assert.ok((await request("/api/operations")).data.announcements.some(item => item.id === id));
      assert.equal((await request("/api/admin/operations/announcement/delete", { ...options, body: {} })).status, 400);
      assert.equal((await request("/api/admin/operations/announcement/delete", { ...options, body: { id } })).status, 200);
      assert.equal((await request("/api/operations")).data.announcements.some(item => item.id === id), false);
    });
    await t.test("maintenance and multiplayer validate booleans and broadcast updates", async () => {
      for (const operation of ["maintenance", "multiplayer"]) {
        assert.equal((await request(`/api/admin/operations/${operation}`, { method: "POST", admin: true, body: { enabled: "true" } })).status, 400);
        for (const enabled of [true, false]) {
          const result = await request(`/api/admin/operations/${operation}`, { method: "POST", admin: true, body: { enabled } });
          assert.equal(result.status, 200);
          assert.equal(result.data.operations[operation + "Enabled"], enabled);
        }
      }
      assert.ok(events.some(([name]) => name === "operations:state"));
      assert.ok(events.some(([name]) => name === "operations:announcement"));
      assert.ok(events.some(([name]) => name === "operations:announcement-deleted"));
    });
    await t.test("logout revokes the session and login attempts are rate limited", async () => {
      const result = await request("/api/admin/logout", { method: "POST", admin: true, body: {} });
      assert.equal(result.status, 200);
      assert.match(result.headers.get("set-cookie"), /Max-Age=0/);
      assert.equal((await request("/api/admin/me", { admin: true })).status, 401);
      let limited;
      for (let attempt = 0; attempt < 13; attempt++) {
        limited = await request("/api/admin/login", { method: "POST", admin: true, body: { username: "wrong", password: "wrong", code: "000000" } });
        if (limited.status === 429) break;
      }
      assert.equal(limited.status, 429);
      assert.equal(limited.headers.get("retry-after"), "900");
    });
  } finally {
    setGameConfiguration(initialOperations.gameConfiguration);
    setMaintenanceEnabled(initialOperations.maintenanceEnabled);
    setMultiplayerEnabled(initialOperations.multiplayerEnabled);
    env.adminUsername = previous.username;
    env.adminPasswordHash = previous.hash;
    env.adminTotpSecret = previous.secret;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
