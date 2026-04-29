import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonWithPolicy } from '../../src/data-access/http';

test('fetchJsonWithPolicy returns healthy data on success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  try {
    const result = await fetchJsonWithPolicy<{ ok: boolean }>({
      url: 'https://example.test/success',
      retries: 0,
    });

    assert.equal(result.health, 'healthy');
    assert.equal(result.data.ok, true);
    assert.equal(result.warnings.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchJsonWithPolicy returns degraded fallback after failures', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network down');
  };

  try {
    const result = await fetchJsonWithPolicy<{ ok: boolean }>({
      url: 'https://example.test/fail',
      retries: 1,
      fallbackData: { ok: false },
      fallbackLabel: 'unit-test fallback',
    });

    assert.equal(result.health, 'degraded');
    assert.equal(result.data.ok, false);
    assert.ok(result.warnings.length >= 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
