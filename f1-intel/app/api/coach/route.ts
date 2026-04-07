import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCoachFeedback } from '../../../lib/ai';
import { fetchDriverLaps, fetchLatestSessionId } from '../../../lib/openf1';
import { calculateMetrics } from '../../../lib/analytics';

const bodySchema = z.object({
  driver: z.string().default('VER'),
  lap: z.number().optional(),
  session: z.number().optional(),
});

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const driver = body.data.driver.toUpperCase();
  const sessionId = body.data.session ?? await fetchLatestSessionId();

  if (!sessionId) {
    return NextResponse.json({ error: 'No session available' }, { status: 404 });
  }

  const laps = await fetchDriverLaps(sessionId, driver);
  const metrics = calculateMetrics(laps);
  const lapData = body.data.lap
    ? laps.find((lap) => lap.lap === body.data.lap) ?? laps[laps.length - 1]
    : laps[laps.length - 1];

  const prompt = `You are an F1 race engineer.

Analyze this lap data:
- Sector times: ${lapData?.sectors.join(', ') ?? 'n/a'}
- Delta vs best lap: ${metrics.lapDelta}
- Speed trends: ${metrics.paceConsistency}

Give actionable coaching advice in under 100 words.`;

  const feedback = await generateCoachFeedback(prompt);

  return NextResponse.json({ feedback });
}
