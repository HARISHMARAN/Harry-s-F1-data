import { NextResponse } from "next/server";
import { buildTelemetryResponse } from "../../../lib/analytics";
import {
  getDrivers,
  getIntervals,
  getLaps,
  getLapsForLapNumbers,
  getLatestRaceSession,
  getNextRaceSession,
} from "../../../lib/openf1";

export const runtime = "nodejs";

type TelemetryPayload =
  | (ReturnType<typeof buildTelemetryResponse> & {
      status: "live";
      next_session?: null;
    })
  | {
      status: "no_live";
      session: string;
      timestamp: number;
      drivers: ReturnType<typeof buildTelemetryResponse>["drivers"];
      next_session: {
        session_key: number | string;
        session_name: string;
        session_type: string;
        country_name: string;
        location: string;
        circuit_short_name: string;
        date_start: string | null;
        date_end: string | null;
      } | null;
    };

let cachedPayload: TelemetryPayload | null = null;
let lastFetchMs = 0;
const CACHE_TTL_MS = 5000;
let inFlight: Promise<TelemetryPayload> | null = null;

async function fetchWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3) {
  let attempt = 0;
  let delayMs = 500;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  throw new Error("Retry attempts exhausted");
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedPayload && now - lastFetchMs < CACHE_TTL_MS) {
      return NextResponse.json(cachedPayload, { status: 200 });
    }

    if (!inFlight) {
      inFlight = (async () => {
        const session = await fetchWithRetry(() => getLatestRaceSession());
        if (!session) {
          const nextSession = await fetchWithRetry(() => getNextRaceSession());
          return {
            status: "no_live",
            session: "no-live-session",
            timestamp: Math.floor(Date.now() / 1000),
            drivers: [],
            next_session: nextSession
              ? {
                  session_key: nextSession.session_key,
                  session_name: nextSession.session_name,
                  session_type: nextSession.session_type ?? "Race",
                  country_name: nextSession.country_name ?? "",
                  location: nextSession.location ?? "",
                  circuit_short_name: nextSession.circuit_short_name ?? nextSession.session_name,
                  date_start: nextSession.date_start ?? null,
                  date_end: nextSession.date_end ?? null,
                }
              : null,
          };
        }

        const [drivers, intervals] = await Promise.all([
          fetchWithRetry(() => getDrivers(session.session_key)),
          fetchWithRetry(() => getIntervals(session.session_key)),
        ]);

        const lapNumbers = intervals
          .map((interval) => interval.lap_number)
          .filter((lap): lap is number => typeof lap === "number" && Number.isFinite(lap));

        const maxLap = lapNumbers.length ? Math.max(...lapNumbers) : null;
        const laps =
          maxLap !== null
            ? await fetchWithRetry(() => getLapsForLapNumbers(session.session_key, [maxLap, maxLap - 1]))
            : await fetchWithRetry(() => getLaps(session.session_key));

        return {
          status: "live",
          ...buildTelemetryResponse(session, drivers, laps, intervals),
        };
      })();
    }

    const telemetry = await inFlight;
    inFlight = null;
    cachedPayload = telemetry;
    lastFetchMs = now;
    return NextResponse.json(telemetry, { status: 200 });
  } catch (error) {
    inFlight = null;
    if (cachedPayload) {
      return NextResponse.json(cachedPayload, {
        status: 200,
        headers: { "x-telemetry-stale": "true" },
      });
    }
    const nextSession = await getNextRaceSession().catch(() => null);
    return NextResponse.json(
      {
        status: "no_live",
        session: "no-live-session",
        timestamp: Math.floor(Date.now() / 1000),
        drivers: [],
        next_session: nextSession
          ? {
              session_key: nextSession.session_key,
              session_name: nextSession.session_name,
              session_type: nextSession.session_type ?? "Race",
              country_name: nextSession.country_name ?? "",
              location: nextSession.location ?? "",
              circuit_short_name: nextSession.circuit_short_name ?? nextSession.session_name,
              date_start: nextSession.date_start ?? null,
              date_end: nextSession.date_end ?? null,
            }
          : null,
      },
      { status: 200 }
    );
  }
}
