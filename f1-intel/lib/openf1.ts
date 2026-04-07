import type { TelemetryLap } from '../types/telemetry';

const OPENF1_BASE = 'https://api.openf1.org/v1';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`OpenF1 request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchLatestSessionId(): Promise<number | null> {
  const sessions = await fetchJson<Array<{ session_key: number }>>(`${OPENF1_BASE}/sessions?session_type=R&limit=1&offset=0`);
  return sessions[0]?.session_key ?? null;
}

export async function fetchDriverLaps(sessionId: number, driver: string): Promise<TelemetryLap[]> {
  const laps = await fetchJson<Array<{ lap_number: number; lap_duration: number; sector_1: number; sector_2: number; sector_3: number }>>(
    `${OPENF1_BASE}/laps?session_key=${sessionId}&driver_number=${encodeURIComponent(driver)}`
  );

  return laps.map((lap) => ({
    driver,
    lap: lap.lap_number,
    lapTime: lap.lap_duration,
    sectors: [lap.sector_1, lap.sector_2, lap.sector_3],
  }));
}

export async function fetchLeaderboard(sessionId: number): Promise<Array<{ driver_number: string; position: number; lap_number: number }>> {
  return fetchJson(`${OPENF1_BASE}/position?session_key=${sessionId}`);
}
