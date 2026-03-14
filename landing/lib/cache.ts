import { Redis } from "@upstash/redis";

/* ── Redis client (lazy, optional) ───────────────────────────────── */

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/* ── In-memory fallback ──────────────────────────────────────────── */

const MEM = new Map<string, { value: string; expiresAt: number }>();

/* ── Public API ──────────────────────────────────────────────────── */

/**
 * Get a cached value. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get<T>(key);
      return val ?? null;
    } catch {
      return null;
    }
  }

  // In-memory fallback
  const entry = MEM.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) MEM.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, JSON.stringify(value), { ex: ttlSeconds });
    } catch {
      // Silently fall through to in-memory
    }
    return;
  }

  // In-memory fallback
  MEM.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Wrap an async function with caching.
 * The key builder receives the same args and returns the cache key.
 */
export function cached<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyBuilder: (...args: TArgs) => string,
  ttlSeconds: number,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyBuilder(...args);
    const hit = await cacheGet<TResult>(key);
    if (hit !== null) return hit;

    const result = await fn(...args);
    await cacheSet(key, result, ttlSeconds);
    return result;
  };
}
