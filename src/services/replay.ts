import type {
  ReplayDataset,
  ReplayDriver,
  ReplayLap,
  ReplayPositionSample,
  ReplaySessionSummary,
} from '../types/f1';

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
    const response = await fetch(`/api/sessions?year=${year}`);
    if (!response.ok) {
      throw new Error('Failed to fetch replay sessions.');
    }
    return await response.json();
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
    const response = await fetch(`/api/replay/${session.year}/${session.round}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || 'Failed to fetch replay dataset.');
    }

    onProgress?.('Processing replay stream...');
    const data = await response.json();

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
