import { NextResponse } from "next/server";
import { getLatestRaceSession, getSessionPositions } from "../../../../lib/openf1";

export const runtime = "nodejs";

let cached: unknown[] | null = null;
let lastFetchMs = 0;
const CACHE_TTL_MS = 15000;
let inFlight: Promise<unknown[]> | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - lastFetchMs < CACHE_TTL_MS) {
      return NextResponse.json({ points: cached, timestamp: Math.floor(now / 1000) });
    }

    if (!inFlight) {
      inFlight = (async () => {
        const session = await getLatestRaceSession();
        if (!session) {
          throw new Error("No race session available.");
        }
        return getSessionPositions(session.session_key);
      })();
    }

    const points = await inFlight;
    inFlight = null;
    cached = points;
    lastFetchMs = now;

    return NextResponse.json({ points, timestamp: Math.floor(now / 1000) });
  } catch (error) {
    inFlight = null;
    if (cached) {
      return NextResponse.json(
        { points: cached, timestamp: Math.floor(Date.now() / 1000), stale: true },
        { status: 200, headers: { "x-replay-stale": "true" } }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch replay positions", detail: message }, { status: 500 });
  }
}
