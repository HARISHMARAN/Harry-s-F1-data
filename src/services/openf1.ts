import type { DashboardData, DriverPosition, MaxStats } from '../types/f1';

interface TelemetryDriver {
  code: string;
  name: string;
  team: string;
  color: string;
  position: number | null;
  lap: number | null;
  lapTime: number | null;
  deltaToBest: number | null;
  gapToLeader: number | null;
  sectors: [number | null, number | null, number | null];
  stint: number | null;
}

interface TelemetryResponse {
  session: string;
  timestamp: number;
  drivers: TelemetryDriver[];
}

function formatLapTime(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return '--:--.---';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function formatGap(gap: number | null) {
  if (gap === null || !Number.isFinite(gap)) return '--';
  if (gap === 0) return 'LEADER';
  if (gap >= 500) return 'LAPPED';
  return `+${gap.toFixed(3)}`;
}

export async function fetchLiveDashboardData(): Promise<DashboardData> {
  try {
    const response = await fetch('/api/telemetry', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Telemetry API failed: ${response.status}`);
    }

    const payload = (await response.json()) as TelemetryResponse;
    if (!payload || !Array.isArray(payload.drivers)) {
      throw new Error('Telemetry API returned invalid payload.');
    }

    const driversSorted = [...payload.drivers].sort((a, b) => {
      if (a.position === null && b.position === null) return 0;
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position;
    });

    let fallbackPos = 1;
    const mappedLeaderboard: DriverPosition[] = driversSorted.map((driver) => {
      const position = driver.position ?? fallbackPos++;

      return {
        position,
        driver_number: 0,
        name_acronym: driver.code,
        full_name: driver.name,
        team_name: driver.team,
        team_colour: driver.color,
        date: formatGap(driver.gapToLeader),
      };
    });

    const bestLap = payload.drivers
      .map((driver) => driver.lapTime)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const minLap = bestLap.length ? Math.min(...bestLap) : null;

    const maxStats: MaxStats = {
      best_lap: formatLapTime(minLap),
      top_speed: 'UNAVAILABLE',
      started: 'LIVE',
      tyres: 'UNKNOWN',
    };

    const currentLap = payload.drivers.reduce((max, driver) => {
      if (driver.lap && driver.lap > max) return driver.lap;
      return max;
    }, 0);

    return {
      session: {
        session_key: payload.session,
        session_name: payload.session.toUpperCase(),
        session_type: 'Race',
        country_name: 'OpenF1',
        location: 'Trackside',
        circuit_short_name: payload.session,
        date_start: new Date(payload.timestamp * 1000).toISOString(),
        current_lap: currentLap || '--',
      },
      leaderboard: mappedLeaderboard,
      max_stats: maxStats,
    };
  } catch (err: unknown) {
    console.error('Telemetry backend error:', err);
    throw new Error('Telemetry unavailable. Please verify OpenF1 connectivity.', { cause: err });
  }
}
