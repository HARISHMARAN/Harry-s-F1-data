import { NextResponse } from 'next/server';
import { fetchRaceById } from '../../../lib/jolpica';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raceId = searchParams.get('race') ?? 'latest';
  const data = await fetchRaceById(raceId);
  return NextResponse.json(data);
}
