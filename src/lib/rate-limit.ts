import 'server-only';
import { HttpError } from './http';

// Fixed-window rate limiter for auth endpoints (brute force / email spam). In-memory, so it is per server
// instance — enough for a single server; use a shared store (e.g. Redis) when running several.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'local').trim();
}

// Off in local development (every request shares one "IP", so a few typos would lock you out).
// Set RATE_LIMIT_DEV=1 to test the limits locally.
const enabled = () => process.env.NODE_ENV === 'production' || process.env.RATE_LIMIT_DEV === '1';

export function rateLimit(key: string, max: number, windowMs: number) {
  if (!enabled()) return;
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (++b.count > max) {
    const mins = Math.ceil((b.resetAt - now) / 60_000);
    throw new HttpError(429, `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }
}
