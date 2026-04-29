import type { ZodType } from 'zod';

export type DataHealth = 'healthy' | 'degraded' | 'offline';

export type JsonRequestOptions<T> = {
  url: string;
  init?: RequestInit;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  schema?: ZodType<T>;
  fallbackData?: T;
  fallbackLabel?: string;
};

export type JsonResult<T> = {
  data: T;
  health: DataHealth;
  warnings: string[];
};

export class DataAccessError extends Error {
  health: DataHealth;
  warnings: string[];

  constructor(message: string, health: DataHealth, warnings: string[] = []) {
    super(message);
    this.name = 'DataAccessError';
    this.health = health;
    this.warnings = warnings;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit | undefined, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<Response>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms for ${url}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(url, init),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchJsonWithPolicy<T>(opts: JsonRequestOptions<T>): Promise<JsonResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const retries = opts.retries ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 350;
  const warnings: string[] = [];
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(opts.url, opts.init, timeoutMs);
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${opts.url}`);
      }

      const payload = (await response.json()) as unknown;
      const data = opts.schema ? opts.schema.parse(payload) : (payload as T);
      return { data, health: 'healthy', warnings };
    } catch (error) {
      lastError = error;
      const reason = error instanceof Error ? error.message : String(error);
      warnings.push(`attempt_${attempt + 1}: ${reason}`);

      if (attempt < retries) {
        await delay(retryDelayMs * (attempt + 1));
      }
    }
  }

  if (opts.fallbackData !== undefined) {
    const label = opts.fallbackLabel ?? 'cached fallback';
    warnings.push(`using ${label} for ${opts.url}`);
    return { data: opts.fallbackData, health: 'degraded', warnings };
  }

  const message = lastError instanceof Error ? lastError.message : `Request failed for ${opts.url}`;
  throw new DataAccessError(message, 'offline', warnings);
}
