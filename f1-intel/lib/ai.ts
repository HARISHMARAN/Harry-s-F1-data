import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCoachFeedback(prompt: string) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: prompt,
  });

  return response.output_text ?? '';
}

export async function generateRaceSummary(prompt: string) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: prompt,
  });

  return response.output_text ?? '';
}
