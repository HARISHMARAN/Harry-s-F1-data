import type { OpenF1Driver, OpenF1Interval, OpenF1Lap, OpenF1Session } from "./openf1";
import { DEFAULT_DRIVER_COLOR, DRIVERS } from "./constants/drivers";

export type TelemetryDriver = {
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
};

export type TelemetryResponse = {
  session: string;
  timestamp: number;
  drivers: TelemetryDriver[];
};

function parseGapValue(value: OpenF1Interval["gap_to_leader"]): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const trimmed = String(value).trim();
  const match = trimmed.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickLatestLap(laps: OpenF1Lap[]) {
  const latest = new Map<number, OpenF1Lap>();
  for (const lap of laps) {
    const existing = latest.get(lap.driver_number);
    if (!existing) {
      latest.set(lap.driver_number, lap);
      continue;
    }
    if (lap.lap_number > existing.lap_number) {
      latest.set(lap.driver_number, lap);
      continue;
    }
    if (lap.lap_number === existing.lap_number) {
      const lapTs = lap.date_start ? Date.parse(lap.date_start) : 0;
      const existingTs = existing.date_start ? Date.parse(existing.date_start) : 0;
      if (lapTs > existingTs) {
        latest.set(lap.driver_number, lap);
      }
    }
  }
  return latest;
}

function pickLatestInterval(intervals: OpenF1Interval[]) {
  const latest = new Map<number, OpenF1Interval>();
  for (const interval of intervals) {
    const existing = latest.get(interval.driver_number);
    if (!existing) {
      latest.set(interval.driver_number, interval);
      continue;
    }
    const lapNumber = interval.lap_number ?? -1;
    const existingLap = existing.lap_number ?? -1;
    if (lapNumber > existingLap) {
      latest.set(interval.driver_number, interval);
      continue;
    }
    if (lapNumber === existingLap) {
      const intervalTs = interval.date ? Date.parse(interval.date) : 0;
      const existingTs = existing.date ? Date.parse(existing.date) : 0;
      if (intervalTs > existingTs) {
        latest.set(interval.driver_number, interval);
      }
    }
  }
  return latest;
}

export function buildTelemetryResponse(
  session: OpenF1Session,
  drivers: OpenF1Driver[],
  laps: OpenF1Lap[],
  intervals: OpenF1Interval[]
): TelemetryResponse {
  const latestLaps = pickLatestLap(laps);
  const latestIntervals = pickLatestInterval(intervals);

  const lapTimes = Array.from(latestLaps.values())
    .map((lap) => lap.lap_duration)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const bestLap = lapTimes.length ? Math.min(...lapTimes) : null;

  const driverRows: TelemetryDriver[] = drivers.map((driver) => {
    const lap = latestLaps.get(driver.driver_number);
    const interval = latestIntervals.get(driver.driver_number);

    const code =
      driver.name_acronym || driver.broadcast_name || driver.full_name || String(driver.driver_number);
    const driverMeta = DRIVERS[code];

    const lapTime = lap?.lap_duration ?? null;
    const sectors: [number | null, number | null, number | null] = [
      lap?.duration_sector_1 ?? null,
      lap?.duration_sector_2 ?? null,
      lap?.duration_sector_3 ?? null,
    ];

    const deltaToBest =
      lapTime !== null && bestLap !== null && Number.isFinite(lapTime)
        ? Number((lapTime - bestLap).toFixed(3))
        : null;

    const gapToLeader = parseGapValue(interval?.gap_to_leader ?? null);

    return {
      code,
      name: driverMeta?.name || driver.full_name || driver.broadcast_name || code,
      team: driverMeta?.team || driver.team_name || "Unknown",
      color: driverMeta?.color || DEFAULT_DRIVER_COLOR,
      position: lap?.position ?? null,
      lap: lap?.lap_number ?? null,
      lapTime: lapTime !== null ? Number(lapTime.toFixed(3)) : null,
      deltaToBest,
      gapToLeader: gapToLeader !== null ? Number(gapToLeader.toFixed(3)) : null,
      sectors: sectors.map((value) => (value !== null ? Number(value.toFixed(3)) : null)) as [
        number | null,
        number | null,
        number | null
      ],
      stint: null,
    };
  });

  const sortedDrivers = driverRows.sort((a, b) => {
    if (a.position === null && b.position === null) return 0;
    if (a.position === null) return 1;
    if (b.position === null) return -1;
    return a.position - b.position;
  });

  const sessionYear =
    session.year ?? (session.date_start ? new Date(session.date_start).getUTCFullYear() : undefined);
  const sessionSlugBase = `${session.circuit_short_name || session.session_name}`.trim();
  const slug = `${sessionYear ?? "unknown"}-${sessionSlugBase}`
    .toLowerCase()
    .replace(/\\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return {
    session: slug,
    timestamp: Math.floor(Date.now() / 1000),
    drivers: sortedDrivers,
  };
}
