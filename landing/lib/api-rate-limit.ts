import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type ApiTier = "free" | "starter" | "professional" | "enterprise";

const TIER_LIMITS: Record<ApiTier, { requests: number; window: string }> = {
  free: { requests: 100, window: "1 h" },
  starter: { requests: 1000, window: "1 h" },
  professional: { requests: 1000, window: "1 h" },
  enterprise: { requests: 10000, window: "1 h" },
};

const limiters = new Map<string, Ratelimit>();

function getLimiter(tier: ApiTier): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const key = tier;
  if (limiters.has(key)) return limiters.get(key)!;

  const config = TIER_LIMITS[tier];
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(config.requests, config.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix: `api_rl_${tier}`,
    analytics: false,
  });
  limiters.set(key, limiter);
  return limiter;
}

// In-memory fallback
const memBuckets = new Map<string, { count: number; resetAt: number }>();

export async function checkApiRateLimit(
  identifier: string,
  tier: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const apiTier = (tier in TIER_LIMITS ? tier : "free") as ApiTier;
  const limiter = getLimiter(apiTier);

  if (limiter) {
    try {
      const { success, remaining, reset } = await limiter.limit(identifier);
      return { allowed: success, remaining, resetAt: reset };
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const config = TIER_LIMITS[apiTier];
  const windowMs = parseWindow(config.window);
  const now = Date.now();
  const bucket = memBuckets.get(identifier) ?? { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count++;
  memBuckets.set(identifier, bucket);

  return {
    allowed: bucket.count <= config.requests,
    remaining: Math.max(0, config.requests - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function parseWindow(window: string): number {
  const parts = window.split(" ");
  const num = parseInt(parts[0], 10);
  const unit = parts[1];
  if (unit === "h") return num * 60 * 60 * 1000;
  if (unit === "m") return num * 60 * 1000;
  return num * 1000;
}
