import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchRaceById } from '../../../lib/jolpica';
import { generateRaceSummary } from '../../../lib/ai';
import { supabase } from '../../../lib/db';

const bodySchema = z.object({
  raceId: z.string().default('latest'),
});

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const raceId = body.data.raceId;

  if (supabase) {
    const { data: cached } = await supabase
      .from('race_summaries')
      .select('race_id, summary')
      .eq('race_id', raceId)
      .maybeSingle();

    if (cached?.summary) {
      return NextResponse.json({ title: 'Cached Summary', summary: cached.summary, raceId });
    }
  }

  const raceData = await fetchRaceById(raceId);

  const prompt = `You are a professional F1 journalist.

Write a race summary including:
- Winner performance
- Key overtakes
- Strategy insights
- Notable events

Keep it engaging and under 300 words.

Race data:
${JSON.stringify(raceData).slice(0, 6000)}`;

  const summary = await generateRaceSummary(prompt);

  if (supabase) {
    await supabase.from('race_summaries').insert({
      race_id: raceId,
      summary,
    });
  }

  return NextResponse.json({ title: 'Race Summary', summary, raceId });
}
