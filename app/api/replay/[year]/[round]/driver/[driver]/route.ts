import { NextResponse } from "next/server";
import { getCarData, getLaps, getRaceSessions, type OpenF1Lap } from "../../../../../../../lib/openf1";

export const runtime = "nodejs";

function findLatestIndexByTime<T>(rows: T[], targetTime: number, getTimestamp: (row: T) => number) {
  let low = 0;
  let high = rows.length - 1;
  let answer = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sampleTime = getTimestamp(rows[mid]);

    if (sampleTime <= targetTime) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return answer;
}

function getLapEndTime(lap: OpenF1Lap, nextLap?: OpenF1Lap) {
  if (nextLap?.date_start) {
    return Date.parse(nextLap.date_start);
  }
  const lapStart = lap.date_start ? Date.parse(lap.date_start) : Date.now();
  return lap.lap_duration ? lapStart + lap.lap_duration * 1000 : lapStart + 90_000;
}

function findLapForTimestamp(laps: OpenF1Lap[], timestampMs: number) {
  const ordered = [...laps].sort((a, b) => {
    const aStart = a.date_start ? Date.parse(a.date_start) : 0;
    const bStart = b.date_start ? Date.parse(b.date_start) : 0;
    return aStart - bStart;
  });

  for (let index = 0; index < ordered.length; index += 1) {
    const lap = ordered[index];
    const start = lap.date_start ? Date.parse(lap.date_start) : 0;
    const next = ordered[index + 1];
    const end = next?.date_start
      ? Date.parse(next.date_start)
      : start + (lap.lap_duration ? lap.lap_duration * 1000 : 90_000);

    if (timestampMs >= start && timestampMs <= end) {
      return { lap, start, end };
    }
  }

  return null;
}

function buildDrsZones(
  driverCarData: Array<{ date: string; drs?: number | null; speed?: number | null; throttle?: number | null; brake?: number | null }>,
  driverLaps: OpenF1Lap[],
) {
  const samples: number[] = [];

  for (const sample of driverCarData) {
    const time = Date.parse(sample.date);
    const lapMatch = findLapForTimestamp(driverLaps, time);
    if (!lapMatch) continue;

    const drs = Number(sample.drs ?? 0);
    const speed = Number(sample.speed ?? 0);
    const throttle = Number(sample.throttle ?? 0);
    const brake = Number(sample.brake ?? 0);
    const active = [10, 12, 14].includes(drs) && speed >= 120 && throttle >= 80 && brake <= 10;

    if (!active) continue;

    const fraction = (time - lapMatch.start) / Math.max(lapMatch.end - lapMatch.start, 1000);
    if (fraction >= 0 && fraction <= 1) {
      samples.push(fraction);
    }
  }

  if (!samples.length) {
    return [];
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const zones: Array<{ start_fraction: number; end_fraction: number; sample_count: number }> = [];
  const gapThreshold = 0.06;
  let zoneStart = sorted[0];
  let zoneEnd = sorted[0];
  let count = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current - zoneEnd <= gapThreshold) {
      zoneEnd = current;
      count += 1;
      continue;
    }

    zones.push({ start_fraction: zoneStart, end_fraction: zoneEnd, sample_count: count });
    zoneStart = current;
    zoneEnd = current;
    count = 1;
  }

  zones.push({ start_fraction: zoneStart, end_fraction: zoneEnd, sample_count: count });

  return zones
    .filter((zone) => zone.end_fraction - zone.start_fraction >= 0.015 || zone.sample_count >= 4)
    .map((zone, index) => ({
      ...zone,
      label: `DRS ${index + 1}`,
    }));
}

function deriveDrsUsageForLap(
  carData: Array<{ date: string; drs?: number | null; speed?: number | null; throttle?: number | null; brake?: number | null }>,
  lapStartMs: number,
  lapEndMs: number
) {
  const samples = carData.filter((sample) => {
    const time = Date.parse(sample.date);
    return time >= lapStartMs && time <= lapEndMs;
  });

  return samples.some((sample) => {
    const drs = Number(sample.drs ?? 0);
    const speed = Number(sample.speed ?? 0);
    const throttle = Number(sample.throttle ?? 0);
    const brake = Number(sample.brake ?? 0);
    return [10, 12, 14].includes(drs) && speed >= 120 && throttle >= 80 && brake <= 10;
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ year: string; round: string; driver: string }> }
) {
  try {
    const resolved = await params;
    const year = Number(resolved.year);
    const round = Number(resolved.round);
    const driverNumber = Number(resolved.driver);

    if (!Number.isFinite(year) || !Number.isFinite(round) || !Number.isFinite(driverNumber)) {
      return NextResponse.json({ error: "Invalid year, round, or driver" }, { status: 400 });
    }

    const sessions = await getRaceSessions(year);
    const sortedSessions = [...sessions].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
    const raceSession = sortedSessions[round - 1];
    if (!raceSession) {
      return NextResponse.json({
        session_key: null,
        driver_number: driverNumber,
        drs_zones: [],
        lap_drs: [],
        telemetry: [],
      });
    }

    const [allLaps, driverCarData] = await Promise.all([
      getLaps(raceSession.session_key),
      getCarData(raceSession.session_key, driverNumber),
    ]);

    const driverLaps = allLaps
      .filter((lap) => lap.driver_number === driverNumber)
      .sort((a, b) => {
        const aStart = a.date_start ? Date.parse(a.date_start) : 0;
        const bStart = b.date_start ? Date.parse(b.date_start) : 0;
        return aStart - bStart;
      });

    const lapDrs = driverLaps.map((lap, index) => {
      const nextLap = driverLaps[index + 1];
      const lapStart = lap.date_start ? Date.parse(lap.date_start) : 0;
      const lapEnd = getLapEndTime(lap, nextLap);
      return {
        lap_number: lap.lap_number,
        date_start: lap.date_start,
        drs_used: deriveDrsUsageForLap(driverCarData, lapStart, lapEnd),
      };
    });

    const timeline = driverCarData
      .map((sample) => {
        const time = Date.parse(sample.date);
        const lapIdx = findLatestIndexByTime(driverLaps, time, (lap) => (lap.date_start ? Date.parse(lap.date_start) : 0));
        return {
          date: sample.date,
          lap_number: lapIdx >= 0 ? driverLaps[lapIdx].lap_number : null,
          drs: sample.drs ?? null,
          speed: sample.speed ?? null,
          throttle: sample.throttle ?? null,
          brake: sample.brake ?? null,
        };
      })
      .filter((sample) => sample.lap_number !== null);

    return NextResponse.json({
      session_key: raceSession.session_key,
      driver_number: driverNumber,
      drs_zones: buildDrsZones(driverCarData, driverLaps),
      lap_drs: lapDrs,
      telemetry: timeline,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to load driver replay telemetry", detail: message }, { status: 500 });
  }
}
