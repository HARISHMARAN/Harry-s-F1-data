import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function generateCoachFeedback(prompt: string) {
  if (!client) {
    return 'Demo mode: add OPENAI_API_KEY to get real coaching insights. Focus on braking later into Turn 3 and improving exit speed from Turn 5.';
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: prompt,
  });

  return response.output_text ?? '';
}

export async function generateRaceSummary(prompt: string) {
  if (!client) {
    return 'Demo mode: add OPENAI_API_KEY to generate full race summaries. For now, this placeholder highlights the winner, key overtakes, and strategy swings.';
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: prompt,
  });

  return response.output_text ?? '';
}
