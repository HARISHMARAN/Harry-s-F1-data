import type { OpenF1Driver, OpenF1Lap, OpenF1Stint } from './openf1';

export type ReplayTyrePerLapSample = {
  session_key: number;
  driver_number: number;
  lap_number: number;
  compound: string | null;
};

export type ReplayPitStop = {
  session_key: number;
  driver_number: number;
  pit_in_lap: number;
  pit_out_lap: number;
  compound_in: string | null;
  compound_out: string | null;
};

export type ReplayStrategyStint = {
  compound: string;
  lap_start: number;
  lap_end: number;
  laps: number;
  average_lap_time: number | null;
  degradation: number | null;
};

export type ReplayStrategySummary = {
  session_key: number;
  driver_number: number;
  driver_name: string;
  start_compound: string | null;
  first_stop_lap: number | null;
  total_stops: number;
  compounds_used: string[];
  laps_per_compound: Record<string, number>;
  stints: ReplayStrategyStint[];
  summary: string;
};

const UNKNOWN_COMPOUND = 'UNKNOWN';

function normalizeCompound(compound?: string | null) {
  const value = (compound ?? '').trim();
  return value.length ? value.toUpperCase() : null;
}

function getCompoundForLap(stints: OpenF1Stint[], driverNumber: number, lapNumber: number) {
  const match = stints
    .filter((entry) => {
      if (entry.driver_number !== driverNumber) return false;
      const start = Number(entry.lap_start ?? 0);
      const end = Number(entry.lap_end ?? Number.MAX_SAFE_INTEGER);
      return lapNumber >= start && lapNumber <= end;
    })
    .sort((a, b) => Number(a.lap_start ?? 0) - Number(b.lap_start ?? 0))[0];

  return normalizeCompound(match?.compound ?? null);
}

function derivePitStopsFromStints(sessionKey: number, stints: OpenF1Stint[]) {
  const byDriver = new Map<number, OpenF1Stint[]>();
  stints.forEach((stint) => {
    const existing = byDriver.get(stint.driver_number);
    if (existing) {
      existing.push(stint);
    } else {
      byDriver.set(stint.driver_number, [stint]);
    }
  });

  const stops: ReplayPitStop[] = [];

  byDriver.forEach((driverStints, driverNumber) => {
    const ordered = [...driverStints].sort((a, b) => {
      const stintA = Number(a.stint_number ?? Number.MAX_SAFE_INTEGER);
      const stintB = Number(b.stint_number ?? Number.MAX_SAFE_INTEGER);
      if (stintA !== stintB) return stintA - stintB;
      return Number(a.lap_start ?? 0) - Number(b.lap_start ?? 0);
    });

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const current = ordered[index];
      const next = ordered[index + 1];

      const pitOutLap = Number(next.lap_start ?? 0);
      if (pitOutLap <= 1) continue;

      const pitInLap = Math.max(1, Number(current.lap_end ?? pitOutLap - 1));
      stops.push({
        session_key: sessionKey,
        driver_number: driverNumber,
        pit_in_lap: pitInLap,
        pit_out_lap: pitOutLap,
        compound_in: normalizeCompound(current.compound),
        compound_out: normalizeCompound(next.compound),
      });
    }
  });

  return stops;
}

function derivePitStopsFromLaps(sessionKey: number, laps: OpenF1Lap[]) {
  return laps
    .filter((lap) => Boolean(lap.is_pit_out_lap) && lap.lap_number > 1)
    .map((lap) => ({
      session_key: sessionKey,
      driver_number: lap.driver_number,
      pit_in_lap: Math.max(1, lap.lap_number - 1),
      pit_out_lap: lap.lap_number,
      compound_in: null,
      compound_out: null,
    }));
}

export function derivePitStops(sessionKey: number, laps: OpenF1Lap[], stints: OpenF1Stint[]) {
  const fromStints = derivePitStopsFromStints(sessionKey, stints);
  if (fromStints.length > 0) return fromStints;
  return derivePitStopsFromLaps(sessionKey, laps);
}

export function deriveTyrePerLap(
  sessionKey: number,
  laps: OpenF1Lap[],
  stints: OpenF1Stint[]
): ReplayTyrePerLapSample[] {
  return laps.map((lap) => ({
    session_key: sessionKey,
    driver_number: lap.driver_number,
    lap_number: lap.lap_number,
    compound: getCompoundForLap(stints, lap.driver_number, lap.lap_number) ?? normalizeCompound(lap.compound ?? null),
  }));
}

