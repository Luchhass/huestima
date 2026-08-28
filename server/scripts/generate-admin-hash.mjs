import argon2 from "argon2";
import { generateSecret } from "otplib";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: node scripts/generate-admin-hash.mjs <password>");
  process.exit(1);
}

console.log(`ADMIN_PASSWORD_HASH=${await argon2.hash(password, { type: argon2.argon2id })}`);
console.log(`ADMIN_TOTP_SECRET=${generateSecret()}`);
