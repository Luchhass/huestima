import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { verifySync } from "otplib";
import { env } from "../config/env.js";
import { allowRateAttempt, consumeTotpStep, createSession, deleteSession, findSession } from "./store.js";

const isSecureCookie = env.secureCookies;
export const ADMIN_COOKIE = isSecureCookie ? "__Host-huestima-admin" : "huestima-admin";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;

function hashSession(id) {
  return createHash("sha256").update(id).digest("hex");
}

function genericFailure() {
  return { ok: false, error: "Authentication failed." };
}

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,p=1,t=2$zhtWCNJ+Uz814fwfVL/dfw$lV4aZ2vcYApiK8RF6uG74orKyJFn1awlWlz2FEt5kpk";

export function getClientIp(request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export function allowLoginAttempt(request) {
  const now = Date.now();
  return allowRateAttempt(`ip:${getClientIp(request)}`, now, 15 * 60 * 1000, 12) &&
    allowRateAttempt("account:admin", now, 15 * 60 * 1000, 30);
}

export async function authenticate(username, password, code) {
  const configuredHash = env.adminPasswordHash || DUMMY_PASSWORD_HASH;
  const passwordOk = await argon2.verify(configuredHash, password, { type: argon2.argon2id });
  const codeResult = typeof code === "string" && /^\d{6}$/.test(code) && env.adminTotpSecret
    ? verifySync({ token: code, secret: env.adminTotpSecret })
    : { valid: false };
  if (username !== env.adminUsername || !env.adminTotpSecret || !passwordOk || !codeResult.valid) return genericFailure();
  if (!consumeTotpStep(codeResult.timeStep, Date.now())) return genericFailure();

  const sessionId = randomBytes(32).toString("base64url");
  createSession(hashSession(sessionId), Date.now());
  return { ok: true, sessionId };
}

export function requireAdmin(request, response, next) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  const sessionId = match?.[1];
  if (!sessionId || !findSession(hashSession(sessionId), Date.now(), SESSION_IDLE_MS, SESSION_ABSOLUTE_MS)) {
    response.status(401).json({ ok: false, error: "Authentication required." });
    return;
  }
  request.admin = true;
  next();
}

export function revokeSession(request) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  if (match?.[1]) deleteSession(hashSession(match[1]));
}

export function setAdminCookie(response, sessionId) {
  response.setHeader("Set-Cookie", `${ADMIN_COOKIE}=${sessionId}; Path=/; HttpOnly;${isSecureCookie ? " Secure;" : ""} SameSite=Strict; Priority=High; Max-Age=${SESSION_ABSOLUTE_MS / 1000}`);
}

export function clearAdminCookie(response) {
  response.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly;${isSecureCookie ? " Secure;" : ""} SameSite=Strict; Priority=High; Max-Age=0`);
}
