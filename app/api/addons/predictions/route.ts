import { type NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { rateLimit } from '../../../../lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_PATH = join(process.cwd(), 'addons', 'predictions-cache', 'predictions.json');

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const raw = await readFile(CACHE_PATH, 'utf-8');
    const data = JSON.parse(raw) as unknown;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    const isNotFound = err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      return NextResponse.json(
        {
          error: 'Prediction cache not found.',
          hint: 'Run `npm run addons:predictions` locally to generate the cache file, then commit it.',
        },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'Failed to read predictions.' }, { status: 500 });
  }
}
