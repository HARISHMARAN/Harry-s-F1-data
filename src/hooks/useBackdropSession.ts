"use client";

import { useEffect, useState } from 'react';
import { fetchHistoricalData } from '../services/jolpica';
import type { DashboardSession } from '../types/f1';

const REFRESH_MS = 30 * 60 * 1000;

export const FALLBACK_BACKDROP_SESSION: DashboardSession = {
  session_key: 'miami-gp-fallback',
  session_name: 'Miami Grand Prix',
  session_type: 'Race',
  country_name: 'United States',
  location: 'Miami Gardens',
  circuit_short_name: 'Miami',
  date_start: '2026-05-03T20:00:00Z',
  current_lap: 'SCHEDULED',
};

export function useBackdropSession() {
  const [latestCompleted, setLatestCompleted] = useState<DashboardSession | null>(null);
  const [upcomingRace, setUpcomingRace] = useState<DashboardSession | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const [latestRace, nextRaceResponse] = await Promise.all([
          fetchHistoricalData().catch(() => null),
          fetch('/api/schedule/next-race', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (ignore) return;
        if (latestRace?.session) setLatestCompleted(latestRace.session);
        if (nextRaceResponse?.next_race) {
          setUpcomingRace({
            ...nextRaceResponse.next_race,
            date_start: nextRaceResponse.next_race.date_start ?? FALLBACK_BACKDROP_SESSION.date_start,
            current_lap: 'SCHEDULED',
            status: 'NO_RACE',
          });
        }
      } catch {
        if (!ignore) {
          setLatestCompleted((current) => current ?? FALLBACK_BACKDROP_SESSION);
        }
      }
    };

    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      ignore = true;
      window.clearInterval(id);
    };
  }, []);

  return { latestCompleted, upcomingRace };
}
