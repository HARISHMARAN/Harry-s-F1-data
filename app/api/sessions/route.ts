import { NextResponse } from "next/server";
import { getRaceSessions, type OpenF1Session } from "../../../lib/openf1";

export const runtime = "nodejs";

type CacheEntry = {
  payload: unknown[];
  fetchedAt: number;
  staleAt: number;
};

const FRESH_TTL_MS = 60_000;
const STALE_TTL_MS = 15 * 60_000;
const yearCache = new Map<number, CacheEntry>();
const inFlight = new Map<number, Promise<unknown[]>>();

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

async function refreshYear(year: number): Promise<unknown[]> {
  if (!inFlight.has(year)) {
    inFlight.set(
      year,
      (async () => {
        const sessions = await getRaceSessions(year);
        const payload = buildSessionSummaries(sessions);
        const now = Date.now();
        yearCache.set(year, {
          payload,
          fetchedAt: now,
          staleAt: now + STALE_TTL_MS,
        });
        return payload;
      })()
    );
  }

  try {
    return await inFlight.get(year)!;
  } finally {
    inFlight.delete(year);
  }
}

function warmCommonYears() {
  const currentYear = new Date().getUTCFullYear();
  void refreshYear(currentYear).catch(() => null);
  void refreshYear(currentYear - 1).catch(() => null);
}

let warmed = false;

export async function GET(request: Request) {
  try {
    if (!warmed) {
      warmed = true;
      warmCommonYears();
    }

    const { searchParams } = new URL(request.url);
    const yearParam = Number(searchParams.get("year"));
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getUTCFullYear();

    const cached = yearCache.get(year);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < FRESH_TTL_MS) {
      return NextResponse.json(cached.payload, {
        headers: { "x-sessions-cache": "hit" },
      });
    }

    if (cached && now < cached.staleAt) {
      void refreshYear(year).catch(() => null);
      return NextResponse.json(cached.payload, {
        headers: { "x-sessions-cache": "stale-while-revalidate" },
      });
    }

    const payload = await refreshYear(year);
    return NextResponse.json(payload, {
      headers: { "x-sessions-cache": "miss" },
    });
  } catch (error) {
    const { searchParams } = new URL(request.url);
    const yearParam = Number(searchParams.get("year"));
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getUTCFullYear();
    const stale = yearCache.get(year);

    if (stale) {
      return NextResponse.json(stale.payload, {
        status: 200,
        headers: { "x-sessions-cache": "stale-on-error" },
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch sessions", detail: message }, { status: 500 });
  }
}
