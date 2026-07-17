/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for a single-instance deployment (this app persists to a local
 * JSON file, so it is single-instance by design). For multi-instance
 * deployments swap this for a shared store (Redis/Upstash).
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodically drop stale buckets so the map cannot grow unbounded.
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Records a hit for `key` and returns whether it is within `limit`
 * requests per `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Evict oldest half to bound memory under key-spraying attacks.
      const keys = [...buckets.keys()].slice(0, Math.floor(MAX_BUCKETS / 2));
      for (const k of keys) buckets.delete(k);
    }
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0 };
}

/** Extracts a best-effort client identifier from request headers. */
export function clientIpFrom(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}

/** Test-only helper. */
export function _resetRateLimiter() {
  buckets.clear();
}
