import { NextResponse } from 'next/server';
import { buildPredictionForecast } from '../../../../lib/predictionEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const grandPrix = url.searchParams.get('grandPrix') ?? undefined;
  const yearParam = Number(url.searchParams.get('year'));
  const year = Number.isFinite(yearParam) ? yearParam : undefined;

  try {
    const forecast = await buildPredictionForecast({ grandPrix, year });
    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to build forecast';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
