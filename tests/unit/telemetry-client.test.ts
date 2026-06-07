import test from 'node:test';
import assert from 'node:assert/strict';
import { getLiveDashboardData } from '../../src/data-access/telemetryClient';
import { telemetryResponseSchema } from '../../src/data-access/schemas';

// ─── Schema parsing ──────────────────────────────────────────────────────────

test('telemetryResponseSchema: parses minimal live payload', () => {
  const raw = {
    status: 'live',
    session: 'bahrain-2026',
    timestamp: 1700000000,
    drivers: [
      { code: 'VER', name: 'Max Verstappen', team: 'Red Bull Racing', color: '3671C6', position: 1, lap: 22, lapTime: 82.456, gapToLeader: 'LEADER' },
      { code: 'NOR', name: 'Lando Norris', team: 'McLaren', color: 'FF8000', position: 2, lap: 22, lapTime: 82.891, gapToLeader: '+0.435' },
    ],
  };
  const parsed = telemetryResponseSchema.parse(raw);
  assert.equal(parsed.status, 'live');
  assert.equal(parsed.drivers.length, 2);
  assert.equal(parsed.drivers[0].code, 'VER');
});

test('telemetryResponseSchema: applies defaults for missing fields', () => {
  const parsed = telemetryResponseSchema.parse({});
  assert.equal(parsed.session, 'no-live-session');
  assert.deepEqual(parsed.drivers, []);
  assert.ok(typeof parsed.timestamp === 'number');
});

test('telemetryResponseSchema: strips unknown fields', () => {
  const parsed = telemetryResponseSchema.parse({ session: 'test', __unknown: 'drop-me' });
  assert.ok(!('__unknown' in parsed));
});

test('telemetryResponseSchema: parses no_live payload with next_session', () => {
  const raw = {
    status: 'no_live',
    session: 'no-live-session',
    timestamp: 1700000000,
    drivers: [],
    next_session: {
      session_key: 9999,
      session_name: 'Miami Grand Prix',
      session_type: 'Race',
      country_name: 'United States',
      location: 'Miami',
      circuit_short_name: 'Miami',
      date_start: '2026-05-04T19:00:00Z',
      date_end: '2026-05-04T21:00:00Z',
    },
  };
  const parsed = telemetryResponseSchema.parse(raw);
  assert.equal(parsed.status, 'no_live');
  assert.equal(parsed.next_session?.session_key, 9999);
  assert.equal(parsed.next_session?.session_name, 'Miami Grand Prix');
});

test('telemetryResponseSchema: handles null values in driver fields', () => {
  const raw = {
    session: 's',
    timestamp: 1,
    drivers: [{ code: 'HAM', position: null, lapTime: null, gapToLeader: null }],
  };
  const parsed = telemetryResponseSchema.parse(raw);
  assert.equal(parsed.drivers[0].position, null);
  assert.equal(parsed.drivers[0].lapTime, null);
});

// ─── getLiveDashboardData: happy path ────────────────────────────────────────

test('getLiveDashboardData: returns healthy dashboard on success', async () => {
  const originalFetch = globalThis.fetch;

  const livePayload = {
    status: 'live',
    session: 'monaco-2026',
    timestamp: Math.floor(Date.now() / 1000),
    drivers: [
      { code: 'LEC', name: 'Charles Leclerc', team: 'Ferrari', color: 'E8002D', position: 1, lap: 45, lapTime: 75.123, gapToLeader: 'LEADER', compound: 'SOFT', intervalGap: null },
      { code: 'SAI', name: 'Carlos Sainz', team: 'Ferrari', color: 'E8002D', position: 2, lap: 45, lapTime: 75.456, gapToLeader: '+0.333', compound: 'MEDIUM', intervalGap: '+0.333' },
    ],
    warnings: [],
  };

  globalThis.fetch = async () =>
    new Response(JSON.stringify(livePayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  try {
    const dashboard = await getLiveDashboardData();
    assert.equal(dashboard.live_status, 'LIVE');
    assert.equal(dashboard.leaderboard.length, 2);
    assert.equal(dashboard.leaderboard[0].name_acronym, 'LEC');
    assert.equal(dashboard.leaderboard[0].gap_to_leader, 'LEADER');
    assert.equal(dashboard.leaderboard[1].gap_to_leader, '+0.333');
    assert.equal(dashboard.leaderboard[0].tyre, 'SOFT');
    assert.equal(dashboard.leaderboard[1].tyre, 'MEDIUM');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getLiveDashboardData: returns no_race dashboard when status is no_live', async () => {
  const originalFetch = globalThis.fetch;

  const noLivePayload = {
    status: 'no_live',
    session: 'no-live-session',
    timestamp: Math.floor(Date.now() / 1000),
    drivers: [],
    next_session: {
      session_key: 11111,
      session_name: 'Canadian Grand Prix',
      session_type: 'Race',
      country_name: 'Canada',
      location: 'Montreal',
      circuit_short_name: 'Canada',
      date_start: '2026-06-15T18:00:00Z',
      date_end: null,
    },
  };

  globalThis.fetch = async () =>
    new Response(JSON.stringify(noLivePayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  try {
    const dashboard = await getLiveDashboardData();
    assert.equal(dashboard.live_status, 'NO_RACE');
    assert.equal(dashboard.leaderboard.length, 0);
    assert.equal(dashboard.next_session?.session_name, 'Canadian Grand Prix');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getLiveDashboardData: returns offline fallback when fetch throws', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => { throw new Error('network error'); };

  try {
    const dashboard = await getLiveDashboardData();
    // Should fall back gracefully without throwing
    assert.ok(dashboard.leaderboard !== undefined);
    assert.ok(dashboard.live_status === 'NO_RACE' || dashboard.live_status === 'LIVE');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getLiveDashboardData: normalises compound names', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      status: 'live',
      session: 'test',
      timestamp: 1,
      drivers: [
        { code: 'VER', position: 1, compound: 'SUPERSOFT' },
        { code: 'NOR', position: 2, compound: 'Mediums' },
        { code: 'HAM', position: 3, compound: 'hard' },
        { code: 'ALO', position: 4, compound: 'intermediate' },
        { code: 'RUS', position: 5, compound: 'WET_EXTREME' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const dashboard = await getLiveDashboardData();
    const tyreMap = Object.fromEntries(dashboard.leaderboard.map((d) => [d.name_acronym, d.tyre]));
    assert.equal(tyreMap['VER'], 'SOFT');
    assert.equal(tyreMap['NOR'], 'MEDIUM');
    assert.equal(tyreMap['HAM'], 'HARD');
    assert.equal(tyreMap['ALO'], 'INTER');
    assert.equal(tyreMap['RUS'], 'WET');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getLiveDashboardData: sorts leaderboard by position', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      status: 'live',
      session: 'test',
      timestamp: 1,
      drivers: [
        { code: 'C', position: 3 },
        { code: 'A', position: 1 },
        { code: 'B', position: 2 },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const dashboard = await getLiveDashboardData();
    const acronyms = dashboard.leaderboard.map((d) => d.name_acronym);
    assert.deepEqual(acronyms, ['A', 'B', 'C']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
