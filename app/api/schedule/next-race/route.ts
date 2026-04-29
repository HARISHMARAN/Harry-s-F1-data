import { NextResponse } from 'next/server';
import { getCurrentOrNextRaceSession } from '../../../../lib/openf1';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCurrentOrNextRaceSession();

  return NextResponse.json({
    next_race: session
      ? {
          session_key: session.session_key,
          session_name: session.circuit_short_name ? `${session.circuit_short_name} Grand Prix` : session.session_name,
          session_type: session.session_type ?? 'Race',
          country_name: session.country_name ?? '',
          location: session.location ?? '',
          circuit_short_name: session.circuit_short_name ?? session.session_name,
          date_start: session.date_start ?? null,
          date_end: session.date_end ?? null,
        }
      : null,
  });
}
