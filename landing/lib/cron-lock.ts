/**
 * Cron idempotency + heartbeat helpers.
 *
 * Vercel Cron may retry a failed invocation and, in rare cases, fire twice
 * when a deploy overlaps a cron tick. Each cron entrypoint wraps its work in
 * `withCronLock()` so a second concurrent run short-circuits instead of
 * double-sending emails or double-inserting alerts.
 *
 * Lock semantics:
 *  - SET NX EX 300  (5-minute lock, long enough for the longest cron)
 *  - If the lock cannot be acquired, return { acquired: false } — callers
 *    should return early with a 200 "skipped" so Vercel doesn't retry.
 *  - The lock is released on success AND failure so a crash doesn't keep
 *    the next run blocked for 5 minutes.
 *
 * Heartbeat semantics:
 *  - After a successful run, write the current timestamp to Redis under a
 *    known key. A separate uptime monitor can alert if any heartbeat key is
 *    older than (schedule_interval × 2).
 *
 * If Redis is not configured, both helpers degrade to a no-op: the lock is
 * always "acquired" and the heartbeat write is skipped. This matches the
 * existing fallback behavior in lib/cache.ts — we never block cron work on
 * missing Redis.
 */

import { Redis } from "@upstash/redis";
import { cacheSet } from "./cache";

const LOCK_TTL_SECONDS = 300;
const HEARTBEAT_TTL_SECONDS = 86400 * 2;

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export async function acquireCronLock(name: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return true; // Degrade gracefully — no Redis, no lock.
  try {
    const result = await r.set(`cron:lock:${name}`, "1", {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });
    return result === "OK";
  } catch {
    // If Redis errors, fail-open on the lock — cron work is more important
    // than strict de-duplication. The rare double-run is preferable to
    // silently skipping cron indefinitely during a Redis outage.
    return true;
  }
}

export async function releaseCronLock(name: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`cron:lock:${name}`);
  } catch {
    // Next run will still be free to proceed after the TTL expires.
  }
}

export async function writeCronHeartbeat(name: string): Promise<void> {
  await cacheSet(`cron:${name}:lastRun`, Date.now(), HEARTBEAT_TTL_SECONDS);
}

/**
 * Wrap a cron handler in an idempotency lock + heartbeat. On double-fire the
 * second caller gets `{ skipped: true }` and should return that as JSON.
 */
export async function withCronLock<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ skipped: true } | { skipped: false; result: T }> {
  const acquired = await acquireCronLock(name);
  if (!acquired) {
    return { skipped: true };
  }
  try {
    const result = await fn();
    await writeCronHeartbeat(name);
    return { skipped: false, result };
  } finally {
    await releaseCronLock(name);
  }
}
