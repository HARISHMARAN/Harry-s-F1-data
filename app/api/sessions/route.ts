import { NextResponse } from "next/server";
import { getRaceSessions, type OpenF1Session } from "../../../lib/openf1";

export const runtime = "nodejs";

let cached: unknown[] | null = null;
let cachedYear: number | null = null;
let lastFetchMs = 0;
const CACHE_TTL_MS = 60_000;
let inFlight: Promise<unknown[]> | null = null;

function buildSessionSummaries(sessions: OpenF1Session[]) {
  const sorted = [...sessions].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  return sorted.map((session, idx) => ({
    session_key: session.session_key,
    session_type: session.session_type ?? session.session_name ?? "Race",
    session_name: session.session_name,
    date_start: session.date_start,
    date_end: session.date_end ?? null,
    meeting_key: session.meeting_key ?? null,
    circuit_key: session.circuit_key ?? null,
    circuit_short_name: session.circuit_short_name ?? "",
    country_name: session.country_name ?? "",
    location: session.location ?? "",
    year: session.year ?? null,
    round: idx + 1,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = Number(searchParams.get("year"));
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getUTCFullYear();

    const now = Date.now();
    if (cached && cachedYear === year && now - lastFetchMs < CACHE_TTL_MS) {
      return NextResponse.json(cached);
    }

    if (!inFlight) {
      inFlight = (async () => {
        const sessions = await getRaceSessions(year);
        return buildSessionSummaries(sessions);
      })();
    }

    const payload = await inFlight;
    inFlight = null;
    cached = payload;
    cachedYear = year;
    lastFetchMs = now;
    return NextResponse.json(payload);
  } catch (error) {
    inFlight = null;
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch sessions", detail: message }, { status: 500 });
  }
}
