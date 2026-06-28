import { type NextRequest, NextResponse } from 'next/server';
import { buildPredictionForecast } from '../../../../lib/predictionEngine';
import { rateLimit } from '../../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(request.url);
  const grandPrix = url.searchParams.get('grandPrix') ?? undefined;
  const yearParam = url.searchParams.get('year');
  const year = yearParam ? Number(yearParam) : new Date().getUTCFullYear();

  try {
    const forecast = await buildPredictionForecast({ grandPrix, year });
    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to build forecast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