function computeStintMetrics(laps: OpenF1Lap[], compound: string, lapStart: number, lapEnd: number): ReplayStrategyStint {
  const stintLaps = laps
    .filter((lap) => lap.lap_number >= lapStart && lap.lap_number <= lapEnd)
    .sort((a, b) => a.lap_number - b.lap_number);

  const timed = stintLaps
    .map((lap) => lap.lap_duration)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const averageLapTime = timed.length > 0 ? Number((timed.reduce((sum, value) => sum + value, 0) / timed.length).toFixed(3)) : null;

  const firstTimed = timed[0] ?? null;
  const lastTimed = timed[timed.length - 1] ?? null;
  const degradation =
    firstTimed !== null && lastTimed !== null ? Number((lastTimed - firstTimed).toFixed(3)) : null;

  return {
    compound,
    lap_start: lapStart,
    lap_end: lapEnd,
    laps: Math.max(0, lapEnd - lapStart + 1),
    average_lap_time: averageLapTime,
    degradation,
  };
}

export function deriveStrategySummaries(
  sessionKey: number,
  drivers: OpenF1Driver[],
  laps: OpenF1Lap[],
  stints: OpenF1Stint[],
  pitStops: ReplayPitStop[]
): ReplayStrategySummary[] {
  const byDriverLaps = new Map<number, OpenF1Lap[]>();
  laps.forEach((lap) => {
    const existing = byDriverLaps.get(lap.driver_number);
    if (existing) {
      existing.push(lap);
    } else {
      byDriverLaps.set(lap.driver_number, [lap]);
    }
  });

  const byDriverStints = new Map<number, OpenF1Stint[]>();
  stints.forEach((stint) => {
    const existing = byDriverStints.get(stint.driver_number);
    if (existing) {
      existing.push(stint);
    } else {
      byDriverStints.set(stint.driver_number, [stint]);
    }
  });

  const byDriverPitStops = new Map<number, ReplayPitStop[]>();
  pitStops.forEach((stop) => {
    const existing = byDriverPitStops.get(stop.driver_number);
    if (existing) {
      existing.push(stop);
    } else {
      byDriverPitStops.set(stop.driver_number, [stop]);
    }
  });

  return drivers.map((driver) => {
    const driverName = driver.broadcast_name ?? driver.name_acronym ?? `Driver ${driver.driver_number}`;
    const driverLaps = [...(byDriverLaps.get(driver.driver_number) ?? [])].sort((a, b) => a.lap_number - b.lap_number);
    const driverStints = [...(byDriverStints.get(driver.driver_number) ?? [])].sort((a, b) => {
      const stintA = Number(a.stint_number ?? Number.MAX_SAFE_INTEGER);
      const stintB = Number(b.stint_number ?? Number.MAX_SAFE_INTEGER);
      if (stintA !== stintB) return stintA - stintB;
      return Number(a.lap_start ?? 0) - Number(b.lap_start ?? 0);
    });

    const stintsFromSource: ReplayStrategyStint[] = driverStints
      .map((stint) => {
        const lapStart = Number(stint.lap_start ?? 0);
        const lapEnd = Number(stint.lap_end ?? lapStart);
        if (lapStart <= 0 || lapEnd < lapStart) return null;

        return computeStintMetrics(
          driverLaps,
          normalizeCompound(stint.compound) ?? UNKNOWN_COMPOUND,
          lapStart,
          lapEnd
        );
      })
      .filter((entry): entry is ReplayStrategyStint => entry !== null);

    const stops = (byDriverPitStops.get(driver.driver_number) ?? []).sort((a, b) => a.pit_out_lap - b.pit_out_lap);

    const compoundsUsed = Array.from(new Set(stintsFromSource.map((stint) => stint.compound)));
    const lapsPerCompound = stintsFromSource.reduce<Record<string, number>>((acc, stint) => {
      acc[stint.compound] = (acc[stint.compound] ?? 0) + stint.laps;
      return acc;
    }, {});

    const firstStopLap = stops.length > 0 ? stops[0].pit_in_lap : null;
    const startCompound = stintsFromSource[0]?.compound ?? null;

    const summaryBits: string[] = [];
    if (startCompound) summaryBits.push(`Started on ${startCompound}`);
    summaryBits.push(stops.length > 0 ? `${stops.length} stop${stops.length > 1 ? 's' : ''}` : 'No stops');
    if (compoundsUsed.length > 0) summaryBits.push(`Compounds: ${compoundsUsed.join(' → ')}`);

    return {
      session_key: sessionKey,
      driver_number: driver.driver_number,
      driver_name: driverName,
      start_compound: startCompound,
      first_stop_lap: firstStopLap,
      total_stops: stops.length,
      compounds_used: compoundsUsed,
      laps_per_compound: lapsPerCompound,
      stints: stintsFromSource,
      summary: summaryBits.join(' | '),
    };
  });
}
