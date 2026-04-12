export type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
  circuit_short_name?: string | null;
  country_name?: string | null;
  year?: number | null;
};

export type OpenF1Driver = {
  driver_number: number;
  name_acronym?: string | null;
  full_name?: string | null;
  broadcast_name?: string | null;
  team_name?: string | null;
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

const BASE_URL = "https://api.openf1.org/v1";

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function fetchOpenF1<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = buildUrl(path, params);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`OpenF1 request failed (${response.status}): ${url}`);
  }
  return response.json() as Promise<T>;
}

export async function getLatestRaceSession(now = new Date()): Promise<OpenF1Session | null> {
  const year = now.getUTCFullYear();
  let sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", {
    year,
    session_name: "Race",
  });

  if (!sessions.length) {
    sessions = await fetchOpenF1<OpenF1Session[]>("/sessions", {
      session_name: "Race",
    });
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

export async function getDrivers(sessionKey: number) {
  return fetchOpenF1<OpenF1Driver[]>("/drivers", { session_key: sessionKey });
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
