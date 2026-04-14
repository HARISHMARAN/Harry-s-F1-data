import { fetchHistoricalData, fetchSeasonRaces } from '../src/services/jolpica';
import { fetchLiveDashboardData } from '../src/services/openf1';
import { getNextRaceSession, getRaceSessions } from './openf1';

type ResultRow = {
  position: number;
  driverCode: string;
  driverName: string;
  teamName: string;
};

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
  dataSignals: {
    latestRaceWinner?: string;
    sameRoundWinner?: string;
    liveLeader?: string;
    circuit?: string;
  };
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreRows(rows: ResultRow[], weight: number, scores: Map<string, number>) {
  rows.forEach((row) => {
    const base = Math.max(1, 25 - row.position);
    const current = scores.get(row.driverCode) ?? 0;
    scores.set(row.driverCode, current + base * weight);
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

function topDrivers(scores: Map<string, number>, limit = 3) {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([driverCode]) => driverCode);
}

function buildNarrative(
  winner: string,
  latestWinner?: string,
  sameRoundWinner?: string,
  liveLeader?: string,
  circuit?: string,
) {
  const parts = [
    `The model projects ${winner} to win`,
    latestWinner ? `recent form points to ${latestWinner}` : null,
    sameRoundWinner ? `the circuit history leans on ${sameRoundWinner}` : null,
    liveLeader ? `live telemetry currently has ${liveLeader} as the pace reference` : null,
    circuit ? `at ${circuit}` : null,
  ].filter(Boolean);

  return `${parts.join(', ')}.`;
}

export async function buildPredictionForecast(request: PredictionForecastRequest): Promise<PredictionForecastResponse> {
  const now = new Date();
  const year = request.year ?? now.getUTCFullYear();
  const searchTerm = normalize(request.grandPrix ?? '');

  const [live, raceSessions, seasonRaces, latestRace, nextSession] = await Promise.all([
    fetchLiveDashboardData().catch(() => null),
    getRaceSessions(year).catch(() => []),
    fetchSeasonRaces(String(year)).catch(() => []),
    fetchHistoricalData().catch(() => null),
    getNextRaceSession().catch(() => null),
  ]);

  const openF1Schedule = raceSessions.find((session) => {
    if (!searchTerm) return false;
    return normalize(session.session_name).includes(searchTerm);
  });

  const scheduleCandidates = seasonRaces.filter((race) => {
    if (!searchTerm) return true;
    return normalize(race.raceName).includes(searchTerm);
  });

  const nextSessionCandidate = nextSession?.session_name
    ? seasonRaces.find((race) => normalize(race.raceName).includes(normalize(nextSession.session_name)))
    : null;

  const selectedRace = searchTerm ? scheduleCandidates[0] ?? null : nextSessionCandidate ?? scheduleCandidates[0] ?? null;
  const matchedRaceName =
    selectedRace?.raceName ??
    openF1Schedule?.session_name ??
    request.grandPrix?.trim() ??
    live?.next_session?.session_name ??
    nextSession?.session_name ??
    'Next Grand Prix';

  const matchedFrom = selectedRace
    ? `Matched against ${selectedRace.raceName} in the ${year} schedule`
    : openF1Schedule
      ? `Matched against the OpenF1 session ${openF1Schedule.session_name}`
      : live?.next_session?.session_name
        ? 'Matched against the next live session'
        : 'Fell back to the latest race data';

  const scores = new Map<string, number>();
  const factors: string[] = [];
  const sources = [
    'OpenF1 telemetry and session schedule',
    'Jolpica historical race results',
    'OpenF1 live API fallback',
  ];

  if (latestRace) {
    const latestRows = mapHistoricalRows(latestRace);
    scoreRows(latestRows, 0.65, scores);
    factors.push(`Recent race form: ${latestRace.session.session_name}`);
  }

  let sameRoundWinner: string | undefined;
  if (selectedRace && Number.isFinite(Number(selectedRace.round))) {
    const sameRound = await fetchHistoricalData(String(year - 1), selectedRace.round).catch(() => null);
    if (sameRound) {
      const sameRoundRows = mapHistoricalRows(sameRound);
      scoreRows(sameRoundRows, 0.35, scores);
      sameRoundWinner = sameRound.leaderboard[0]?.name_acronym;
      factors.push(`Circuit history: ${sameRound.session.session_name}`);
      sources.push(`Jolpica ${year - 1} round ${selectedRace.round} results`);
    }
  }

  if (live?.live_status === 'LIVE') {
    const liveRows = live.leaderboard.map((row) => ({
      position: row.position,
      driverCode: row.name_acronym,
      driverName: row.full_name,
      teamName: row.team_name,
    }));
    scoreRows(liveRows, 0.8, scores);
    factors.push(`Live pace signal: ${live.session.session_name}`);
  }

  if (openF1Schedule) {
    factors.push(`OpenF1 session match: ${openF1Schedule.session_name}`);
  }

  if (!scores.size) {
    scores.set('RUS', 10);
    scores.set('LEC', 9);
    scores.set('HAM', 8);
    factors.push('Fallback ranking used because schedule and historical data were unavailable.');
  }

  const podium = topDrivers(scores, 3);
  const winner = podium[0] ?? 'TBD';
  const latestWinner = latestRace?.leaderboard[0]?.name_acronym;
  const liveLeader = live?.leaderboard[0]?.name_acronym;
  const circuit = selectedRace?.raceName ?? live?.next_session?.circuit_short_name ?? latestRace?.session.location ?? openF1Schedule?.circuit_short_name ?? undefined;

  const values = [...scores.values()].sort((a, b) => b - a);
  const spread = values.length >= 2 ? values[0] - values[1] : values[0] ?? 0;
  const confidence = Math.max(52, Math.min(96, Math.round(58 + spread * 2.7 + (selectedRace ? 6 : 0) + (live?.live_status === 'LIVE' ? 8 : 0))));

  return {
    title: 'Master Prediction Studio',
    raceName: matchedRaceName,
    roundLabel: selectedRace ? `Round ${selectedRace.round}` : 'Auto-selected',
    confidence,
    winner,
    podium,
    narrative: buildNarrative(winner, latestWinner, sameRoundWinner, liveLeader, circuit),
    factors,
    sources,
    updatedAt: now.toISOString(),
    matchedBy: matchedFrom,
    dataSignals: {
      latestRaceWinner: latestWinner,
      sameRoundWinner,
      liveLeader,
      circuit,
    },
  };
}
