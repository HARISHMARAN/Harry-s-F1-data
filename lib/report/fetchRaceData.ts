/**
 * fetchRaceData.ts
 * Responsible for:
 * - detailed race stats
 * - podium / top finishers
 * - fastest lap
 * - structured facts for AI summary and email rendering
 *
 * Not responsible for:
 * - race detection logic
 * - AI summary generation
 * - email formatting or sending
 */

import {
  getDrivers,
  getIntervals,
  getLaps,
  getSessionPositions,
  type OpenF1Driver,
  type OpenF1Interval,
  type OpenF1Lap,
  type OpenF1Position,
} from "../openf1";
import type { ReportableRaceSession } from "./detectRace";

/**
 * DATA STRATEGY (locked for MVP):
 * - Final order priority:
 *   1) getSessionPositions(sessionKey) if it includes trustworthy positions
 *   2) fallback to latest lap position-derived classification
 *   3) fallback to intervals ordering only if necessary
 * - No alternative or mixed algorithms beyond this sequence.
 */

export type RaceReportDriverResult = {
  position: number;
  driverNumber?: number | null;
  driverCode?: string | null;
  fullName?: string | null;
  teamName?: string | null;
};

export type RaceFastestLap = {
  driverNumber?: number | null;
  driverCode?: string | null;
  fullName?: string | null;
  lapNumber?: number | null;
  lapTimeSeconds: number;
};

export type RaceReportPayload = {
  session: ReportableRaceSession;
  generatedAt: string;
  podium: RaceReportDriverResult[];
  topFinishers: RaceReportDriverResult[];
  fastestLap?: RaceFastestLap | null;
  notableFacts: string[];
};

type DriverMeta = {
  driverNumber: number;
  driverCode?: string | null;
  fullName?: string | null;
  teamName?: string | null;
};

// Shapes from OpenF1 (source-of-truth)
// - getSessionPositions(): OpenF1Position = { driver_number, date, x, y }
// - getLaps(): OpenF1Lap = { driver_number, lap_number, lap_duration?, position?, date_start? }
// - getDrivers(): OpenF1Driver = { driver_number, name_acronym?, full_name?, team_name?, ... }
// - getIntervals(): OpenF1Interval = { driver_number, gap_to_leader?, interval?, date?, lap_number? }
type PositionLike = OpenF1Position & {
  position?: number | null;
};

function buildDriverIndex(drivers: OpenF1Driver[]): Map<number, DriverMeta> {
  const map = new Map<number, DriverMeta>();
  drivers.forEach((driver) => {
    const code = driver.name_acronym ?? driver.broadcast_name ?? null;
    map.set(driver.driver_number, {
      driverNumber: driver.driver_number,
      driverCode: code,
      fullName: driver.full_name ?? driver.broadcast_name ?? code,
      teamName: driver.team_name ?? null,
    });
  });
  return map;
}

function latestByDriver<T extends { driver_number: number }>(
  rows: T[],
  getTs: (row: T) => number
) {
  const map = new Map<number, T>();
  rows.forEach((row) => {
    const existing = map.get(row.driver_number);
    if (!existing) {
      map.set(row.driver_number, row);
      return;
    }
    if (getTs(row) > getTs(existing)) {
      map.set(row.driver_number, row);
    }
  });
  return map;
}

function buildResultsFromPositions(
  positions: PositionLike[],
  driverIndex: Map<number, DriverMeta>
): RaceReportDriverResult[] {
  const withPosition = positions.filter(
    (row) => typeof row.position === "number" && Number.isFinite(row.position)
  );
  if (!withPosition.length) return [];

  const latest = latestByDriver(withPosition, (row) => Date.parse(row.date));
  const results = Array.from(latest.values())
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((row) => {
      const meta = driverIndex.get(row.driver_number);
      return {
        position: row.position as number,
        driverNumber: row.driver_number,
        driverCode: meta?.driverCode ?? null,
        fullName: meta?.fullName ?? null,
        teamName: meta?.teamName ?? null,
      };
    });

  return results.length >= 3 ? results : [];
}

function buildResultsFromLaps(
  laps: OpenF1Lap[],
  driverIndex: Map<number, DriverMeta>
): RaceReportDriverResult[] {
  const lapWithPos = laps.filter(
    (lap) => typeof lap.position === "number" && Number.isFinite(lap.position)
  );
  if (!lapWithPos.length) return [];

  const latest = latestByDriver(lapWithPos, (lap) => {
    const base = lap.date_start ? Date.parse(lap.date_start) : 0;
    return Number.isFinite(base) ? base : 0;
  });

  return Array.from(latest.values())
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((lap) => {
      const meta = driverIndex.get(lap.driver_number);
      return {
        position: lap.position as number,
        driverNumber: lap.driver_number,
        driverCode: meta?.driverCode ?? null,
        fullName: meta?.fullName ?? null,
        teamName: meta?.teamName ?? null,
      };
    });
}

