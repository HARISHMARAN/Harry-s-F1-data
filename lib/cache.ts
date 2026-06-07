/**
 * Thin cache abstraction.
 *
 * When KV_REST_API_URL is set (Vercel production), uses @vercel/kv so the
 * cache is shared across all serverless function instances.
 *
 * Without that env var (local dev, CI), falls back to a module-level Map so
 * nothing breaks and no extra infrastructure is required.
 */

const KV_AVAILABLE = Boolean(process.env.KV_REST_API_URL);

// Lazy-import so the module never throws in environments without KV configured.
async function kvClient() {
  const { kv } = await import('@vercel/kv');
  return kv;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface MemEntry<T> {
  value: T;
  expiresAtMs: number;
}

const memStore = new Map<string, MemEntry<unknown>>();

// Prune expired entries periodically.
const MEM_PRUNE_MS = 10 * 60 * 1000;
let lastMemPruneMs = Date.now();

function memPrune() {
  const now = Date.now();
  if (now - lastMemPruneMs < MEM_PRUNE_MS) return;
  lastMemPruneMs = now;
  for (const [k, entry] of memStore) {
    if (now > entry.expiresAtMs) memStore.delete(k);
  }
}

function memGet<T>(key: string): T | null {
  memPrune();
  const entry = memStore.get(key) as MemEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAtMs) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet<T>(key: string, value: T, ttlSeconds: number) {
  memStore.set(key, { value, expiresAtMs: Date.now() + ttlSeconds * 1000 });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a cached value. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!KV_AVAILABLE) return memGet<T>(key);
  try {
    const kv = await kvClient();
    return await kv.get<T>(key);
  } catch {
    return memGet<T>(key);
  }
}

/**
 * Set a cached value with a TTL in seconds.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!KV_AVAILABLE) {
    memSet(key, value, ttlSeconds);
    return;
  }
  try {
    const kv = await kvClient();
    await kv.set(key, value, { ex: ttlSeconds });
  } catch {
    memSet(key, value, ttlSeconds);
  }
}

/**
 * Delete a cached key.
 */
export async function cacheDel(key: string): Promise<void> {
  memStore.delete(key);
  if (!KV_AVAILABLE) return;
  try {
    const kv = await kvClient();
    await kv.del(key);
  } catch {
    // best-effort
  }
}
