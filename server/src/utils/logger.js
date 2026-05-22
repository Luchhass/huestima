const LEVEL_PREFIX = {
  info: "info",
  warn: "warn",
  error: "error",
};

function write(level, message, meta) {
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `[huestima:${LEVEL_PREFIX[level]}] ${message}${payload}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};