function parseGapValue(value: OpenF1Interval["gap_to_leader"]): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  const match = trimmed.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildResultsFromIntervals(
  intervals: OpenF1Interval[],
  driverIndex: Map<number, DriverMeta>
): RaceReportDriverResult[] {
  if (!intervals.length) return [];
  const latest = latestByDriver(intervals, (row) => {
    const ts = row.date ? Date.parse(row.date) : 0;
    return Number.isFinite(ts) ? ts : 0;
  });

  const rows = Array.from(latest.values())
    .map((row) => ({
      row,
      gap: parseGapValue(row.gap_to_leader),
    }))
    .sort((a, b) => {
      if (a.gap === null && b.gap === null) return 0;
      if (a.gap === null) return 1;
      if (b.gap === null) return -1;
      return a.gap - b.gap;
    });

  let position = 1;
  return rows.map(({ row }) => {
    const meta = driverIndex.get(row.driver_number);
    return {
      position: position++,
      driverNumber: row.driver_number,
      driverCode: meta?.driverCode ?? null,
      fullName: meta?.fullName ?? null,
      teamName: meta?.teamName ?? null,
    };
  });
}

function findFastestLap(
  laps: OpenF1Lap[],
  driverIndex: Map<number, DriverMeta>
): RaceFastestLap | null {
  const withDuration = laps.filter(
    (lap) => typeof lap.lap_duration === "number" && Number.isFinite(lap.lap_duration)
  );
  if (!withDuration.length) return null;

  const fastest = withDuration.reduce((best, lap) => {
    if (!best) return lap;
    if ((lap.lap_duration as number) < (best.lap_duration as number)) return lap;
    return best;
  }, null as OpenF1Lap | null);

  if (!fastest || fastest.lap_duration === null) return null;
  const meta = driverIndex.get(fastest.driver_number);
  return {
    driverNumber: fastest.driver_number,
    driverCode: meta?.driverCode ?? null,
    fullName: meta?.fullName ?? null,
    lapNumber: fastest.lap_number ?? null,
    lapTimeSeconds: Number(fastest.lap_duration),
  };
}

function buildNotableFacts(
  session: ReportableRaceSession,
  podium: RaceReportDriverResult[],
  fastestLap: RaceFastestLap | null
) {
  const facts: string[] = [];
  facts.push("Race session completed successfully");
  if (podium.length >= 3) {
    facts.push("Podium classified for 3 drivers");
  } else if (podium.length > 0) {
    facts.push(`Podium classified for ${podium.length} drivers`);
  }
  if (fastestLap) {
    const code = fastestLap.driverCode ?? fastestLap.fullName ?? "Unknown driver";
    const lap = fastestLap.lapNumber ?? "unknown";
    facts.push(`Fastest lap recorded by ${code} on lap ${lap}`);
  }
  facts.push(`Reporting window includes ${session.sessionName}`);
  return facts;
}

export async function fetchRaceData(
  session: ReportableRaceSession
): Promise<RaceReportPayload> {
  const sessionKey = session.sessionKey;

  const safeFetch = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`fetchRaceData: ${label} unavailable`, err);
      return fallback;
    }
  };

  const [drivers, laps, positions, intervals] = await Promise.all([
    safeFetch("drivers", () => getDrivers(sessionKey), [] as OpenF1Driver[]),
    safeFetch("laps", () => getLaps(sessionKey), [] as OpenF1Lap[]),
    safeFetch("positions", () => getSessionPositions(sessionKey), [] as OpenF1Position[]),
    safeFetch("intervals", () => getIntervals(sessionKey), [] as OpenF1Interval[]),
  ]);

  const driverIndex = buildDriverIndex(drivers);

  // Priority 1: session positions if they include trustworthy positions
  const positionsResults = buildResultsFromPositions(
    positions as PositionLike[],
    driverIndex
  );

  // Priority 2: latest lap classification
  const lapResults = buildResultsFromLaps(laps, driverIndex);

  // Priority 3: intervals ordering (fallback only)
  const intervalResults = buildResultsFromIntervals(intervals, driverIndex);

  const finalResults =
    positionsResults.length > 0
      ? positionsResults
      : lapResults.length > 0
        ? lapResults
        : intervalResults;

  const podium = finalResults.slice(0, 3);
  const topFinishers = finalResults.slice(0, 10);
  const fastestLap = findFastestLap(laps, driverIndex);
  const notableFacts = buildNotableFacts(session, podium, fastestLap);

  return {
    session,
    generatedAt: new Date().toISOString(),
    podium,
    topFinishers,
    fastestLap,
    notableFacts,
  };
}
