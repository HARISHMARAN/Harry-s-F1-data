import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLatestCompletedRaceSummary, fetchPreviousEditionRaceSummary } from '../../src/services/jolpica';

test('fetchLatestCompletedRaceSummary maps podium and fastest lap from Jolpica results', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      MRData: {
        RaceTable: {
          Races: [
            {
              round: '3',
              raceName: 'Japanese Grand Prix',
              date: '2026-03-29',
              Circuit: {
                circuitName: 'Suzuka Circuit',
                Location: { country: 'Japan' },
              },
              Results: [
                {
                  position: '1',
                  number: '12',
                  grid: '2',
                  status: 'Finished',
                  Time: { time: '1:28:03.403' },
                  FastestLap: { rank: '1', lap: '49', Time: { time: '1:32.432' } },
                  Driver: { code: 'ANT', givenName: 'Kimi', familyName: 'Antonelli' },
                  Constructor: { name: 'Mercedes' },
                },
                {
                  position: '2',
                  number: '81',
                  grid: '4',
                  status: 'Finished',
                  Time: { time: '+13.722' },
                  FastestLap: { rank: '5', lap: '49', Time: { time: '1:32.996' } },
                  Driver: { code: 'PIA', givenName: 'Oscar', familyName: 'Piastri' },
                  Constructor: { name: 'McLaren' },
                },
                {
                  position: '3',
                  number: '16',
                  grid: '3',
                  status: 'Finished',
                  Time: { time: '+15.270' },
                  FastestLap: { rank: '3', lap: '53', Time: { time: '1:32.634' } },
                  Driver: { code: 'LEC', givenName: 'Charles', familyName: 'Leclerc' },
                  Constructor: { name: 'Ferrari' },
                },
              ],
            },
          ],
        },
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  try {
    const summary = await fetchLatestCompletedRaceSummary();

    assert.equal(summary.raceName, 'Japanese Grand Prix');
    assert.deepEqual(summary.podium.map((driver) => driver.code), ['ANT', 'PIA', 'LEC']);
    assert.equal(summary.fastestLap?.code, 'ANT');
    assert.equal(summary.fastestLap?.time, '1:32.432');
    assert.equal(summary.fastestLap?.lap, '49');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchPreviousEditionRaceSummary maps the prior Miami Grand Prix instead of latest race', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url.includes('/f1/2025.json')) {
      return new Response(JSON.stringify({
        MRData: {
          RaceTable: {
            Races: [
              { round: '5', raceName: 'Chinese Grand Prix' },
              { round: '6', raceName: 'Miami Grand Prix' },
            ],
          },
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      MRData: {
        RaceTable: {
          Races: [
            {
              round: '6',
              raceName: 'Miami Grand Prix',
              date: '2025-05-04',
              Circuit: {
                circuitName: 'Miami International Autodrome',
                Location: { country: 'USA' },
              },
              Results: [
                {
                  position: '1',
                  number: '81',
                  grid: '4',
                  status: 'Finished',
                  Time: { time: '1:28:51.587' },
                  FastestLap: { rank: '4', lap: '40', Time: { time: '1:30.420' } },
                  Driver: { code: 'PIA', givenName: 'Oscar', familyName: 'Piastri' },
                  Constructor: { name: 'McLaren' },
                },
                {
                  position: '2',
                  number: '4',
                  grid: '2',
                  status: 'Finished',
                  Time: { time: '+4.630' },
                  FastestLap: { rank: '1', lap: '43', Time: { time: '1:29.746' } },
                  Driver: { code: 'NOR', givenName: 'Lando', familyName: 'Norris' },
                  Constructor: { name: 'McLaren' },
                },
                {
                  position: '3',
                  number: '63',
                  grid: '5',
                  status: 'Finished',
                  Time: { time: '+37.644' },
                  FastestLap: { rank: '2', lap: '44', Time: { time: '1:30.112' } },
                  Driver: { code: 'RUS', givenName: 'George', familyName: 'Russell' },
                  Constructor: { name: 'Mercedes' },
                },
              ],
            },
          ],
        },
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const summary = await fetchPreviousEditionRaceSummary('Miami Grand Prix', 2026);

    assert.equal(summary.raceName, 'Miami Grand Prix');
    assert.deepEqual(summary.podium.map((driver) => driver.code), ['PIA', 'NOR', 'RUS']);
    assert.equal(summary.fastestLap?.code, 'NOR');
    assert.ok(calls.some((url) => url.includes('/f1/2025/6/results.json')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
