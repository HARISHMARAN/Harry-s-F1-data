import type { ReplayDataset, ReplaySessionSummary } from '../types/f1';
import { DataAccessError, fetchJsonWithPolicy, type DataHealth } from './http';
import { replayDatasetSchema, replaySessionsSchema } from './schemas';

export type ReplayClientResult<T> = {
  data: T;
  health: DataHealth;
  warnings: string[];
};

let lastGoodSessions: ReplaySessionSummary[] = [];
const replayDatasetCache = new Map<string, ReplayDataset>();

export async function getReplaySessions(year: number): Promise<ReplayClientResult<ReplaySessionSummary[]>> {
  const result = await fetchJsonWithPolicy({
    url: `/api/sessions?year=${year}`,
    timeoutMs: 10_000,
    retries: 2,
    schema: replaySessionsSchema,
    fallbackData: lastGoodSessions,
    fallbackLabel: 'last good replay sessions',
  });

  if (result.data.length) {
    lastGoodSessions = result.data;
  }

  return {
    data: result.data,
    health: result.health,
    warnings: result.warnings,
  };
}

export async function getReplayDataset(
  year: number,
  round: number
): Promise<ReplayClientResult<ReplayDataset>> {
  const key = `${year}-${round}`;

  const result = await fetchJsonWithPolicy({
    url: `/api/replay/${year}/${round}?telemetry=0`,
    timeoutMs: 45_000,
    retries: 1,
    schema: replayDatasetSchema,
    fallbackData: replayDatasetCache.get(key),
    fallbackLabel: 'last good replay dataset',
  });

  if (result.data) {
    replayDatasetCache.set(key, result.data as ReplayDataset);
  }

  return {
    data: result.data as ReplayDataset,
    health: result.health,
    warnings: result.warnings,
  };
}

export { DataAccessError };
