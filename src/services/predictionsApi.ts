export type PredictionScript = {
  id: string;
  title: string;
  race: string;
  category: 'Forecast' | 'Analysis';
  season: number;
  result: {
    headline: string;
    winner: string;
    podium: string[];
    note: string;
  };
};

export type PredictionListItem = Pick<PredictionScript, 'id' | 'title' | 'race' | 'category' | 'season'>;

export type PredictionListResponse = {
  repoSummary: {
    title: string;
    description: string;
    sourcePath: string;
  };
  defaultId: string | null;
  predictions: PredictionListItem[];
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
  weekend?: {
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
    resultSource: 'actual' | 'partial' | 'not_started' | 'unavailable' | 'not_scheduled';
    liveSignals: string[];
    unavailableReason?: string;
  }[];
  weekendStatus?: {
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const useSupabase = Boolean(supabaseUrl && supabaseAnonKey);
const baseUrl = useSupabase ? `${supabaseUrl}/functions/v1/predictions` : '/api/predictions';
const forecastBaseUrl = useSupabase ? `${supabaseUrl}/functions/v1/prediction-forecast` : '/api/predictions/forecast';

async function fetchJson<T>(url: string): Promise<T> {
  const headers: HeadersInit = {};

  if (useSupabase) {
    headers.apikey = supabaseAnonKey;
    headers.Authorization = `Bearer ${supabaseAnonKey}`;
  }

  const response = await fetch(url, {
    cache: 'no-store',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function getPredictionSourceLabel(): string {
  return useSupabase ? 'Supabase Edge Function' : 'Next.js API';
}

export async function fetchPredictionList(): Promise<PredictionListResponse> {
  return fetchJson<PredictionListResponse>(baseUrl);
}

export async function fetchPredictionById(id: string): Promise<PredictionScript> {
  return fetchJson<PredictionScript>(`${baseUrl}/${encodeURIComponent(id)}`);
}

export async function fetchPredictionForecast(input: { grandPrix?: string; year?: number }): Promise<PredictionForecastResponse> {
  const query = new URLSearchParams();
  if (input.grandPrix) query.set('grandPrix', input.grandPrix);
  if (typeof input.year === 'number' && Number.isFinite(input.year)) query.set('year', String(input.year));
  const url = `${forecastBaseUrl}${query.toString() ? `?${query.toString()}` : ''}`;
  return fetchJson<PredictionForecastResponse>(url);
}
