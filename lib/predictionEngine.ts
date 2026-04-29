import { fetchHistoricalData, fetchSeasonRaces } from '../src/services/jolpica';
import {
  getDrivers,
  getLaps,
  getNextRaceSession,
  getNextSession,
  getRaceControl,
  getSessions,
  type OpenF1Driver,
  type OpenF1Lap,
  type OpenF1RaceControl,
  type OpenF1Session,
} from './openf1';

type ResultRow = {
  position: number;
  driverCode: string;
  driverName: string;
  teamName: string;
};

type SessionResult = {
  source: 'actual' | 'partial' | 'not_started' | 'unavailable' | 'not_scheduled';
  leader?: string;
  podium: string[];
  rows: ResultRow[];
  note: string;
};

export type WeekendPrediction = {
  id: string;
  label: string;
  sessionName: string;
  sessionType: string;
  scheduledAt: string | null;
  status: 'scheduled' | 'live' | 'completed' | 'not_scheduled';
  confidence: number;
  winner: string;
  podium: string[];
  basis: string;
  resultSource: SessionResult['source'];
  liveSignals: string[];
  unavailableReason?: string;
};

const SOURCE_TIMEOUT_MS = 6_000;
const SESSION_RESULT_LIMIT = 5;

export type PredictionForecastRequest = {
  grandPrix?: string;
  year?: number;
};

export type PredictionForecastResponse = {
  title: string;
  raceName: string;
  roundLabel: string;
  confidence: number;
  winner: string;
  podium: string[];
  narrative: string;
  factors: string[];
  sources: string[];
  updatedAt: string;
  matchedBy: string;
  weekend: WeekendPrediction[];
  weekendStatus: {
    meetingKey: number | null;
    circuit: string;
    location: string;
    nextSession: string | null;
    latestCompletedSession: string | null;
    liveSession: string | null;
  };
  dataSignals: {
    latestRaceWinner?: string;
    sameRoundWinner?: string;
    liveLeader?: string;
    circuit?: string;
  };
};

function normalize(value: string) {
  return value.toLowerCase().replace(/grand prix|gp/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function withSourceTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), SOURCE_TIMEOUT_MS);
    promise
      .then((value) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(() => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(fallback);
      });
  });
}

function mapHistoricalRows(race: Awaited<ReturnType<typeof fetchHistoricalData>>) {
  return race.leaderboard
    .map((row) => ({
      position: row.position,
      driverCode: row.name_acronym,
      driverName: row.full_name,
      teamName: row.team_name,
    }))
    .filter((row) => Number.isFinite(row.position) && row.position > 0);
}

function scoreRows(rows: ResultRow[], weight: number, scores: Map<string, number>) {
  rows.forEach((row) => {
    const base = Math.max(1, 25 - row.position);
    scores.set(row.driverCode, (scores.get(row.driverCode) ?? 0) + base * weight);
  });
}

function topDrivers(scores: Map<string, number>, limit = 3) {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([driverCode]) => driverCode);
}

function confidenceFromScores(scores: Map<string, number>, floor: number, boost = 0) {
  const values = [...scores.values()].sort((a, b) => b - a);
  const spread = values.length >= 2 ? values[0] - values[1] : values[0] ?? 0;
  return Math.max(floor, Math.min(96, Math.round(floor + spread * 2.1 + boost)));
}

function sessionStatus(session: OpenF1Session, now: Date): WeekendPrediction['status'] {
  const start = Date.parse(session.date_start);
  const end = session.date_end ? Date.parse(session.date_end) : start + 3 * 60 * 60 * 1000;
  const nowTs = now.getTime();
  if (Number.isFinite(start) && nowTs < start) return 'scheduled';
  if (Number.isFinite(start) && Number.isFinite(end) && nowTs <= end + 60 * 60 * 1000) return 'live';
  return 'completed';
}

