import test from 'node:test';
import assert from 'node:assert/strict';

// We test the in-memory store directly by importing the module.
// Each test uses a unique pathname so tests don't share rate-limit windows.

function makeRequest(ip: string, pathname: string): import('next/server').NextRequest {
  const url = `http://localhost${pathname}`;
  return {
    headers: { get: (k: string) => (k === 'x-forwarded-for' ? ip : null) },
    nextUrl: { pathname },
    url,
  } as unknown as import('next/server').NextRequest;
}

test('rateLimit: allows requests under the limit', async () => {
  const { rateLimit } = await import('../../lib/rateLimit');
  const pathname = `/test/under-limit-${Date.now()}`;

  for (let i = 0; i < 5; i++) {
    const result = rateLimit(makeRequest('1.2.3.4', pathname), { limit: 5, windowMs: 10_000 });
    assert.equal(result, undefined, `request ${i + 1} should be allowed`);
  }
});

test('rateLimit: blocks requests over the limit', async () => {
  const { rateLimit } = await import('../../lib/rateLimit');
  const pathname = `/test/over-limit-${Date.now()}`;

  for (let i = 0; i < 3; i++) {
    rateLimit(makeRequest('2.3.4.5', pathname), { limit: 3, windowMs: 10_000 });
  }

  const blocked = rateLimit(makeRequest('2.3.4.5', pathname), { limit: 3, windowMs: 10_000 });
  assert.ok(blocked !== undefined, 'fourth request should be blocked');
  assert.equal(blocked?.status, 429);
});

test('rateLimit: different IPs have independent windows', async () => {
  const { rateLimit } = await import('../../lib/rateLimit');
  const pathname = `/test/separate-ips-${Date.now()}`;

  // Exhaust limit for IP A
  for (let i = 0; i < 2; i++) {
    rateLimit(makeRequest('10.0.0.1', pathname), { limit: 2, windowMs: 10_000 });
  }
  const blockedA = rateLimit(makeRequest('10.0.0.1', pathname), { limit: 2, windowMs: 10_000 });
  assert.ok(blockedA !== undefined, 'IP A should be blocked');

  // IP B should still be allowed
  const allowedB = rateLimit(makeRequest('10.0.0.2', pathname), { limit: 2, windowMs: 10_000 });
  assert.equal(allowedB, undefined, 'IP B should be allowed');
});

test('rateLimit: 429 response includes Retry-After header', async () => {
  const { rateLimit } = await import('../../lib/rateLimit');
  const pathname = `/test/retry-after-${Date.now()}`;

  rateLimit(makeRequest('3.4.5.6', pathname), { limit: 1, windowMs: 60_000 });
  const blocked = rateLimit(makeRequest('3.4.5.6', pathname), { limit: 1, windowMs: 60_000 });

  assert.ok(blocked !== undefined);
  const retryAfter = blocked?.headers.get('Retry-After');
  assert.ok(retryAfter !== null && Number(retryAfter) > 0, 'Retry-After should be positive');
});

test('rateLimit: uses x-real-ip when x-forwarded-for absent', async () => {
  const { rateLimit } = await import('../../lib/rateLimit');
  const pathname = `/test/real-ip-${Date.now()}`;

  const req = {
    headers: { get: (k: string) => k === 'x-real-ip' ? '7.8.9.0' : null },
    nextUrl: { pathname },
  } as unknown as import('next/server').NextRequest;

  const result = rateLimit(req, { limit: 5, windowMs: 10_000 });
  assert.equal(result, undefined, 'should be allowed on first request');
});
