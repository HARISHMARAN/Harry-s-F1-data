import type {
  ReplayDataset,
  ReplayDriver,
  ReplayLap,
  ReplayPositionSample,
  ReplaySessionSummary,
} from '../types/f1';
import { getReplayDataset, getReplaySessions } from '../data-access/replayClient';

/**
 * Harry's Pitwall - Replay Service (v2)
 *
 * Serverless replay service (OpenF1-backed).
 * These endpoints are implemented in Next API routes.
 */

function ensureDriverRoster(
  drivers: ReplayDriver[],
  laps: ReplayLap[],
  positions: ReplayPositionSample[],
) {
  const knownDrivers = new Set(drivers.map((driver) => driver.driver_number));
  const inferredNumbers = new Set<number>();

  laps.forEach((lap) => inferredNumbers.add(lap.driver_number));
  positions.forEach((position) => inferredNumbers.add(position.driver_number));

  const placeholders: ReplayDriver[] = [];

  inferredNumbers.forEach((driverNumber) => {
    if (knownDrivers.has(driverNumber)) return;
    placeholders.push({
      session_key: drivers[0]?.session_key ?? 0,
      driver_number: driverNumber,
      broadcast_name: `Driver ${driverNumber}`,
      full_name: `Driver ${driverNumber}`,
      name_acronym: String(driverNumber),
      team_name: 'Unknown',
      team_colour: 'AAAAAA',
      first_name: 'Driver',
      last_name: String(driverNumber),
      headshot_url: '',
      country_code: '',
    });
  });

  return drivers.concat(placeholders);
}

export async function fetchReplaySessions(year: number): Promise<ReplaySessionSummary[]> {
  try {
    const result = await getReplaySessions(year);
    return result.data;
  } catch (error) {
    console.error('Replay session fetch error:', error);
    throw error;
  }
}

export async function fetchReplayDataset(
  session: ReplaySessionSummary,
  onProgress?: (message: string) => void,
): Promise<ReplayDataset> {
  onProgress?.('Fetching OpenF1 replay dataset...');

  try {
    const result = await getReplayDataset(session.year, session.round);
    onProgress?.('Processing replay stream...');
    const data = result.data;

    const laps = data.laps ?? [];
    const positions = data.positions ?? [];
    const drivers = ensureDriverRoster(data.drivers ?? [], laps, positions);

    return {
      ...data,
      drivers,
      positions,
      laps,
    };
  } catch (error) {
    console.error('Replay dataset fetch error:', error);
    throw error;
  }
}

export type DriverReplayTelemetry = {
  session_key: number;
  driver_number: number;
  drs_zones: Array<{ start_fraction: number; end_fraction: number; sample_count: number; label?: string }>;
  lap_drs: Array<{ lap_number: number; date_start: string | null | undefined; drs_used: boolean }>;
  telemetry: Array<{
    date: string;
    lap_number: number | null;
    drs: number | null;
    speed: number | null;
    throttle: number | null;
    brake: number | null;
  }>;
};

export async function fetchDriverReplayTelemetry(
  session: ReplaySessionSummary,
  driverNumber: number,
): Promise<DriverReplayTelemetry> {
  const response = await fetch(
    `/api/replay/${session.year}/${session.round}/driver/${driverNumber}`,
    { cache: 'no-store' },
  );

  if (response.status === 404) {
    return {
      session_key: session.session_key,
      driver_number: driverNumber,
      drs_zones: [],
      lap_drs: [],
      telemetry: [],
    };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || 'Failed to fetch driver replay telemetry.');
  }

  return (await response.json()) as DriverReplayTelemetry;
}
