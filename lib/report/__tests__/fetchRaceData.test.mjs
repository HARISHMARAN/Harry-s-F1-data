import assert from 'node:assert/strict';
import { fetchRaceData } from '../fetchRaceData.js';

const baseSession = {
  sessionKey: 123,
  sessionName: 'Bahrain Grand Prix',
  meetingName: 'Bahrain GP',
  countryName: 'Bahrain',
  circuitShortName: 'Bahrain',
  dateStart: '2026-03-08T14:00:00Z',
  dateEnd: '2026-03-08T16:00:00Z',
  year: 2026,
};

function mockFetch(routes) {
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    const path = u.pathname;
    if (!(path in routes)) {
      throw new Error(`Unexpected URL: ${path}`);
    }
    const value = routes[path];
    if (value instanceof Error) {
      throw value;
    }
    return {
      ok: true,
      json: async () => value,
    };
  };
}

async function testSuccessPayload() {
  mockFetch({
    '/v1/drivers': [
      { driver_number: 1, name_acronym: 'VER', full_name: 'Max Verstappen', team_name: 'Red Bull' },
      { driver_number: 16, name_acronym: 'LEC', full_name: 'Charles Leclerc', team_name: 'Ferrari' },
      { driver_number: 44, name_acronym: 'HAM', full_name: 'Lewis Hamilton', team_name: 'Ferrari' },
    ],
    '/v1/laps': [
      { driver_number: 1, lap_number: 52, lap_duration: 90.1, position: 1, date_start: '2026-03-08T15:30:00Z' },
      { driver_number: 16, lap_number: 52, lap_duration: 90.7, position: 2, date_start: '2026-03-08T15:30:01Z' },
      { driver_number: 44, lap_number: 52, lap_duration: 91.3, position: 3, date_start: '2026-03-08T15:30:02Z' },
    ],
    '/v1/position': [
      { driver_number: 1, date: '2026-03-08T15:59:00Z', x: 1, y: 1, position: 1 },
      { driver_number: 16, date: '2026-03-08T15:59:00Z', x: 2, y: 2, position: 2 },
      { driver_number: 44, date: '2026-03-08T15:59:00Z', x: 3, y: 3, position: 3 },
    ],
    '/v1/intervals': [],
  });

  const payload = await fetchRaceData(baseSession);
  assert.equal(payload.session.sessionKey, 123);
  assert.equal(payload.podium.length, 3);
  assert.equal(payload.topFinishers.length, 3);
  assert.ok(payload.fastestLap);
  assert.equal(payload.fastestLap?.driverCode, 'VER');
  assert.ok(payload.notableFacts.length > 0);
}

async function testPartialDataFallback() {
  mockFetch({
    '/v1/drivers': [
      { driver_number: 1, name_acronym: 'VER', full_name: 'Max Verstappen', team_name: 'Red Bull' },
      { driver_number: 16, name_acronym: 'LEC', full_name: 'Charles Leclerc', team_name: 'Ferrari' },
    ],
    '/v1/laps': [
      { driver_number: 1, lap_number: 50, lap_duration: 90.1, position: 1, date_start: '2026-03-08T15:30:00Z' },
      { driver_number: 16, lap_number: 50, lap_duration: 90.7, position: 2, date_start: '2026-03-08T15:30:01Z' },
    ],
    '/v1/position': new Error('positions down'),
    '/v1/intervals': [],
  });

  const payload = await fetchRaceData(baseSession);
  assert.equal(payload.podium.length, 2);
  assert.equal(payload.topFinishers.length, 2);
}

async function testFastestLapOmission() {
  mockFetch({
    '/v1/drivers': [
      { driver_number: 1, name_acronym: 'VER', full_name: 'Max Verstappen', team_name: 'Red Bull' },
    ],
    '/v1/laps': [
      { driver_number: 1, lap_number: 50, position: 1, date_start: '2026-03-08T15:30:00Z' },
    ],
    '/v1/position': [],
    '/v1/intervals': [],
  });

  const payload = await fetchRaceData(baseSession);
  assert.equal(payload.fastestLap, null);
}

async function testStableShapeWithIncompletePodium() {
  mockFetch({
    '/v1/drivers': [
      { driver_number: 1, name_acronym: 'VER', full_name: 'Max Verstappen', team_name: 'Red Bull' },
    ],
    '/v1/laps': [
      { driver_number: 1, lap_number: 50, lap_duration: 90.1, position: 1, date_start: '2026-03-08T15:30:00Z' },
    ],
    '/v1/position': [],
    '/v1/intervals': [],
  });

  const payload = await fetchRaceData(baseSession);
  assert.equal(payload.podium.length, 1);
  assert.equal(payload.topFinishers.length, 1);
  assert.ok(Array.isArray(payload.notableFacts));
}

(async () => {
  await testSuccessPayload();
  await testPartialDataFallback();
  await testFastestLapOmission();
  await testStableShapeWithIncompletePodium();
  console.log('fetchRaceData tests passed');
})();
