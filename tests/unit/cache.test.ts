import test from 'node:test';
import assert from 'node:assert/strict';

// KV_REST_API_URL is not set in tests, so cacheGet/cacheSet use the in-memory fallback.

test('cache: get returns null on cold miss', async () => {
  const { cacheGet } = await import('../../lib/cache');
  const result = await cacheGet(`test:miss:${Date.now()}`);
  assert.equal(result, null);
});

test('cache: set then get returns stored value', async () => {
  const { cacheGet, cacheSet } = await import('../../lib/cache');
  const key = `test:roundtrip:${Date.now()}`;
  await cacheSet(key, { foo: 'bar', n: 42 }, 60);
  const result = await cacheGet<{ foo: string; n: number }>(key);
  assert.ok(result !== null);
  assert.equal(result?.foo, 'bar');
  assert.equal(result?.n, 42);
});

test('cache: overwrites existing key', async () => {
  const { cacheGet, cacheSet } = await import('../../lib/cache');
  const key = `test:overwrite:${Date.now()}`;
  await cacheSet(key, 'first', 60);
  await cacheSet(key, 'second', 60);
  const result = await cacheGet<string>(key);
  assert.equal(result, 'second');
});

test('cache: del removes a key', async () => {
  const { cacheGet, cacheSet, cacheDel } = await import('../../lib/cache');
  const key = `test:del:${Date.now()}`;
  await cacheSet(key, 'value', 60);
  await cacheDel(key);
  const result = await cacheGet(key);
  assert.equal(result, null);
});

test('cache: stores complex telemetry-shaped payload', async () => {
  const { cacheGet, cacheSet } = await import('../../lib/cache');
  const key = `test:telemetry:${Date.now()}`;
  const payload = {
    status: 'live' as const,
    session: 'monaco-2026',
    timestamp: 1700000000,
    drivers: [
      { code: 'LEC', position: 1, gapToLeader: 'LEADER' },
      { code: 'SAI', position: 2, gapToLeader: '+0.3' },
    ],
  };
  await cacheSet(key, payload, 60);
  const result = await cacheGet<typeof payload>(key);
  assert.equal(result?.session, 'monaco-2026');
  assert.equal(result?.drivers.length, 2);
  assert.equal(result?.drivers[0].code, 'LEC');
});