function getDriverCode(driverNumber: number, drivers: OpenF1Driver[]) {
  const driver = drivers.find((entry) => entry.driver_number === driverNumber);
  return driver?.name_acronym ?? driver?.broadcast_name ?? String(driverNumber);
}

function bestLapRows(laps: OpenF1Lap[], drivers: OpenF1Driver[]) {
  const best = new Map<number, OpenF1Lap>();
  laps.forEach((lap) => {
    if (typeof lap.lap_duration !== 'number' || !Number.isFinite(lap.lap_duration)) return;
    const existing = best.get(lap.driver_number);
    if (!existing || (lap.lap_duration ?? Number.MAX_SAFE_INTEGER) < (existing.lap_duration ?? Number.MAX_SAFE_INTEGER)) {
      best.set(lap.driver_number, lap);
    }
  });

  return [...best.values()]
    .sort((a, b) => (a.lap_duration ?? Number.MAX_SAFE_INTEGER) - (b.lap_duration ?? Number.MAX_SAFE_INTEGER))
    .map((lap, index) => ({
      position: index + 1,
      driverCode: getDriverCode(lap.driver_number, drivers),
      driverName: getDriverCode(lap.driver_number, drivers),
      teamName: drivers.find((driver) => driver.driver_number === lap.driver_number)?.team_name ?? 'Unknown',
    }));
}

function racePositionRows(laps: OpenF1Lap[], drivers: OpenF1Driver[]) {
  const latest = new Map<number, OpenF1Lap>();
  laps.forEach((lap) => {
    const existing = latest.get(lap.driver_number);
    if (!existing || lap.lap_number > existing.lap_number) latest.set(lap.driver_number, lap);
  });

  return [...latest.values()]
    .filter((lap) => typeof lap.position === 'number')
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
    .map((lap) => ({
      position: lap.position ?? Number.MAX_SAFE_INTEGER,
      driverCode: getDriverCode(lap.driver_number, drivers),
      driverName: getDriverCode(lap.driver_number, drivers),
      teamName: drivers.find((driver) => driver.driver_number === lap.driver_number)?.team_name ?? 'Unknown',
    }));
}

function raceControlSignals(messages: OpenF1RaceControl[]) {
  return messages
    .filter((message) => message.message)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 3)
    .map((message) => `${message.flag ? `${message.flag}: ` : ''}${message.message}`);
}

async function fetchSessionResult(session: OpenF1Session, now: Date): Promise<SessionResult> {
  const status = sessionStatus(session, now);
  if (status === 'scheduled') {
    return {
      source: 'not_started',
      podium: [],
      rows: [],
      note: 'Session has not started yet. Prediction is pre-session only.',
    };
  }

  const [drivers, laps] = await Promise.all([
    withSourceTimeout(getDrivers(session.session_key), []),
    withSourceTimeout(getLaps(session.session_key), []),
  ]);

  const rows = session.session_type === 'Race'
    ? racePositionRows(laps, drivers)
    : bestLapRows(laps, drivers);

  if (!rows.length) {
    return {
      source: 'unavailable',
      podium: [],
      rows: [],
      note: 'OpenF1 has not published usable lap/classification data for this session yet.',
    };
  }

  return {
    source: status === 'live' ? 'partial' : 'actual',
    leader: rows[0]?.driverCode,
    podium: rows.slice(0, 3).map((row) => row.driverCode),
    rows: rows.slice(0, SESSION_RESULT_LIMIT),
    note: status === 'live' ? 'Using latest partial OpenF1 session data.' : 'Using published OpenF1 session data.',
  };
}

function sessionWeight(session: OpenF1Session) {
  const name = session.session_name.toLowerCase();
  if (name.includes('sprint qualifying')) return 0.65;
  if (name.includes('qualifying')) return 1.25;
  if (name.includes('sprint')) return 0.8;
  if (session.session_type === 'Race') return 1.45;
  if (name.includes('practice 2')) return 0.45;
  return 0.35;
}

