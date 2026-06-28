"use client";

import { useEffect, useState } from 'react';
import HomePage from './components/HomePage';
import TrackBackdrop from './components/TrackBackdrop';
import { useDashboardData } from './hooks/useDashboardData';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchHistoricalData } from './services/jolpica';
import type { DashboardSession } from './types/f1';

const BACKDROP_REFRESH_MS = 30 * 60 * 1000;

const FALLBACK_BACKDROP_SESSION: DashboardSession = {
  session_key: 'spielberg-gp-fallback',
  session_name: 'Austrian Grand Prix',
  session_type: 'Race',
  country_name: 'Austria',
  location: 'Spielberg',
  circuit_short_name: 'Spielberg',
  date_start: '2026-06-28T13:00:00Z',
  current_lap: 'SCHEDULED',
};

function App() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, dispatch } = useDashboardData();
  const {
    viewMode,
    session,
    leaderboard,
    loading,
    errorMsg,
    dataState,
    selectedYear,
    selectedRound,
    seasonRaces,
    liveStatus,
    nextSession,
    weekendSchedule,
    championships,
    championshipsLoading,
    championshipsError,
  } = state;

  const [latestCompletedSession, setLatestCompletedSession] = useState<DashboardSession | null>(null);
  const [upcomingRaceSession, setUpcomingRaceSession] = useState<DashboardSession | null>(null);
  const isLive = liveStatus === 'LIVE';

  const nextSchedule = nextSession ?? (session?.status === 'NO_RACE' ? session : null);
  const nextRaceSchedule = upcomingRaceSession ?? (nextSchedule?.session_type === 'Race' ? nextSchedule : FALLBACK_BACKDROP_SESSION);
  const backdropSession = nextRaceSchedule ?? session ?? latestCompletedSession ?? FALLBACK_BACKDROP_SESSION;

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (!mode) return;
    if (mode === 'live') dispatch({ type: 'SET_VIEW_MODE', payload: 'LIVE' });
    if (mode === 'historical') dispatch({ type: 'SET_VIEW_MODE', payload: 'HISTORICAL' });
    if (mode === 'chat') dispatch({ type: 'SET_VIEW_MODE', payload: 'CHAT' });
    if (mode === 'predictions') dispatch({ type: 'SET_VIEW_MODE', payload: 'PREDICTIONS' });
    if (mode === 'news') dispatch({ type: 'SET_VIEW_MODE', payload: 'NEWS' });
  }, [searchParams, dispatch]);

  useEffect(() => {
    let ignore = false;

    const loadBackdropContext = async () => {
      try {
        const [latestRace, nextRaceResponse] = await Promise.all([
          fetchHistoricalData().catch(() => null),
          fetch('/api/schedule/next-race', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).catch(() => null),
        ]);
        if (ignore) return;
        if (latestRace?.session) setLatestCompletedSession(latestRace.session);
        if (nextRaceResponse?.next_race) {
          setUpcomingRaceSession({
            ...nextRaceResponse.next_race,
            date_start: nextRaceResponse.next_race.date_start ?? FALLBACK_BACKDROP_SESSION.date_start,
            current_lap: 'SCHEDULED',
            status: 'NO_RACE',
          });
        }
      } catch {
        if (!ignore) {
          setLatestCompletedSession((current) => current ?? FALLBACK_BACKDROP_SESSION);
        }
      }
    };

    loadBackdropContext();
    const intervalId = window.setInterval(loadBackdropContext, BACKDROP_REFRESH_MS);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  // Historical mode: redirect to /replay or show year/round selectors
  if (viewMode === 'HISTORICAL') {
    router.push('/replay');
    return null;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Background track map */}
      {backdropSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          <TrackBackdrop session={backdropSession} />
        </div>
      )}

      {/* Main app */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <HomePage
          session={session}
          leaderboard={leaderboard}
          championships={championships}
          championshipsLoading={championshipsLoading}
          weekendSchedule={weekendSchedule}
          nextSession={nextSession}
          liveStatus={liveStatus}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default App;
