import { Request, Response, NextFunction } from 'express';

interface RateLimitOpts {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * In-process token bucket rate limiter. Keyed by authenticated userId when
 * available (set by authMiddleware) and falls back to req.ip otherwise. For a
 * single-instance deployment (Heroku free / Render starter) this is sufficient;
 * scaling to multiple instances would require Redis-backed counters.
 */
export function createRateLimiter(opts: RateLimitOpts) {
  const buckets = new Map<string, BucketEntry>();
  const keyOf =
    opts.keyGenerator ??
    ((req: Request) => (req.userId as string | undefined) || req.ip || 'anonymous');

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = keyOf(req);
    const now = Date.now();
    const entry = buckets.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= opts.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error: 'Too many requests, please try again later.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: retryAfter,
        });
        return;
      }
      entry.count++;
    } else {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    }
    next();
  };
}

const DEFAULT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);
const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

/** Default limiter — 60 requests per minute per authenticated user, configurable via env. */
export const apiRateLimit = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX,
});