function addPriorSessionSignals(
  scores: Map<string, number>,
  completed: Array<{ session: OpenF1Session; result: SessionResult }>,
  target: OpenF1Session,
) {
  completed
    .filter((entry) => Date.parse(entry.session.date_start) <= Date.parse(target.date_start))
    .forEach((entry) => {
      if (entry.result.rows.length) scoreRows(entry.result.rows, sessionWeight(entry.session), scores);
    });
}

function sessionLabel(id: string) {
  if (id === 'practice1') return 'Free Practice 1';
  if (id === 'practice2') return 'Free Practice 2';
  if (id === 'sprintQualifying') return 'Sprint Qualifying';
  if (id === 'sprint') return 'Sprint';
  if (id === 'qualifying') return 'Qualifying';
  return 'Main Race';
}

function pickWeekendSession(sessions: OpenF1Session[], id: WeekendPrediction['id']) {
  if (id === 'practice1') return sessions.find((session) => session.session_name === 'Practice 1') ?? null;
  if (id === 'practice2') return sessions.find((session) => session.session_name === 'Practice 2') ?? null;
  if (id === 'sprintQualifying') return sessions.find((session) => session.session_name === 'Sprint Qualifying') ?? null;
  if (id === 'sprint') return sessions.find((session) => session.session_name === 'Sprint') ?? null;
  if (id === 'qualifying') return sessions.find((session) => session.session_name === 'Qualifying') ?? null;
  return sessions.find((session) => session.session_name === 'Race') ?? null;
}

function buildPredictionForSession(input: {
  id: string;
  session: OpenF1Session | null;
  baselineScores: Map<string, number>;
  completedSignals: Array<{ session: OpenF1Session; result: SessionResult }>;
  sessionResult: SessionResult | null;
  liveSignals: string[];
  now: Date;
}): WeekendPrediction {
  if (!input.session) {
    return {
      id: input.id,
      label: sessionLabel(input.id),
      sessionName: sessionLabel(input.id),
      sessionType: 'Not scheduled',
      scheduledAt: null,
      status: 'not_scheduled',
      confidence: 0,
      winner: 'N/A',
      podium: [],
      basis: input.id === 'practice2'
        ? 'Miami is scheduled as a sprint weekend in OpenF1, so Free Practice 2 is not listed.'
        : 'This session is not listed in the OpenF1 Miami weekend schedule.',
      resultSource: 'not_scheduled',
      liveSignals: [],
      unavailableReason: 'Not scheduled for this Grand Prix weekend.',
    };
  }

  const scores = new Map(input.baselineScores);
  addPriorSessionSignals(scores, input.completedSignals, input.session);

  if (input.sessionResult?.rows.length) {
    scoreRows(input.sessionResult.rows, sessionWeight(input.session) * 1.2, scores);
  }

  const podium = topDrivers(scores, 3);
  const winner = podium[0] ?? input.sessionResult?.leader ?? 'TBD';
  const status = sessionStatus(input.session, input.now);
  const resultSource = input.sessionResult?.source ?? 'not_started';
  const boost = resultSource === 'actual' ? 10 : resultSource === 'partial' ? 6 : status === 'scheduled' ? 0 : 4;
  const confidence = scores.size ? confidenceFromScores(scores, status === 'scheduled' ? 54 : 60, boost) : 0;
  const basis = input.sessionResult?.rows.length
    ? `${input.sessionResult.note} Forecast reweighted with ${input.sessionResult.rows.slice(0, 3).map((row) => row.driverCode).join(', ')}.`
    : input.sessionResult?.note ?? 'Pre-session forecast based on recent race form, circuit history, and any earlier Miami weekend sessions.';

  return {
    id: input.id,
    label: sessionLabel(input.id),
    sessionName: input.session.session_name,
    sessionType: input.session.session_type ?? 'Session',
    scheduledAt: input.session.date_start ?? null,
    status,
    confidence,
    winner,
    podium,
    basis,
    resultSource,
    liveSignals: input.liveSignals,
  };
}

