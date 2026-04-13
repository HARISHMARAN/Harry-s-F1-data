import {
  getMeetings,
  getRaceSessions,
  type OpenF1Meeting,
  type OpenF1Session,
} from "../openf1";

/**
 * detectRace.ts
 * Responsible for:
 * - finding the most recent completed race session within a reporting window
 * - returning normalized race/session metadata
 * - returning a typed “not found” result if no qualifying race exists
 *
 * Not responsible for:
 * - podium / finishers
 * - fastest lap
 * - AI summary
 * - email formatting or sending
 */

export type DetectRaceOptions = {
  now?: Date;
  windowDays?: number;
};

export type ReportableRaceSession = {
  sessionKey: number;
  sessionName: string;
  meetingName?: string | null;
  countryName?: string | null;
  circuitShortName?: string | null;
  dateStart: string;
  dateEnd?: string | null;
  year: number;
};

export type DetectRaceResult =
  | {
      status: "found";
      session: ReportableRaceSession;
      windowStart: string;
      windowEnd: string;
    }
  | {
      status: "none";
      windowStart: string;
      windowEnd: string;
    };

function safeParseDate(value?: string | null) {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function normalizeSession(
  session: OpenF1Session,
  meetingName: string | null
): ReportableRaceSession {
  const startTs = safeParseDate(session.date_start);
  if (startTs === null) {
    throw new Error("Invalid session date_start");
  }
  const derivedYear = new Date(startTs).getUTCFullYear();
  const year = session.year ?? derivedYear;

  return {
    sessionKey: session.session_key,
    sessionName: session.session_name,
    meetingName,
    dateStart: session.date_start,
    dateEnd: session.date_end ?? null,
    year,
    circuitShortName: session.circuit_short_name ?? null,
    countryName: session.country_name ?? null,
  };
}

function getSessionEndMs(session: OpenF1Session) {
  const endTs = safeParseDate(session.date_end ?? null);
  if (endTs !== null) return endTs;
  const startTs = safeParseDate(session.date_start);
  if (startTs === null) return null;
  // Assume a 2-hour window if end is missing.
  return startTs + 2 * 60 * 60 * 1000;
}

export async function detectReportableRaceSession(
  options: DetectRaceOptions = {}
): Promise<DetectRaceResult> {
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? 7;
  const windowEnd = now.getTime();
  const windowStart = windowEnd - windowDays * 24 * 60 * 60 * 1000;

  const currentYear = now.getUTCFullYear();
  const years = [currentYear, currentYear - 1];
  let sessions: OpenF1Session[] = [];
  let meetings: OpenF1Meeting[] = [];

  try {
    sessions = (await Promise.all(years.map((year) => getRaceSessions(year)))).flat();
  } catch (err) {
    console.error("detectRace: failed to fetch race sessions", err);
    return {
      status: "none",
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: new Date(windowEnd).toISOString(),
    };
  }

  try {
    meetings = (await Promise.all(years.map((year) => getMeetings(year)))).flat();
  } catch (err) {
    console.warn("detectRace: failed to fetch meetings", err);
    meetings = [];
  }

  const meetingNameByKey = new Map<number, string>();
  meetings.forEach((meeting) => {
    if (!meeting.meeting_key || !meeting.meeting_name) return;
    meetingNameByKey.set(meeting.meeting_key, meeting.meeting_name);
  });

  const reportable = sessions
    .map((session) => {
      const endMs = getSessionEndMs(session);
      const startMs = safeParseDate(session.date_start);
      return { session, endMs, startMs };
    })
    .filter((item) => item.endMs !== null)
    .filter((item) => {
      const endMs = item.endMs as number;
      return endMs >= windowStart && endMs <= windowEnd;
    })
    .filter((item) => item.startMs !== null)
    .sort((a, b) => (b.endMs as number) - (a.endMs as number));

  if (!reportable.length) {
    return {
      status: "none",
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: new Date(windowEnd).toISOString(),
    };
  }

  const chosen = reportable[0].session;
  const meetingName = chosen.meeting_key
    ? meetingNameByKey.get(chosen.meeting_key) ?? null
    : null;
  return {
    status: "found",
    session: normalizeSession(chosen, meetingName),
    windowStart: new Date(windowStart).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
  };
}
