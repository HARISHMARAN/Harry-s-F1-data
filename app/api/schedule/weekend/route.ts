import { NextResponse } from 'next/server';
import { getWeekendSchedule, getNextRaceSession } from '../../../../lib/openf1';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [sessions, nextRace] = await Promise.all([
    getWeekendSchedule().catch(() => []),
    getNextRaceSession().catch(() => null),
  ]);

  const serialized = sessions.map((s) => ({
    session_key: s.session_key,
    session_name: s.session_name,
    session_type: s.session_type ?? null,
    date_start: s.date_start,
    date_end: s.date_end ?? null,
    country_name: s.country_name ?? null,
    location: s.location ?? null,
    circuit_short_name: s.circuit_short_name ?? null,
    meeting_key: s.meeting_key ?? null,
  }));

  return NextResponse.json(
    {
      sessions: serialized,
      grand_prix_name: nextRace
        ? (nextRace.circuit_short_name
            ? `${nextRace.circuit_short_name} Grand Prix`
            : nextRace.session_name)
        : null,
      country_name: nextRace?.country_name ?? sessions[0]?.country_name ?? null,
      location: nextRace?.location ?? sessions[0]?.location ?? null,
    },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1200' } },
  );
}
