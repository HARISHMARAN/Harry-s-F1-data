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
const TRACK_FALLBACK_POINTS = 100;

async function fetchOpenF1<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${OPEN_F1_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    if (response.status === 404) {
      return [] as unknown as T;
    }
    throw new Error(`Failed to fetch from OpenF1: ${response.statusText}`);
  }
  return response.json();
}

function buildFallbackTrack(): ReplayTrackPoint[] {
  return Array.from({ length: TRACK_FALLBACK_POINTS }, (_, index) => {
    const angle = (index / TRACK_FALLBACK_POINTS) * Math.PI * 2;
    // Circular wobbly track as a last resort
    const radiusX = 430 + Math.sin(angle * 3) * 40;
    const radiusY = 250 + Math.cos(angle * 2) * 25;

    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      distance: index, // Dummy distance
    };
  });
}

function buildTrackOutline(samples: ReplayLocationSample[]): ReplayTrackPoint[] {
  const uniquePoints: ReplayTrackPoint[] = [];
  let previousPoint: ReplayTrackPoint | null = null;
  let totalDistance = 0;

  for (const sample of samples) {
    if (sample.x === 0 && sample.y === 0) {
      continue;
    }

    const currentPoint = { x: sample.x, y: sample.y, distance: 0 };

    if (!previousPoint) {
      uniquePoints.push(currentPoint);
      previousPoint = currentPoint;
      continue;
    }

    const deltaX = currentPoint.x - previousPoint.x;
    const deltaY = currentPoint.y - previousPoint.y;
    const dist = Math.hypot(deltaX, deltaY);

    // Filter out points that are too close together
    if (dist >= 10) {
      totalDistance += dist;
      currentPoint.distance = totalDistance;
      uniquePoints.push(currentPoint);
      previousPoint = currentPoint;
    }
  }

  if (uniquePoints.length < 40) {
    return [];
  }

  // Ensure it's a closed loop for the SVG path
  const first = uniquePoints[0];
  const last = uniquePoints[uniquePoints.length - 1];
  const closingDist = Math.hypot(last.x - first.x, last.y - first.y);
  
  if (closingDist > 20) {
    uniquePoints.push({ ...first, distance: totalDistance + closingDist });
  }

  return uniquePoints;
}

function pickReplayWinner(
  positions: ReplayPositionSample[],
  drivers: ReplayDriver[],
) {
  if (positions.length === 0) return 1;

  const lastPositions = new Map<number, number>();
  positions.forEach((p) => lastPositions.set(p.driver_number, p.position));

  let winnerNumber = 1;
  let bestPos = 999;

  lastPositions.forEach((pos, num) => {
    if (pos < bestPos) {
      bestPos = pos;
      winnerNumber = num;
    }
  });

  return winnerNumber;
}

function pickReferenceLap(laps: ReplayLap[], driverNumber: number) {
  return (
    laps.find(
      (lap) =>
        lap.driver_number === driverNumber &&
        lap.lap_duration !== null &&
        lap.lap_duration > 0 &&
        !lap.is_pit_out_lap,
    ) ||
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

export async function fetchReplaySessions(
  year: number,
): Promise<ReplaySessionSummary[]> {
  const sessions = await fetchOpenF1<ReplaySessionSummary[]>('sessions', {
    year,
    session_name: 'Race',
  });

  return [...sessions].sort(
    (left, right) => Date.parse(right.date_start) - Date.parse(left.date_start),
  );
}

function sanitizeDate(dateStr: string): string {
  return dateStr.split('.')[0].split('+')[0].replace('Z', '');
}

function findLapWindow(laps: ReplayLap[], driverNumber: number) {
  const driverLaps = laps
    .filter((lap) => lap.driver_number === driverNumber && lap.date_start)
    .sort(
      (left, right) =>
        Date.parse(left.date_start ?? '') - Date.parse(right.date_start ?? ''),
    );

  // Try to find a nice clean lap (not lap 1, not pit lap)
  for (let i = 1; i < driverLaps.length - 1; i += 1) {
    const lap = driverLaps[i];
    const next = driverLaps[i + 1];
    if (!lap.is_pit_out_lap && lap.lap_duration && lap.date_start && next.date_start) {
      return { start: lap.date_start, end: next.date_start };
    }
  }

  // Fallback to any lap window
  for (let i = 0; i < driverLaps.length - 1; i += 1) {
    const start = driverLaps[i].date_start;
    const next = driverLaps[i + 1].date_start;
    if (start && next) {
      return { start, end: next };
    }
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
    fetchOpenF1<ReplayPositionSample[]>('position', {
      session_key: session.session_key,
    }),
    fetchOpenF1<ReplayRaceControlMessage[]>('race_control', {
      session_key: session.session_key,
    }).catch(() => []),
  ]);

  if (drivers.length === 0 || (laps.length === 0 && positions.length === 0)) {
    throw new Error('No timing data is available yet for this race replay.');
  }

  const sourceDriverNumber = pickReplayWinner(positions, drivers);
  const referenceLap = pickReferenceLap(laps, sourceDriverNumber);
  
  let trackPoints: ReplayTrackPoint[] = [];

  // Try to get track from multiple potential drivers if needed
  const candidateDrivers = [
    sourceDriverNumber,
    ...drivers.map(d => d.driver_number).filter(n => n !== sourceDriverNumber).slice(0, 3)
  ];

  for (const driverNum of candidateDrivers) {
    if (trackPoints.length >= 40) break;

    const lapWindow = findLapWindow(laps, driverNum);
    if (!lapWindow) continue;

    onProgress?.(`Tracing track geometry using driver ${driverNum}...`);
    try {
      const locationSamples = await fetchOpenF1<ReplayLocationSample[]>(
        'location',
        {
          session_key: session.session_key,
          driver_number: driverNum,
          'date>=': sanitizeDate(lapWindow.start),
          'date<=': sanitizeDate(lapWindow.end),
        },
      );

      trackPoints = buildTrackOutline(locationSamples);
    } catch {
      continue;
    }
  }

  if (trackPoints.length < 40) {
    onProgress?.('Attempting session-wide track recovery...');
    try {
      const locationSamples = await fetchOpenF1<ReplayLocationSample[]>(
        'location',
        {
          session_key: session.session_key,
          driver_number: sourceDriverNumber,
        },
      );
      trackPoints = buildTrackOutline(locationSamples);
    } catch {
      // ignore
    }
  }

  if (trackPoints.length < 40) {
    trackPoints = buildFallbackTrack();
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
    total_laps: laps.reduce(
      (maxLaps, lap) => Math.max(maxLaps, lap.lap_number),
      0,
    ),
    start_time: session.date_start,
    end_time: buildReplayEndTime(session, laps, positions),
  };
}
