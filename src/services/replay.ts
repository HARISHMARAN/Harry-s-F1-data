import type {
  ReplayDataset,
  ReplayDriver,
  ReplayLap,
  ReplayLocationSample,
  ReplayPositionSample,
  ReplayRaceControlMessage,
  ReplaySessionSummary,
  ReplayTrackPoint,
} from '../types/f1';

const OPEN_F1_BASE_URL = 'https://api.openf1.org/v1';
const TRACK_FALLBACK_POINTS = 180;

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchOpenF1<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  retries = 3,
): Promise<T> {
  const url = new URL(`${OPEN_F1_BASE_URL}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url.toString());
    const text = await response.text();

    let payload: unknown = null;

    try {
      payload = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      payload = text;
    }

    const isRateLimited =
      response.status === 429 ||
      (typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        String(payload.error).toLowerCase().includes('too many requests'));

    if (response.ok && !isRateLimited) {
      return payload as T;
    }

    if (isRateLimited && attempt < retries) {
      await delay(700 * (attempt + 1));
      continue;
    }

    if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
      if (typeof payload.detail === 'string' && payload.detail.toLowerCase().includes('not found')) {
        return [] as unknown as T;
      }
      throw new Error(String(payload.detail));
    }

    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      if (typeof payload.error === 'string' && payload.error.toLowerCase().includes('not found')) {
        return [] as unknown as T;
      }
      throw new Error(String(payload.error));
    }

    throw new Error(`OpenF1 request failed for ${endpoint}.`);
  }

  throw new Error(`OpenF1 request failed for ${endpoint}.`);
}

function buildFallbackTrack(): ReplayTrackPoint[] {
  return Array.from({ length: TRACK_FALLBACK_POINTS }, (_, index) => {
    const angle = (index / TRACK_FALLBACK_POINTS) * Math.PI * 2;
    const radiusX = 430 + Math.sin(angle * 3) * 40;
    const radiusY = 250 + Math.cos(angle * 2) * 25;

    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
    };
  });
}

function buildTrackOutline(samples: ReplayLocationSample[]): ReplayTrackPoint[] {
  const uniquePoints: ReplayTrackPoint[] = [];
  let previousPoint: ReplayTrackPoint | null = null;

  for (const sample of samples) {
    if (sample.x === 0 && sample.y === 0) {
      continue;
    }

    const currentPoint = { x: sample.x, y: sample.y };

    if (!previousPoint) {
      uniquePoints.push(currentPoint);
      previousPoint = currentPoint;
      continue;
    }

    const deltaX = currentPoint.x - previousPoint.x;
    const deltaY = currentPoint.y - previousPoint.y;

    if (Math.hypot(deltaX, deltaY) >= 12) {
      uniquePoints.push(currentPoint);
      previousPoint = currentPoint;
    }
  }

  if (uniquePoints.length < 40) {
    return buildFallbackTrack();
  }

  const step = Math.max(1, Math.floor(uniquePoints.length / 220));
  const simplified = uniquePoints.filter((_, index) => index % step === 0);

  if (simplified.length > 2) {
    simplified.push(simplified[0]);
  }

  return simplified;
}

function pickReplayWinner(positions: ReplayPositionSample[], drivers: ReplayDriver[]) {
  const leaderSnapshots = positions.filter((sample) => sample.position === 1);
  const lastLeader = leaderSnapshots.at(-1);

  if (lastLeader) {
    return lastLeader.driver_number;
  }

  return drivers[0]?.driver_number ?? 1;
}

function pickReferenceLap(laps: ReplayLap[], driverNumber: number) {
  return (
    laps.find(
      (lap) =>
        lap.driver_number === driverNumber &&
        !lap.is_pit_out_lap &&
        lap.lap_duration !== null &&
        lap.lap_duration > 0,
    ) ??
    laps.find((lap) => lap.lap_duration !== null && lap.lap_duration > 0)
  );
}

function buildReplayEndTime(
  session: ReplaySessionSummary,
  laps: ReplayLap[],
  positions: ReplayPositionSample[],
) {
  const candidates = [Date.parse(session.date_end)];

  const finalLap = laps
    .filter((lap) => lap.lap_duration !== null)
    .at(-1);

  if (finalLap?.lap_duration) {
    candidates.push(Date.parse(finalLap.date_start) + finalLap.lap_duration * 1000);
  }

  const lastPositionSample = positions.at(-1);

  if (lastPositionSample) {
    candidates.push(Date.parse(lastPositionSample.date));
  }

  return new Date(Math.max(...candidates)).toISOString();
}

export async function fetchReplaySessions(year: number): Promise<ReplaySessionSummary[]> {
  const sessions = await fetchOpenF1<ReplaySessionSummary[]>('sessions', {
    year,
    session_name: 'Race',
  });

  return [...sessions].sort(
    (left, right) => Date.parse(right.date_start) - Date.parse(left.date_start),
  );
}

export async function fetchReplayDataset(
  session: ReplaySessionSummary,
  onProgress?: (message: string) => void,
): Promise<ReplayDataset> {
  onProgress?.('Loading driver roster, race order, and lap timing...');

  // Fetch sequentially to avoid OpenF1 rate limits and connection pooling issues
  const drivers = await fetchOpenF1<ReplayDriver[]>('drivers', { session_key: session.session_key });
  const laps = await fetchOpenF1<ReplayLap[]>('laps', { session_key: session.session_key });
  const positions = await fetchOpenF1<ReplayPositionSample[]>('position', { session_key: session.session_key });
  const raceControl = await fetchOpenF1<ReplayRaceControlMessage[]>('race_control', { session_key: session.session_key });

  const sourceDriverNumber = pickReplayWinner(positions, drivers);
  const referenceLap = pickReferenceLap(laps, sourceDriverNumber);

  async function loadTrackGeometry(targetSession: ReplaySessionSummary, targetLap: ReplayLap | undefined, driverRef: number) {
    if (!targetLap?.lap_duration) return null;
    try {
      const lapEnd = new Date(Date.parse(targetLap.date_start) + targetLap.lap_duration * 1000);
      const points = await fetchOpenF1<ReplayLocationSample[]>('location', {
        session_key: targetSession.session_key,
        driver_number: driverRef,
        'date>=': targetLap.date_start,
        'date<=': lapEnd.toISOString(),
      });
      const outline = buildTrackOutline(points);
      return outline.length !== TRACK_FALLBACK_POINTS ? outline : null;
    } catch {
      return null;
    }
  }

  let trackPoints = buildFallbackTrack();

  if (referenceLap?.lap_duration) {
    onProgress?.('Loading track geometry for the replay map...');
    const outline = await loadTrackGeometry(session, referenceLap, sourceDriverNumber);
    if (outline) trackPoints = outline;
  }

  // If we still have an oval track (due to no laps yet, or fetch failed), we try borrowing the track from a previous year!
  if (trackPoints.length === TRACK_FALLBACK_POINTS) {
    onProgress?.('Fetching historical circuit map from OpenF1 archive...');
    try {
      const pastSessions = await fetchOpenF1<ReplaySessionSummary[]>('sessions', {
        circuit_key: session.circuit_key,
        session_type: 'Race',
      });

      // Filter out the current session, and sort by year descending so we get the most recent valid one
      const candidates = pastSessions
        .filter((s) => s.session_key !== session.session_key)
        .sort((a, b) => b.year - a.year);

      for (const historicalSession of candidates) {
        const pastLaps = await fetchOpenF1<ReplayLap[]>('laps', { session_key: historicalSession.session_key });
        
        if (pastLaps && pastLaps.length > 0) {
          const driverNums = new Set(pastLaps.map((l) => l.driver_number));
          const pastRef = pickReferenceLap(pastLaps, [...driverNums][0] ?? 1);

          if (pastRef?.lap_duration) {
            const historicalOutline = await loadTrackGeometry(historicalSession, pastRef, pastRef.driver_number);
            if (historicalOutline && historicalOutline.length !== TRACK_FALLBACK_POINTS) {
              trackPoints = historicalOutline;
              break; // Successfully loaded track outline
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load historical track fallback:', err);
    }
  }

  return {
    session,
    drivers,
    laps,
    positions,
    race_control: raceControl,
    track: {
      points: trackPoints,
      source_driver_number: sourceDriverNumber,
    },
    total_laps: laps.reduce((maxLaps, lap) => Math.max(maxLaps, lap.lap_number), 0),
    start_time: session.date_start,
    end_time: buildReplayEndTime(session, laps, positions),
  };
}
