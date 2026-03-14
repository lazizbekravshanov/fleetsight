import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ── Types ───────────────────────────────────────────────────────── */

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  lockedUntilMs: number;
};

/* ── Redis-backed limiter (optional) ─────────────────────────────── */

let redisLimiter: Ratelimit | null = null;

function getRedisLimiter(
  maxAttempts: number,
  windowMs: number,
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!redisLimiter) {
    redisLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(maxAttempts, `${windowMs} ms`),
      analytics: false,
    });
  }
  return redisLimiter;
}

/* ── In-memory fallback ──────────────────────────────────────────── */

type Bucket = {
  count: number;
  windowStartMs: number;
  lockedUntilMs: number;
};

const STORE = new Map<string, Bucket>();

function memoryCheck(
  key: string,
  options: { windowMs: number; maxAttempts: number; lockMs: number },
): RateLimitResult {
  const current = Date.now();
  const bucket = STORE.get(key) ?? {
    count: 0,
    windowStartMs: current,
    lockedUntilMs: 0,
  };

  if (bucket.lockedUntilMs > current) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.lockedUntilMs - current) / 1000),
      remaining: 0,
      lockedUntilMs: bucket.lockedUntilMs,
    };
  }

  if (current - bucket.windowStartMs > options.windowMs) {
    bucket.count = 0;
    bucket.windowStartMs = current;
    bucket.lockedUntilMs = 0;
  }

  bucket.count += 1;

  if (bucket.count > options.maxAttempts) {
    bucket.lockedUntilMs = current + options.lockMs;
    STORE.set(key, bucket);
    return {
      allowed: false,
      retryAfterSec: Math.ceil(options.lockMs / 1000),
      remaining: 0,
      lockedUntilMs: bucket.lockedUntilMs,
    };
  }

  STORE.set(key, bucket);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, options.maxAttempts - bucket.count),
    lockedUntilMs: 0,
  };
}

/* ── Public API ──────────────────────────────────────────────────── */

export async function checkRateLimit(
  key: string,
  options: { windowMs: number; maxAttempts: number; lockMs: number },
): Promise<RateLimitResult> {
  const rl = getRedisLimiter(options.maxAttempts, options.windowMs);
  if (rl) {
    try {
      const { success, remaining, reset } = await rl.limit(key);
      return {
        allowed: success,
        retryAfterSec: success
          ? 0
          : Math.ceil((reset - Date.now()) / 1000),
        remaining,
        lockedUntilMs: success ? 0 : reset,
      };
    } catch {
      // Fall through to in-memory on Redis error
    }
  }
  return memoryCheck(key, options);
}

export function resetRateLimit(key: string) {
  STORE.delete(key);
}

export function getRateLimitState(key: string) {
  const bucket = STORE.get(key);
  if (!bucket) {
    return { lockedUntilMs: 0, remaining: null };
  }
  const current = Date.now();
  if (bucket.lockedUntilMs > current) {
    return { lockedUntilMs: bucket.lockedUntilMs, remaining: 0 };
  }
  return { lockedUntilMs: 0, remaining: null };
}
