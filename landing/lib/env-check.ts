/**
 * Startup environment validation.
 *
 * Called once from lib/prisma.ts on cold start. Two tiers:
 *  - REQUIRED: throw in production if any are missing. The process should
 *    refuse to serve traffic rather than hit a runtime 500 on the first DB
 *    query or auth check.
 *  - RECOMMENDED: log a warning. Features degrade gracefully when these
 *    are absent (rate limiting falls back to in-memory, email sending
 *    becomes a no-op, webhooks reject, etc.), but we want operators to
 *    notice the gap in logs.
 */

const REQUIRED_SERVER_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
] as const;

const RECOMMENDED_SERVER_VARS = [
  // Auth / session
  "NEXTAUTH_URL",
  // Caching + rate limiting
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  // Cron authorization
  "CRON_SECRET",
  // Webhook signatures (fail-closed without them)
  "TMS_WEBHOOK_SECRET",
  "OPENCLAW_WEBHOOK_SECRET",
  // Transactional email
  "RESEND_API_KEY",
  // AI enrichment (narratives, anomaly explainer, search translator)
  "ANTHROPIC_API_KEY",
] as const;

let validated = false;

export function validateServerEnv(): void {
  // Only run once per process and only on the server.
  if (validated) return;
  if (typeof window !== "undefined") return;
  validated = true;

  const missingRequired = REQUIRED_SERVER_VARS.filter(
    (key) => !process.env[key]?.trim()
  );
  const missingRecommended = RECOMMENDED_SERVER_VARS.filter(
    (key) => !process.env[key]?.trim()
  );

  if (missingRequired.length > 0) {
    const msg = `[env-check] Missing REQUIRED server env vars: ${missingRequired.join(", ")}`;
    console.error(msg);
    // Fail fast in production. In dev / preview, warn loudly but let the
    // developer continue — they may be intentionally running without a DB.
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
  }

  if (missingRecommended.length > 0) {
    console.warn(
      `[env-check] Missing recommended server env vars: ${missingRecommended.join(", ")}. ` +
        "Dependent features will be disabled or fall back to in-memory behavior."
    );
  }
}
