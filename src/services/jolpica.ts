import type { DashboardData, DriverPosition, SeasonRace } from '../types/f1';
import { DRIVERS } from '../../lib/constants/drivers';

// ─── OpenF1 tyre/stint enrichment ────────────────────────────────────────────

interface OpenF1SessionLookup {
  session_key: number;
  meeting_key: number;
}

interface OpenF1StintRaw {
  driver_number: number;
  stint_number: number;
  compound: string | null;
  lap_start: number | null;
  lap_end: number | null;
}

interface OpenF1DriverRaw {
  driver_number: number;
  name_acronym: string | null;
}

async function fetchOpenF1Json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function normaliseCompound(raw: string | null | undefined): string {
  if (!raw) return 'UNKNOWN';
  const s = raw.toUpperCase().trim();
  if (s.includes('INTER')) return 'INTER';
  if (s.includes('SOFT')) return 'SOFT';
  if (s.includes('MED')) return 'MEDIUM';
  if (s.includes('HARD')) return 'HARD';
  if (s.includes('WET')) return 'WET';
  return s;
}

type TyreMap = Map<number, { compound: string; stints: { compound: string; laps: number }[]; pitStops: number }>;

async function fetchTyreData(year: string, countryName: string): Promise<TyreMap> {
  const empty: TyreMap = new Map();
  try {
    // Find meeting by year + country
    const meetings = await fetchOpenF1Json<{ meeting_key: number; country_name: string; date_start: string }[]>(
      `https://api.openf1.org/v1/meetings?year=${year}`
    );
    if (!meetings) return empty;

    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const target = normalise(countryName);
    const meeting = meetings.find((m) => normalise(m.country_name ?? '').includes(target) || target.includes(normalise(m.country_name ?? '')));
    if (!meeting) return empty;

    // Find race session for that meeting
    const sessions = await fetchOpenF1Json<(OpenF1SessionLookup & { session_name: string; session_type?: string })[]>(
      `https://api.openf1.org/v1/sessions?meeting_key=${meeting.meeting_key}&session_name=Race`
    );
    if (!sessions?.length) return empty;

    const raceSession = sessions[0];

    // Fetch stints + drivers in parallel
    const [stints, drivers] = await Promise.all([
      fetchOpenF1Json<OpenF1StintRaw[]>(`https://api.openf1.org/v1/stints?session_key=${raceSession.session_key}`),
      fetchOpenF1Json<OpenF1DriverRaw[]>(`https://api.openf1.org/v1/drivers?session_key=${raceSession.session_key}`),
    ]);
    if (!stints || !drivers) return empty;

    // Build driver_number → acronym map
    const numToCode = new Map(drivers.map((d) => [d.driver_number, (d.name_acronym ?? '').toUpperCase()]));

    // Group stints by driver_number, sorted by stint_number
    const byDriver = new Map<number, OpenF1StintRaw[]>();
    for (const stint of stints) {
      const arr = byDriver.get(stint.driver_number) ?? [];
      arr.push(stint);
      byDriver.set(stint.driver_number, arr);
    }

    const result: TyreMap = new Map();
    for (const [driverNum, driverStints] of byDriver) {
      const code = numToCode.get(driverNum);
      if (!code) continue;

      const sorted = driverStints.sort((a, b) => (a.stint_number ?? 0) - (b.stint_number ?? 0));
      // Only count stints with lap data as real stints (filter out safety-car/VSC end-of-race ghost stints)
      const realStints = sorted.filter((s) => s.lap_start !== null && s.lap_start > 0 && (s.lap_end === null || s.lap_end >= s.lap_start));

      const stintSummary = realStints.map((s) => ({
        compound: normaliseCompound(s.compound),
        laps: s.lap_end !== null && s.lap_start !== null ? s.lap_end - s.lap_start + 1 : 0,
      }));

      const lastCompound = normaliseCompound(realStints[realStints.length - 1]?.compound);
      const pitStops = Math.max(0, realStints.length - 1);

      result.set(driverNum, { compound: lastCompound, stints: stintSummary, pitStops });
    }

    return result;
  } catch {
    return empty;
  }
}

