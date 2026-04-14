export type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end?: string | null;
  circuit_short_name?: string | null;
  country_name?: string | null;
  location?: string | null;
  meeting_key?: number | null;
  circuit_key?: number | null;
  session_type?: string | null;
  year?: number | null;
};

export type OpenF1Meeting = {
  meeting_key: number;
  meeting_name?: string | null;
  date_start: string;
  date_end?: string | null;
  circuit_short_name?: string | null;
  country_name?: string | null;
  location?: string | null;
  year?: number | null;
};

export type OpenF1Driver = {
  driver_number: number;
  name_acronym?: string | null;
  full_name?: string | null;
  broadcast_name?: string | null;
  team_name?: string | null;
  team_colour?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  headshot_url?: string | null;
  country_code?: string | null;
};

export type OpenF1Lap = {
  driver_number: number;
  lap_number: number;
  lap_duration?: number | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
  position?: number | null;
  date_start?: string | null;
};

export type OpenF1Interval = {
  driver_number: number;
  gap_to_leader?: string | number | null;
  interval?: string | number | null;
  date?: string | null;
  lap_number?: number | null;
};

export type OpenF1RaceControl = {
  date: string;
  category?: string | null;
  flag?: string | null;
  message?: string | null;
  lap_number?: number | null;
  driver_number?: number | null;
};

const BASE_URL = "https://api.openf1.org/v1/";

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchOpenF1<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = buildUrl(path, params);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, { cache: "no-store" });

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`OpenF1 request failed (${response.status}): ${url}`);
    }

    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));
  }

  // Unreachable — loop always throws above
  throw new Error(`OpenF1 request failed after retries: ${url}`);
}

export async function getLatestRaceSession(now = new Date()): Promise<OpenF1Session | null> {
  const year = now.getUTCFullYear();
  let sessions: OpenF1Session[] = [];

  try {
    sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", {
      year,
      session_name: "Race",
    });
  } catch {
    sessions = [];
  }

  if (!sessions.length) {
    try {
      sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", {
        session_name: "Race",
      });
    } catch {
      sessions = [];
    }
  }

  if (!sessions.length) return null;

  const nowTs = now.getTime();
  const sorted = sessions
    .filter((session) => (session.date_start ? Date.parse(session.date_start) <= nowTs : true))
    .sort((a, b) => {
      const aTs = a.date_start ? Date.parse(a.date_start) : 0;
      const bTs = b.date_start ? Date.parse(b.date_start) : 0;
      return bTs - aTs;
    });

  return sorted[0] ?? sessions[0] ?? null;
}

export async function getNextRaceSession(now = new Date()): Promise<OpenF1Session | null> {
  const year = now.getUTCFullYear();

  const fetchYear = async (targetYear: number) => {
    try {
      return await fetchOpenF1<OpenF1Session[]>("/sessions", {
        year: targetYear,
        session_name: "Race",
      });
    } catch {
      return [] as OpenF1Session[];
    }
  };

  const sessionsThisYear = await fetchYear(year);
  const nextInYear = sessionsThisYear
    .filter((session) => (session.date_start ? Date.parse(session.date_start) > now.getTime() : false))
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))[0];

  if (nextInYear) return nextInYear;

  const sessionsNextYear = await fetchYear(year + 1);
  return sessionsNextYear
    .filter((session) => session.date_start)
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))[0] ?? null;
}

export async function getDrivers(sessionKey: number) {
  return fetchOpenF1<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
}

export async function getMeetings(year: number) {
  return fetchOpenF1<OpenF1Meeting[]>("/meetings", { year });
}

export async function getSessionsForMeeting(meetingKey: number) {
  return fetchOpenF1<OpenF1Session[]>("/sessions", { meeting_key: meetingKey });
}

export async function getRaceSessions(year: number) {
  let sessions: OpenF1Session[] = [];
  try {
    sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", { year, session_name: "Race" });
  } catch {
    sessions = [];
  }

  if (!sessions.length) {
    try {
      sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", { session_name: "Race" });
      const filtered = sessions.filter((session) => session.year === year);
      if (filtered.length) return filtered;
    } catch {
      sessions = [];
    }
  }

  return sessions;
}

export async function getLaps(sessionKey: number) {
  return fetchOpenF1<OpenF1Lap[]>("/laps", { session_key: sessionKey });
}

export async function getLapsForLapNumbers(sessionKey: number, lapNumbers: number[]) {
  const uniqueLapNumbers = Array.from(new Set(lapNumbers)).filter((lap) => lap >= 0);
  if (!uniqueLapNumbers.length) return [];

  const results = await Promise.all(
    uniqueLapNumbers.map((lap_number) =>
      fetchOpenF1<OpenF1Lap[]>("/laps", { session_key: sessionKey, lap_number })
    )
  );

  return results.flat();
}

export async function getIntervals(sessionKey: number) {
  return fetchOpenF1<OpenF1Interval[]>("/intervals", { session_key: sessionKey });
}

export async function getRaceControl(sessionKey: number) {
  return fetchOpenF1<OpenF1RaceControl[]>("/race_control", { session_key: sessionKey });
}

export type OpenF1Position = {
  driver_number: number;
  date: string;
  x: number | null;
  y: number | null;
};

export async function getSessionPositions(sessionKey: number | string) {
  return fetchOpenF1<OpenF1Position[]>("/position", { session_key: sessionKey });
}
