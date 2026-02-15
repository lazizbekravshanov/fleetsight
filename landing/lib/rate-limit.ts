type Bucket = {
  count: number;
  windowStartMs: number;
  lockedUntilMs: number;
};

const STORE = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  lockedUntilMs: number;
};

function nowMs() {
  return Date.now();
}

export function checkRateLimit(
  key: string,
  options: { windowMs: number; maxAttempts: number; lockMs: number }
): RateLimitResult {
  const current = nowMs();
  const bucket = STORE.get(key) ?? {
    count: 0,
    windowStartMs: current,
    lockedUntilMs: 0
  };

  if (bucket.lockedUntilMs > current) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.lockedUntilMs - current) / 1000),
      remaining: 0,
      lockedUntilMs: bucket.lockedUntilMs
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
      lockedUntilMs: bucket.lockedUntilMs
    };
  }

  STORE.set(key, bucket);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, options.maxAttempts - bucket.count),
    lockedUntilMs: 0
  };
}

export function resetRateLimit(key: string) {
  STORE.delete(key);
}

export function getRateLimitState(key: string) {
  const bucket = STORE.get(key);
  if (!bucket) {
    return { lockedUntilMs: 0, remaining: null };
  }
  const current = nowMs();
  if (bucket.lockedUntilMs > current) {
    return { lockedUntilMs: bucket.lockedUntilMs, remaining: 0 };
  }
  return { lockedUntilMs: 0, remaining: null };
}
