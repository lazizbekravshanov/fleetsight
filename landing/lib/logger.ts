/**
 * Structured server-side logger.
 *
 * All logs emit as single-line JSON so Vercel's log drain can index them.
 * Error logs are also forwarded to Sentry when SENTRY_DSN is configured — we
 * dynamically require @sentry/nextjs so this module remains safe to import
 * from edge routes (where @sentry/nextjs is a noop) and during build.
 *
 * Usage:
 *   import { logInfo, logWarn, logError } from "@/lib/logger";
 *   logError("[tms-webhook]", err, { provider: "motive" });
 */

type LogMeta = Record<string, unknown>;

interface LogEntry extends LogMeta {
  level: "debug" | "info" | "warn" | "error";
  context: string;
  message: string;
  timestamp: string;
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function buildEntry(
  level: LogEntry["level"],
  context: string,
  message: string,
  meta?: LogMeta
): LogEntry {
  return {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

export function logDebug(context: string, message: string, meta?: LogMeta) {
  if (process.env.NODE_ENV === "production") return;
  emit(buildEntry("debug", context, message, meta));
}

export function logInfo(context: string, message: string, meta?: LogMeta) {
  emit(buildEntry("info", context, message, meta));
}

export function logWarn(context: string, message: string, meta?: LogMeta) {
  emit(buildEntry("warn", context, message, meta));
}

/**
 * Log an error with full stack and forward to Sentry.
 *
 * `error` may be an Error, string, or unknown value — we normalize all three
 * so handlers can pass whatever they caught without type gymnastics.
 */
export function logError(
  context: string,
  error: unknown,
  meta?: LogMeta
): void {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  const stack = error instanceof Error ? error.stack : undefined;

  emit(buildEntry("error", context, message, { ...meta, stack }));

  // Forward to Sentry when configured. We import lazily so this file remains
  // safe in environments where Sentry isn't installed or isn't initialized.
  if (process.env.SENTRY_DSN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/nextjs") as typeof import("@sentry/nextjs");
      Sentry.captureException(error instanceof Error ? error : new Error(message), {
        tags: { context },
        extra: meta,
      });
    } catch {
      // Sentry not available — we already logged to stdout/stderr.
    }
  }
}
