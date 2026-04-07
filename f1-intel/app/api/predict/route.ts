import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scorePrediction } from '../../../utils/calculations';
import { supabase } from '../../../lib/db';

const bodySchema = z.object({
  raceId: z.string().default('next'),
});

const baselineDrivers = [
  { driver: 'VER', score: 92 },
  { driver: 'LEC', score: 84 },
  { driver: 'NOR', score: 82 },
  { driver: 'HAM', score: 80 },
  { driver: 'RUS', score: 78 },
];

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raceId = body.data.raceId;
  const ranked = scorePrediction(baselineDrivers).map((row, index) => ({
    driver: row.driver,
    position: index + 1,
    confidence: Number((0.9 - index * 0.06).toFixed(2)),
  }));

  if (supabase) {
    await supabase.from('predictions').insert(
      ranked.map((row) => ({
        race_id: raceId,
        driver: row.driver,
        predicted_position: row.position,
        confidence: row.confidence,
      }))
    );
  }

  return NextResponse.json({ predictions: ranked, raceId });
}