function meetingMatches(session: OpenF1Session, searchTerm: string) {
  if (!searchTerm) return false;
  const haystack = normalize([
    session.session_name,
    session.session_type ?? '',
    session.circuit_short_name ?? '',
    session.location ?? '',
    session.country_name ?? '',
  ].join(' '));
  return searchTerm.split(' ').every((part) => haystack.includes(part));
}

function isGenericSessionName(value: string) {
  return /^(practice \d|free practice \d|qualifying|sprint qualifying|sprint|race)$/i.test(value.trim());
}

function buildNarrative(winner: string, latestWinner?: string, sameRoundWinner?: string, liveLeader?: string, circuit?: string) {
  const parts = [
    `The current race model projects ${winner} for the main race`,
    latestWinner ? `recent form starts from ${latestWinner}` : null,
    sameRoundWinner ? `Miami history adds weight to ${sameRoundWinner}` : null,
    liveLeader ? `the latest OpenF1 session leader is ${liveLeader}` : null,
    circuit ? `at ${circuit}` : null,
  ].filter(Boolean);

  return `${parts.join(', ')}.`;
}

export async function buildPredictionForecast(request: PredictionForecastRequest): Promise<PredictionForecastResponse> {
  const now = new Date();
  const year = request.year ?? now.getUTCFullYear();
  const rawSearch = request.grandPrix?.trim() ?? '';
  const searchTerm = isGenericSessionName(rawSearch) ? '' : normalize(rawSearch);

  const [allSessions, seasonRaces, latestRace, nextRace, nextSession] = await Promise.all([
    withSourceTimeout(getSessions(year), []),
    withSourceTimeout(fetchSeasonRaces(String(year)), []),
    withSourceTimeout(fetchHistoricalData(), null),
    withSourceTimeout(getNextRaceSession(), null),
    withSourceTimeout(getNextSession(), null),
  ]);

  const meetingKey =
    allSessions.find((session) => meetingMatches(session, searchTerm))?.meeting_key ??
    nextSession?.meeting_key ??
    nextRace?.meeting_key ??
    null;

  const weekendSessions = allSessions
    .filter((session) => meetingKey !== null && session.meeting_key === meetingKey)
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));

  const raceSession = pickWeekendSession(weekendSessions, 'race') ?? nextRace;
  const raceName = raceSession?.circuit_short_name
    ? `${raceSession.circuit_short_name} Grand Prix`
    : rawSearch || nextRace?.session_name || 'Next Grand Prix';

  const selectedRace = seasonRaces.find((race) => {
    const raceNameNormalized = normalize(race.raceName);
    const target = normalize(raceSession?.circuit_short_name ?? raceName);
    return raceNameNormalized.includes(target) || target.includes(raceNameNormalized);
  }) ?? null;

  const baselineScores = new Map<string, number>();
  const factors: string[] = [];
  const sources = [
    'OpenF1 Miami weekend schedule',
    'OpenF1 live/session lap data',
    'Jolpica latest completed race results',
  ];

  if (latestRace) {
    scoreRows(mapHistoricalRows(latestRace), 0.55, baselineScores);
    factors.push(`Recent form: ${latestRace.session.session_name}`);
  }

  let sameRoundWinner: string | undefined;
  if (selectedRace && Number.isFinite(Number(selectedRace.round))) {
    const previousSeasonRaces = await withSourceTimeout(fetchSeasonRaces(String(year - 1)), []);
    const previousRaceMatch = previousSeasonRaces.find((race) => normalize(race.raceName).includes(normalize(selectedRace.raceName)));
    const historyRound = previousRaceMatch?.round ?? selectedRace.round;
    const sameRound = await withSourceTimeout(fetchHistoricalData(String(year - 1), historyRound), null);
    if (sameRound) {
      scoreRows(mapHistoricalRows(sameRound), 0.35, baselineScores);
      sameRoundWinner = sameRound.leaderboard[0]?.name_acronym;
      factors.push(`Circuit history: ${sameRound.session.session_name}`);
      sources.push(`Jolpica ${year - 1} ${sameRound.session.session_name} results`);
    }
  }

  if (!baselineScores.size) {
    ['PIA', 'NOR', 'RUS', 'ANT', 'LEC', 'VER'].forEach((driver, index) => baselineScores.set(driver, 12 - index));
    factors.push('Fallback 2026 contender ranking used because live and historical sources were unavailable.');
  }

  const sessionIds = ['practice1', 'practice2', 'sprintQualifying', 'sprint', 'qualifying', 'race'];
  const sessionsById = new Map(sessionIds.map((id) => [id, pickWeekendSession(weekendSessions, id)]));
  const startedSessions = [...sessionsById.values()]
    .filter((session): session is OpenF1Session => Boolean(session))
    .filter((session) => Date.parse(session.date_start) <= now.getTime());

  const resultEntries = await Promise.all(
    startedSessions.map(async (session) => ({
      session,
      result: await fetchSessionResult(session, now),
      raceControl: await withSourceTimeout(getRaceControl(session.session_key), []),
    })),
  );

  const completedSignals = resultEntries
    .filter((entry) => entry.result.source === 'actual' || entry.result.source === 'partial')
    .map((entry) => ({ session: entry.session, result: entry.result }));

  const currentLiveEntry = resultEntries.find((entry) => sessionStatus(entry.session, now) === 'live');
  const liveLeader = currentLiveEntry?.result.leader;
  const liveSignals = currentLiveEntry
    ? [
        `${currentLiveEntry.session.session_name}: ${currentLiveEntry.result.note}`,
        ...raceControlSignals(currentLiveEntry.raceControl),
      ].slice(0, 4)
    : [];

  const weekend = sessionIds.map((id) => {
    const session = sessionsById.get(id) ?? null;
    const result = session
      ? resultEntries.find((entry) => entry.session.session_key === session.session_key)?.result ?? null
      : null;
    return buildPredictionForSession({
      id,
      session,
      baselineScores,
      completedSignals,
      sessionResult: result,
      liveSignals,
      now,
    });
  });

  const racePrediction = weekend.find((prediction) => prediction.id === 'race') ?? weekend[weekend.length - 1];
  const latestWinner = latestRace?.leaderboard[0]?.name_acronym;
  const latestCompletedSession = resultEntries
    .filter((entry) => entry.result.source === 'actual')
    .sort((a, b) => Date.parse(b.session.date_start) - Date.parse(a.session.date_start))[0]?.session.session_name ?? null;

  return {
    title: 'Miami Weekend Prediction Studio',
    raceName,
    roundLabel: selectedRace ? `Round ${selectedRace.round}` : 'Miami weekend',
    confidence: racePrediction?.confidence ?? 0,
    winner: racePrediction?.winner ?? 'TBD',
    podium: racePrediction?.podium ?? [],
    narrative: buildNarrative(racePrediction?.winner ?? 'TBD', latestWinner, sameRoundWinner, liveLeader, raceSession?.circuit_short_name ?? raceName),
    factors,
    sources,
    updatedAt: now.toISOString(),
    matchedBy: meetingKey
      ? `Matched OpenF1 meeting ${meetingKey} at ${raceSession?.location ?? 'Miami Gardens'}`
      : 'Fell back to next scheduled OpenF1 race',
    weekend,
    weekendStatus: {
      meetingKey,
      circuit: raceSession?.circuit_short_name ?? 'Miami',
      location: raceSession?.location ?? 'Miami Gardens',
      nextSession: nextSession?.session_name ?? null,
      latestCompletedSession,
      liveSession: currentLiveEntry?.session.session_name ?? null,
    },
    dataSignals: {
      latestRaceWinner: latestWinner,
      sameRoundWinner,
      liveLeader,
      circuit: raceSession?.circuit_short_name ?? raceName,
    },
  };
}
