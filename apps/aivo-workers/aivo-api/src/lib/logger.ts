type Level = "debug" | "info" | "warn" | "error";

const priorities: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
]);

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveKeys.has(key) ? "[REDACTED]" : sanitize(item, seen),
    ]),
  );
}

export function createLogger(
  minimumLevel: string,
  base: Record<string, unknown> = {},
) {
  const configured =
    minimumLevel in priorities ? (minimumLevel as Level) : "info";

  const log = (
    level: Level,
    event: string,
    data: Record<string, unknown> = {},
  ) => {
    if (priorities[level] < priorities[configured]) return;
    const payload = sanitize({
      timestamp: new Date().toISOString(),
      level,
      service: "aivo-api",
      event,
      ...base,
      ...data,
    });
    const message = JSON.stringify(payload);
    if (level === "error") console.error(message);
    else if (level === "warn") console.warn(message);
    else if (level === "debug") console.debug(message);
    else console.info(message);
  };

  return {
    debug: (event: string, data?: Record<string, unknown>) =>
      log("debug", event, data),
    info: (event: string, data?: Record<string, unknown>) =>
      log("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) =>
      log("warn", event, data),
    error: (event: string, data?: Record<string, unknown>) =>
      log("error", event, data),
  };
}
