import { NextResponse } from "next/server";
import { DRIVERS } from "../../../../../lib/constants/drivers";
import {
  getCarData,
  getDrivers,
  getLaps,
  getRaceControl,
  getSessionPositions,
  getStints,
  getTeamRadio,
  getWeather,
  getRaceSessions,
  type OpenF1Lap,
  type OpenF1CarData,
  type OpenF1Stint,
  type OpenF1Session,
} from "../../../../../lib/openf1";
import {
  derivePitStops,
  deriveStrategySummaries,
  deriveTyrePerLap,
} from "../../../../../lib/replay-intelligence";

export const runtime = "nodejs";

function normalizeTeamColour(colour?: string | null) {
  if (!colour) return "AAAAAA";
  return colour.replace("#", "");
}

function computeTimeBounds(laps: OpenF1Lap[], fallbackStart: string, fallbackEnd?: string | null) {
  if (laps.length === 0) {
    return {
      start_time: fallbackStart,
      end_time: fallbackEnd ?? new Date(Date.parse(fallbackStart) + 90 * 60 * 1000).toISOString(),
    };
  }

  const starts = laps
    .map((lap) => (lap.date_start ? Date.parse(lap.date_start) : Date.parse(fallbackStart)))
    .filter((v) => Number.isFinite(v));
  const minStart = Math.min(...starts);
  let maxEnd = minStart;

  for (const lap of laps) {
    const start = lap.date_start ? Date.parse(lap.date_start) : minStart;
    const duration = lap.lap_duration ? lap.lap_duration * 1000 : 90_000;
    maxEnd = Math.max(maxEnd, start + duration);
  }

  return {
    start_time: new Date(minStart).toISOString(),
    end_time: new Date(maxEnd).toISOString(),
  };
}

function getLapEndTime(lap: OpenF1Lap, nextLap?: OpenF1Lap) {
  if (nextLap?.date_start) {
    return Date.parse(nextLap.date_start);
  }
  const lapStart = lap.date_start ? Date.parse(lap.date_start) : Date.now();
  return lap.lap_duration ? lapStart + lap.lap_duration * 1000 : lapStart + 90_000;
}

function deriveCompoundForLap(stints: OpenF1Stint[], driverNumber: number, lapNumber: number) {
  const stint = stints
    .filter((entry) => {
      if (entry.driver_number !== driverNumber) return false;
      const start = Number(entry.lap_start ?? 0);
      const end = Number(entry.lap_end ?? Number.MAX_SAFE_INTEGER);
      return lapNumber >= start && lapNumber <= end;
    })
    .sort((a, b) => Number(a.lap_start ?? 0) - Number(b.lap_start ?? 0))[0];

  return stint?.compound ?? null;
}

