import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchDriverLaps, fetchLatestSessionId } from '../../../lib/openf1';
import { calculateMetrics } from '../../../lib/analytics';
import { supabase } from '../../../lib/db';

const querySchema = z.object({
  session: z.string().optional(),
  driver: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    session: searchParams.get('session') ?? undefined,
    driver: searchParams.get('driver') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const driver = (parsed.data.driver ?? 'VER').toUpperCase();
  const sessionValue = parsed.data.session ?? 'latest';
  const sessionId = sessionValue === 'latest' ? await fetchLatestSessionId() : Number(sessionValue);

  if (!sessionId) {
    return NextResponse.json({ error: 'Unable to resolve session' }, { status: 404 });
  }

  const laps = await fetchDriverLaps(sessionId, driver);
  const metrics = calculateMetrics(laps);
  const latestLap = laps[laps.length - 1];

  if (supabase && latestLap) {
    await supabase.from('telemetry_cache').upsert(
      {
        session_id: sessionId,
        driver,
        lap: latestLap.lap,
        lap_time: latestLap.lapTime,
        sector_1: latestLap.sectors[0],
        sector_2: latestLap.sectors[1],
        sector_3: latestLap.sectors[2],
      },
      { onConflict: 'session_id,driver,lap' }
    );
  }

  return NextResponse.json({
    driver,
    lap: latestLap?.lap ?? 0,
    lapTime: latestLap?.lapTime ?? 0,
    delta: metrics.lapDelta,
    sectors: latestLap?.sectors ?? [0, 0, 0],
    gapToLeader: metrics.gapToLeader,
    stint: metrics.stint,
    metrics,
    raw: { sessionId, laps: laps.slice(-5) },
  });
}
