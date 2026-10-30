import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const directory = mkdtempSync(join(tmpdir(), "huestima-tests-"));
try {
  const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/*.test.mjs"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "test", ADMIN_SESSION_DB_PATH: join(directory, "admin.sqlite") },
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
