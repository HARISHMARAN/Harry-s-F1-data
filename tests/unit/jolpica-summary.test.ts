import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLatestCompletedRaceSummary } from '../../src/services/jolpica';

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
