const JOLPICA_BASE = 'https://api.jolpica.com/ergast/f1';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Jolpica request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchLatestRaceResults() {
  return fetchJson(`${JOLPICA_BASE}/current/last/results.json`);
}

export async function fetchRaceById(raceId: string) {
  if (raceId === 'latest') {
    return fetchLatestRaceResults();
  }
  return fetchJson(`${JOLPICA_BASE}/${raceId}/results.json`);
}
