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
      throw new Error(String(payload.detail));
    }

    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
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
        lap.date_start &&
        !lap.is_pit_out_lap &&
        lap.lap_duration !== null &&
        lap.lap_duration > 0,
    ) ??
    laps.find(
      (lap) =>
        lap.date_start && lap.lap_duration !== null && lap.lap_duration > 0,
    )
  );
}

function buildReplayEndTime(
  session: ReplaySessionSummary,
  laps: ReplayLap[],
  positions: ReplayPositionSample[],
) {
  const candidates: number[] = [];
  const sessionEndMs = Date.parse(session.date_end ?? '');

  if (Number.isFinite(sessionEndMs)) {
    candidates.push(sessionEndMs);
  }

  const finalLap = laps
    .filter((lap) => lap.lap_duration !== null && lap.date_start)
    .at(-1);

  if (finalLap?.lap_duration && finalLap.date_start) {
    const finalLapStart = Date.parse(finalLap.date_start);
    if (Number.isFinite(finalLapStart)) {
      candidates.push(finalLapStart + finalLap.lap_duration * 1000);
    }
  }

  const lastPositionSample = positions.at(-1);

  if (lastPositionSample) {
    candidates.push(Date.parse(lastPositionSample.date));
  }

  if (candidates.length === 0) {
    candidates.push(Date.parse(session.date_start));
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

function findLapWindow(laps: ReplayLap[], driverNumber: number) {
  const driverLaps = laps
    .filter((lap) => lap.driver_number === driverNumber && lap.date_start)
    .sort(
      (left, right) =>
        Date.parse(left.date_start ?? '') - Date.parse(right.date_start ?? ''),
    );

  for (let i = 0; i < driverLaps.length - 1; i += 1) {
    const start = driverLaps[i].date_start;
    const next = driverLaps[i + 1].date_start;
    const startMs = Date.parse(start ?? '');
    const nextMs = Date.parse(next ?? '');

    if (start && Number.isFinite(startMs) && Number.isFinite(nextMs) && nextMs > startMs) {
      return { start, end: new Date(nextMs).toISOString() };
    }
  }

  const first = driverLaps[0]?.date_start;
  const firstMs = Date.parse(first ?? '');

  if (first && Number.isFinite(firstMs)) {
    return { start: first, end: new Date(firstMs + 90_000).toISOString() };
  }

  return null;
}

export async function fetchReplayDataset(
  session: ReplaySessionSummary,
  onProgress?: (message: string) => void,
): Promise<ReplayDataset> {
  onProgress?.('Loading driver roster, race order, and lap timing...');

  const [drivers, laps, positions, raceControl] = await Promise.all([
    fetchOpenF1<ReplayDriver[]>('drivers', { session_key: session.session_key }),
    fetchOpenF1<ReplayLap[]>('laps', { session_key: session.session_key }),
    fetchOpenF1<ReplayPositionSample[]>('position', { session_key: session.session_key }),
    fetchOpenF1<ReplayRaceControlMessage[]>('race_control', { session_key: session.session_key }).catch(
      () => [],
    ),
  ]);

  if (drivers.length === 0 || positions.length === 0) {
    throw new Error('No timing data is available yet for this race replay.');
  }

  const sourceDriverNumber = pickReplayWinner(positions, drivers);
  const referenceLap = pickReferenceLap(laps, sourceDriverNumber);
  const lapWindow = findLapWindow(laps, sourceDriverNumber);

  let trackPoints = buildFallbackTrack();

  if (lapWindow) {
    onProgress?.('Loading track geometry for the replay map...');
    try {
      const locationSamples = await fetchOpenF1<ReplayLocationSample[]>('location', {
        session_key: session.session_key,
        driver_number: sourceDriverNumber,
        'date>=': lapWindow.start,
        'date<=': lapWindow.end,
      });

      trackPoints = buildTrackOutline(locationSamples);
    } catch {
      trackPoints = buildFallbackTrack();
    }
  } else if (referenceLap?.lap_duration && referenceLap.date_start) {
    onProgress?.('Loading track geometry for the replay map...');
    try {
      const lapStart = Date.parse(referenceLap.date_start);
      if (Number.isFinite(lapStart)) {
        const lapEnd = new Date(lapStart + referenceLap.lap_duration * 1000);
        const locationSamples = await fetchOpenF1<ReplayLocationSample[]>('location', {
          session_key: session.session_key,
          driver_number: sourceDriverNumber,
          'date>=': referenceLap.date_start,
          'date<=': lapEnd.toISOString(),
        });

        trackPoints = buildTrackOutline(locationSamples);
      }
    } catch {
      trackPoints = buildFallbackTrack();
    }
  } else {
    onProgress?.('Loading track geometry from session samples...');
    try {
      const locationSamples = await fetchOpenF1<ReplayLocationSample[]>('location', {
        session_key: session.session_key,
        driver_number: sourceDriverNumber,
      });

      if (locationSamples.length > 0) {
        trackPoints = buildTrackOutline(locationSamples);
      }
    } catch {
      trackPoints = buildFallbackTrack();
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