interface JolpicaSeasonResponse {
  MRData: {
    RaceTable: {
      Races: SeasonRace[];
    };
  };
}

interface JolpicaResult {
  position: string;
  number: string;
  grid: string;
  status: string;
  Time?: {
    time: string;
  };
  FastestLap?: {
    rank?: string;
    lap?: string;
    Time?: {
      time: string;
    };
  };
  Driver: {
    code?: string;
    givenName: string;
    familyName: string;
  };
  Constructor: {
    name: string;
  };
}

interface JolpicaRace {
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      country: string;
    };
  };
  Results: JolpicaResult[];
}

interface JolpicaResultsResponse {
  MRData: {
    RaceTable: {
      Races: JolpicaRace[];
    };
  };
}

export type CompletedRaceSummary = {
  raceName: string;
  round: string;
  date: string;
  circuitName: string;
  country: string;
  podium: {
    position: number;
    code: string;
    fullName: string;
    teamName: string;
    status: string;
  }[];
  fastestLap: {
    code: string;
    fullName: string;
    teamName: string;
    time: string;
    lap?: string;
  } | null;
};

// Fetching historical completed race data from Jolpica (Ergast replacement)

export async function fetchSeasonRaces(year: string): Promise<SeasonRace[]> {
  try {
    const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`);
    if (!response.ok) {
      throw new Error('Jolpica API Failed');
    }

    const json = (await response.json()) as JolpicaSeasonResponse;
    return json.MRData.RaceTable.Races || [];
  } catch (err: unknown) {
    void err;
    return [];
  }
}

export async function fetchHistoricalData(year?: string, round?: string): Promise<DashboardData> {
  try {
    let endpoint = 'https://api.jolpi.ca/ergast/f1/current/last/results.json';

    if (year && round) {
      endpoint = `https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`;
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Jolpica API Failed');
    }

    const json = (await response.json()) as JolpicaResultsResponse;
    const race = json.MRData.RaceTable.Races[0];

    if (!race) {
      throw new Error('No completed race data found for this selection.');
    }

    const effectiveYear = year ?? new Date().getFullYear().toString();

    // Fetch tyre/stint data from OpenF1 in parallel with result mapping
    const tyreMap = await fetchTyreData(effectiveYear, race.Circuit.Location.country);

    let maxBestLap = '--:--.---';
    let maxGrid = '--';

    const mappedLeaderboard: DriverPosition[] = race.Results.map((result) => {
      const code = result.Driver.code || 'UKN';
      const driverNumber = parseInt(result.number, 10);
      const meta = DRIVERS[code] || {
        color: '#ffffff',
        name: `${result.Driver.givenName} ${result.Driver.familyName}`,
        team: result.Constructor.name,
      };

      if (code === 'VER') {
        maxGrid = result.grid;
        if (result.FastestLap?.Time?.time) {
          maxBestLap = result.FastestLap.Time.time;
        }
      }

      const tyreData = tyreMap.get(driverNumber);

      return {
        position: parseInt(result.position, 10),
        driver_number: driverNumber,
        name_acronym: code,
        full_name: meta.name,
        team_name: result.Constructor.name,
        team_colour: meta.color,
        gap_to_leader: result.status === 'Finished' && result.Time ? result.Time.time : result.status,
        interval: null,
        last_lap: result.FastestLap?.Time?.time ?? null,
        tyre: tyreData?.compound ?? null,
        tyre_stints: tyreData?.stints ?? [],
        pit_stops: tyreData?.pitStops ?? null,
        lap_number: null,
      };
    });

    return {
      session: {
        session_key: race.round,
        session_name: race.raceName,
        session_type: 'Race',
        country_name: race.Circuit.Location.country,
        location: race.Circuit.circuitName,
        circuit_short_name: race.Circuit.circuitId,
        date_start: `${race.date}T${race.time || '00:00:00Z'}`,
        current_lap: 'FINISHED',
      },
      leaderboard: mappedLeaderboard,
      max_stats: {
        best_lap: maxBestLap,
        top_speed: 'UNAVAILABLE',
        started: `P${maxGrid}`,
        tyres: 'STATIC DATA',
      },
      live_status: 'LIVE',
      next_session: null,
    };
  } catch (err: unknown) {
    throw new Error('Unable to load latest completed race from Jolpica.', { cause: err });
  }
}

function getDriverDisplay(result: JolpicaResult) {
  const code = result.Driver.code || 'UKN';
  const meta = DRIVERS[code] || {
    color: '#ffffff',
    name: `${result.Driver.givenName} ${result.Driver.familyName}`,
    team: result.Constructor.name,
  };

  return {
    code,
    fullName: meta.name,
    teamName: result.Constructor.name,
  };
}

export async function fetchLatestCompletedRaceSummary(): Promise<CompletedRaceSummary> {
  return fetchCompletedRaceSummaryFromEndpoint('https://api.jolpi.ca/ergast/f1/current/last/results.json');
}

async function fetchCompletedRaceSummaryFromEndpoint(endpoint: string): Promise<CompletedRaceSummary> {
  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Jolpica API Failed');
    }

    const json = (await response.json()) as JolpicaResultsResponse;
    const race = json.MRData.RaceTable.Races[0];

    if (!race) {
      throw new Error('No completed race data found.');
    }

    const podium = race.Results.slice(0, 3).map((result) => ({
      position: parseInt(result.position, 10),
      ...getDriverDisplay(result),
      status: result.status === 'Finished' && result.Time ? result.Time.time : result.status,
    }));

    const fastestLapResult = race.Results
      .filter((result) => result.FastestLap?.Time?.time)
      .sort((a, b) => {
        const aRank = Number(a.FastestLap?.rank ?? Number.POSITIVE_INFINITY);
        const bRank = Number(b.FastestLap?.rank ?? Number.POSITIVE_INFINITY);
        return aRank - bRank;
      })[0];

    const fastestLap = fastestLapResult?.FastestLap?.Time?.time
      ? {
          ...getDriverDisplay(fastestLapResult),
          time: fastestLapResult.FastestLap.Time.time,
          lap: fastestLapResult.FastestLap.lap,
        }
      : null;

    return {
      raceName: race.raceName,
      round: race.round,
      date: race.date,
      circuitName: race.Circuit.circuitName,
      country: race.Circuit.Location.country,
      podium,
      fastestLap,
    };
  } catch (err: unknown) {
    throw new Error('Unable to load completed race summary from Jolpica.', { cause: err });
  }
}

function normalizeRaceName(value: string) {
  return value.toLowerCase().replace(/grand prix|gp/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function fetchRaceSummary(year: string, round: string): Promise<CompletedRaceSummary> {
  return fetchCompletedRaceSummaryFromEndpoint(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`);
}

export async function fetchPreviousEditionRaceSummary(grandPrix: string, currentYear: number): Promise<CompletedRaceSummary> {
  const targetYear = String(currentYear - 1);
  const search = normalizeRaceName(grandPrix);
  const races = await fetchSeasonRaces(targetYear);
  const match = races.find((race) => {
    const raceName = 'raceName' in race && typeof race.raceName === 'string' ? race.raceName : '';
    const normalized = normalizeRaceName(raceName);
    return search.split(' ').every((part) => normalized.includes(part)) || normalized.includes(search) || search.includes(normalized);
  });

  if (!match?.round) {
    throw new Error(`No previous edition found for ${grandPrix} in ${targetYear}.`);
  }

  return fetchRaceSummary(targetYear, match.round);
}
