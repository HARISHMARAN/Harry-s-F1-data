import { NextResponse } from "next/server";
import { buildTelemetryResponse } from "../../../lib/analytics";
import {
  getDrivers,
  getIntervals,
  getLaps,
  getLapsForLapNumbers,
  getLatestRaceSession,
} from "../../../lib/openf1";

export const runtime = "nodejs";

let cachedPayload: ReturnType<typeof buildTelemetryResponse> | null = null;
let lastFetchMs = 0;
const CACHE_TTL_MS = 5000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedPayload && now - lastFetchMs < CACHE_TTL_MS) {
      return NextResponse.json(cachedPayload, { status: 200 });
    }

    const session = await getLatestRaceSession();
    if (!session) {
      return NextResponse.json(
        { error: "No race session found for current year." },
        { status: 404 }
      );
    }

    const [drivers, intervals] = await Promise.all([
      getDrivers(session.session_key),
      getIntervals(session.session_key),
    ]);

    const lapNumbers = intervals
      .map((interval) => interval.lap_number)
      .filter((lap): lap is number => typeof lap === "number" && Number.isFinite(lap));

    const maxLap = lapNumbers.length ? Math.max(...lapNumbers) : null;
    const laps = maxLap !== null ? await getLapsForLapNumbers(session.session_key, [maxLap, maxLap - 1]) : await getLaps(session.session_key);

    const telemetry = buildTelemetryResponse(session, drivers, laps, intervals);
    cachedPayload = telemetry;
    lastFetchMs = now;
    return NextResponse.json(telemetry, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch telemetry", detail: message },
      { status: 500 }
    );
  }
}
