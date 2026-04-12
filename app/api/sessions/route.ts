import { NextResponse } from "next/server";
import { getMeetings, getSessionsForMeeting, type OpenF1Meeting, type OpenF1Session } from "../../../lib/openf1";

export const runtime = "nodejs";

let cached: unknown[] | null = null;
let cachedYear: number | null = null;
let lastFetchMs = 0;
const CACHE_TTL_MS = 60_000;
let inFlight: Promise<unknown[]> | null = null;

function buildSessionSummaries(meetings: OpenF1Meeting[], sessions: OpenF1Session[]) {
  const meetingsByKey = new Map<number, OpenF1Meeting>();
  meetings.forEach((meeting) => meetingsByKey.set(meeting.meeting_key, meeting));

  const sortedMeetings = [...meetings].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
  const roundByMeeting = new Map<number, number>();
  sortedMeetings.forEach((meeting, idx) => roundByMeeting.set(meeting.meeting_key, idx + 1));

  return sessions
    .filter((session) => session.session_name?.toLowerCase() === "race")
    .map((session) => {
      const meeting = meetingsByKey.get(session.meeting_key ?? -1);
      const round = meeting ? roundByMeeting.get(meeting.meeting_key) ?? null : null;
      return {
        session_key: session.session_key,
        session_type: session.session_type ?? session.session_name ?? "Race",
        session_name: session.session_name,
        date_start: session.date_start,
        date_end: session.date_end ?? null,
        meeting_key: session.meeting_key ?? meeting?.meeting_key ?? null,
        circuit_key: session.circuit_key ?? null,
        circuit_short_name: session.circuit_short_name ?? meeting?.circuit_short_name ?? "",
        country_name: session.country_name ?? meeting?.country_name ?? "",
        location: session.location ?? meeting?.location ?? "",
        year: session.year ?? meeting?.year ?? null,
        round: round ?? null,
      };
    })
    .filter((row) => row.round !== null);
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
        const meetings = await getMeetings(year);
        const sessionsByMeeting = await Promise.all(
          meetings.map((meeting) => getSessionsForMeeting(meeting.meeting_key))
        );
        const sessions = sessionsByMeeting.flat();
        return buildSessionSummaries(meetings, sessions);
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