function deriveDrsUsageForLap(carData: OpenF1CarData[], lapStartMs: number, lapEndMs: number) {
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
  driverCarData: OpenF1CarData[],
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

type ReplayCacheEntry = {
  payload: unknown;
  timestamp: number;
};

const CACHE_FRESH_TTL_MS = 10 * 60_000;
const CACHE_STALE_TTL_MS = 3 * 60 * 60_000;
const cache = new Map<string, ReplayCacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string; round: string }> }
) {
  try {
    const requestUrl = new URL(request.url);
    const includeTelemetry = requestUrl.searchParams.get("telemetry") === "1";
    const resolved = await params;
    const year = Number(resolved.year);
    const round = Number(resolved.round);
    if (!Number.isFinite(year) || !Number.isFinite(round)) {
      return NextResponse.json({ error: "Invalid year or round" }, { status: 400 });
    }

    const cacheKey = `${year}-${round}-${includeTelemetry ? "telemetry" : "core"}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    const cacheAge = cached ? now - cached.timestamp : Number.POSITIVE_INFINITY;

    if (cached && cacheAge < CACHE_FRESH_TTL_MS) {
      return NextResponse.json(cached.payload, { status: 200, headers: { "x-replay-cache": "hit" } });
    }

    if (!inFlight.has(cacheKey) && (!cached || cacheAge >= CACHE_FRESH_TTL_MS)) {
      inFlight.set(
        cacheKey,
        (async () => {
          const warnings: string[] = [];
          const sessions =
            (await fetchWithRetry(() => getRaceSessions(year), "sessions", warnings)) ?? [];

          const sortedSessions = [...sessions].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
          const raceSession: OpenF1Session | undefined = sortedSessions[round - 1];
          if (!raceSession) {
            throw new Error("Race session not found");
          }

          const [driversRaw, laps] = await Promise.all([
            fetchWithRetry(() => getDrivers(raceSession.session_key), "drivers", warnings),
            fetchWithRetry(() => getLaps(raceSession.session_key), "laps", warnings),
          ]);

          const [stints, carData] = await Promise.all([
            fetchWithRetry(() => getStints(raceSession.session_key), "stints", warnings),
            includeTelemetry
              ? Promise.all(
                  (driversRaw ?? []).map((driver) =>
                    fetchWithRetry(
                      () => getCarData(raceSession.session_key, driver.driver_number),
                      `car_data_${driver.driver_number}`,
                      warnings,
                      1,
                      4_500
                    )
                  )
                ).then((rows) => rows.flat().filter(Boolean) as OpenF1CarData[])
              : Promise.resolve([] as OpenF1CarData[]),
          ]);

          const [positions, raceControl, weather, teamRadio] = await Promise.all([
            fetchWithRetry(
              () => getSessionPositions(raceSession.session_key),
              "positions",
              warnings
            ),
            fetchWithRetry(
              () => getRaceControl(raceSession.session_key),
              "race_control",
              warnings
            ),
            fetchWithRetry(
              () => getWeather(raceSession.session_key),
              "weather",
              warnings
            ),
            fetchWithRetry(
              () => getTeamRadio(raceSession.session_key),
              "team_radio",
              warnings
            ),
          ]);

          const safeDrivers = driversRaw ?? [];
          const safeLaps = laps ?? [];
          const safeStints = stints ?? [];
          const pitStops = derivePitStops(raceSession.session_key, safeLaps, safeStints);
          const tyrePerLap = deriveTyrePerLap(raceSession.session_key, safeLaps, safeStints);
          const strategySummaries = deriveStrategySummaries(
            raceSession.session_key,
            safeDrivers,
            safeLaps,
            safeStints,
            pitStops
          );
          const drivers = safeDrivers.map((driver) => {
            const code = driver.name_acronym ?? driver.broadcast_name ?? String(driver.driver_number);
            const meta = DRIVERS[code] ?? null;
            return {
              session_key: raceSession.session_key,
              driver_number: driver.driver_number,
              broadcast_name: driver.broadcast_name ?? code,
              full_name: meta?.name ?? driver.full_name ?? code,
              name_acronym: code,
              team_name: meta?.team ?? driver.team_name ?? "Unknown",
              team_colour: normalizeTeamColour(meta?.color ?? driver.team_colour ?? "AAAAAA"),
              first_name: driver.first_name ?? meta?.name?.split(" ")[0] ?? code,
              last_name: driver.last_name ?? meta?.name?.split(" ").slice(1).join(" ") ?? code,
              headshot_url: driver.headshot_url ?? "",
              country_code: driver.country_code ?? "",
            };
          });

          const lapsByDriver = new Map<number, OpenF1Lap[]>();
          for (const lap of safeLaps) {
            const rows = lapsByDriver.get(lap.driver_number);
            if (rows) {
              rows.push(lap);
            } else {
              lapsByDriver.set(lap.driver_number, [lap]);
            }
          }

          const carDataByDriver = new Map<number, OpenF1CarData[]>();
          for (const sample of carData) {
            const rows = carDataByDriver.get(sample.driver_number);
            if (rows) {
              rows.push(sample);
            } else {
              carDataByDriver.set(sample.driver_number, [sample]);
            }
          }

          const drsZoneMap = new Map<
            string,
            { start_fraction: number; end_fraction: number; sample_count: number }
          >();

          const drsZones = includeTelemetry
            ? (() => {
                safeDrivers.forEach((driver) => {
                  const driverLaps = lapsByDriver.get(driver.driver_number) ?? [];
                  const driverCarData = carDataByDriver.get(driver.driver_number) ?? [];
                  const zones = buildDrsZones(driverCarData, driverLaps);

                  zones.forEach((zone) => {
                    const key = `${Math.round(zone.start_fraction * 1000)}-${Math.round(zone.end_fraction * 1000)}`;
                    const existing = drsZoneMap.get(key);
                    if (existing) {
                      existing.start_fraction = Math.min(existing.start_fraction, zone.start_fraction);
                      existing.end_fraction = Math.max(existing.end_fraction, zone.end_fraction);
                      existing.sample_count += zone.sample_count;
                      return;
                    }

                    drsZoneMap.set(key, {
                      start_fraction: zone.start_fraction,
                      end_fraction: zone.end_fraction,
                      sample_count: zone.sample_count,
                    });
                  });
                });

                return Array.from(drsZoneMap.values())
                  .sort((a, b) => a.start_fraction - b.start_fraction)
                  .map((zone, index) => ({
                    ...zone,
                    label: `DRS ${index + 1}`,
                  }));
              })()
            : [];

          const enrichedLaps = safeLaps.map((lap) => {
            const driverLaps = lapsByDriver.get(lap.driver_number) ?? [];
            const orderedDriverLaps = [...driverLaps].sort((a, b) => {
              const aStart = a.date_start ? Date.parse(a.date_start) : 0;
              const bStart = b.date_start ? Date.parse(b.date_start) : 0;
              return aStart - bStart;
            });
            const currentIndex = orderedDriverLaps.findIndex(
              (entry) => entry.lap_number === lap.lap_number && entry.date_start === lap.date_start
            );
            const nextLap = currentIndex >= 0 ? orderedDriverLaps[currentIndex + 1] : undefined;
            const lapStart = lap.date_start ? Date.parse(lap.date_start) : 0;
            const lapEnd = getLapEndTime(lap, nextLap);
            const driverCarData = carDataByDriver.get(lap.driver_number) ?? [];

            return {
              ...lap,
              compound: deriveCompoundForLap(safeStints, lap.driver_number, lap.lap_number),
              drs_used: includeTelemetry ? deriveDrsUsageForLap(driverCarData, lapStart, lapEnd) : null,
            };
          });

          const totalLaps = safeLaps.reduce((max, lap) => Math.max(max, lap.lap_number), 0);
          const timeBounds = computeTimeBounds(safeLaps, raceSession.date_start, raceSession.date_end ?? null);

          return {
            session: {
              session_key: raceSession.session_key,
              session_type: raceSession.session_type ?? raceSession.session_name ?? "Race",
              session_name: raceSession.session_name,
              date_start: raceSession.date_start,
              date_end: raceSession.date_end ?? null,
              meeting_key: raceSession.meeting_key ?? null,
              circuit_key: raceSession.circuit_key ?? null,
              circuit_short_name: raceSession.circuit_short_name ?? "",
              country_name: raceSession.country_name ?? "",
              location: raceSession.location ?? "",
              year: year,
              round: round,
            },
            drivers,
            laps: enrichedLaps,
            positions: positions ?? [],
            race_control: raceControl ?? [],
            stints: safeStints.map((stint) => ({
              session_key: raceSession.session_key,
              driver_number: stint.driver_number,
              stint_number: stint.stint_number ?? null,
              lap_start: stint.lap_start ?? null,
              lap_end: stint.lap_end ?? null,
              compound: stint.compound ?? null,
              tyre_age_at_start: stint.tyre_age_at_start ?? null,
            })),
            pit_stops: pitStops,
            tyre_per_lap: tyrePerLap,
            strategy_summaries: strategySummaries,
            weather: (weather ?? []).map((sample) => ({
              session_key: raceSession.session_key,
              date: sample.date,
              air_temperature: sample.air_temperature ?? null,
              track_temperature: sample.track_temperature ?? null,
              humidity: sample.humidity ?? null,
              pressure: sample.pressure ?? null,
              rainfall: sample.rainfall ?? null,
              wind_direction: sample.wind_direction ?? null,
              wind_speed: sample.wind_speed ?? null,
            })),
            team_radio: (teamRadio ?? []).map((item) => ({
              session_key: raceSession.session_key,
              date: item.date,
              driver_number: item.driver_number ?? null,
              recording_url: item.recording_url ?? null,
              transcript: item.transcript ?? item.message ?? null,
            })),
            track: {
              points: [],
              source_driver_number: drivers[0]?.driver_number ?? 0,
            },
            drs_zones: drsZones,
            total_laps: totalLaps,
            start_time: timeBounds.start_time,
            end_time: timeBounds.end_time,
            warnings,
            telemetry_included: includeTelemetry,
          };
        })()
      );
    }

    if (cached && cacheAge < CACHE_STALE_TTL_MS) {
      return NextResponse.json(cached.payload, {
        status: 200,
        headers: { "x-replay-cache": "stale-while-revalidate" },
      });
    }

    try {
      const payload = await inFlight.get(cacheKey)!;
      inFlight.delete(cacheKey);
      cache.set(cacheKey, { payload, timestamp: Date.now() });
      return NextResponse.json(payload);
    } catch (error) {
      inFlight.delete(cacheKey);
      if (cached) {
        return NextResponse.json(cached.payload, {
          status: 200,
          headers: { "x-replay-cache": "stale" },
        });
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: "Failed to build replay dataset", detail: message }, { status: 503 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to build replay dataset", detail: message }, { status: 500 });
  }
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  warnings: string[],
  maxAttempts = 3,
  timeoutMs = 12_000
): Promise<T | null> {
  let attempt = 0;
  let delayMs = 500;

  while (attempt < maxAttempts) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      attempt += 1;
      const message = err instanceof Error ? err.message : String(err);
      if (attempt >= maxAttempts) {
        warnings.push(`${label} unavailable: ${message}`);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }

  warnings.push(`${label} unavailable: exceeded retries`);
  return null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
