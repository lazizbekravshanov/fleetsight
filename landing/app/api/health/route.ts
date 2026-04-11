import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — uptime monitor endpoint.
 *
 * Returns 200 if the database is reachable, 503 otherwise. Redis is best-effort
 * — the site continues to function (with degraded caching / rate limiting) if
 * Redis is down, so a Redis failure does not fail the health check.
 *
 * Uptime monitors (Better Uptime, UptimeRobot, Vercel) should hit this every
 * 60s. Keep the work minimal so we don't add meaningful load per check.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, boolean> = {};

  try {
    // Lightweight query — does not scan data, just confirms Prisma + pool work.
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (err) {
    console.error("[health] database check failed:", err);
    checks.database = false;
  }

  try {
    const pingKey = "health:ping";
    await cacheSet(pingKey, "pong", 60);
    const pong = await cacheGet<string>(pingKey);
    checks.redis = pong === "pong";
  } catch {
    // Cache layer has its own in-memory fallback, so this branch is cosmetic;
    // we still report it so operators can notice Upstash outages.
    checks.redis = false;
  }

  const healthy = checks.database; // DB is the only hard requirement.
  const duration_ms = Date.now() - start;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      duration_ms,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
