import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface Window {
  count: number;
  resetAtMs: number;
}

const store = new Map<string, Window>();

// Prune stale entries every 5 minutes to avoid unbounded memory growth.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPruneMs = Date.now();

function prune(now: number) {
  if (now - lastPruneMs < PRUNE_INTERVAL_MS) return;
  lastPruneMs = now;
  for (const [key, win] of store) {
    if (now > win.resetAtMs) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Check whether the request IP has exceeded the rate limit.
 * Returns a 429 NextResponse when limited, undefined when allowed.
 *
 * Usage in a route handler:
 *   const limited = rateLimit(request, { limit: 20, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function rateLimit(
  request: NextRequest,
  { limit, windowMs }: RateLimitConfig
): NextResponse | undefined {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const now = Date.now();
  prune(now);

  const key = `${ip}:${request.nextUrl.pathname}`;
  const win = store.get(key);

  if (!win || now > win.resetAtMs) {
    store.set(key, { count: 1, resetAtMs: now + windowMs });
    return undefined;
  }

  win.count += 1;

  if (win.count > limit) {
    const retryAfterSec = Math.ceil((win.resetAtMs - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(win.resetAtMs / 1000)),
        },
      }
    );
  }

  return undefined;
}
