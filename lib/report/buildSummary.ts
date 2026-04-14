import OpenAI from "openai";
import type { RaceReportPayload } from "./fetchRaceData";

export type BuildSummaryResult = {
  summary: string;
  model?: string | null;
  fallbackUsed: boolean;
};

type SummaryConfig = {
  model: string;
  apiKey: string;
};

function getSummaryConfig(): SummaryConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  return { apiKey, model };
}

function formatDriverName(payload: RaceReportPayload["podium"][number]) {
  return payload.fullName ?? payload.driverCode ?? `Driver ${payload.driverNumber ?? "?"}`;
}

function buildFallbackSummary(payload: RaceReportPayload): string {
  const sessionName = payload.session.sessionName;
  const pieces: string[] = [];
  pieces.push(`${sessionName} report.`);

  if (payload.podium.length) {
    const podiumNames = payload.podium.map(formatDriverName);
    pieces.push(`Podium: ${podiumNames.join(", ")}.`);
  }

  if (payload.fastestLap) {
    const fastestName =
      payload.fastestLap.fullName ??
      payload.fastestLap.driverCode ??
      `Driver ${payload.fastestLap.driverNumber ?? "?"}`;
    const lap = payload.fastestLap.lapNumber ?? "unknown";
    pieces.push(`Fastest lap: ${fastestName} (lap ${lap}).`);
  }

  return pieces.join(" ");
}

function buildPrompt(payload: RaceReportPayload): string {
  const podium = payload.podium.map((p) => ({
    position: p.position,
    name: formatDriverName(p),
    team: p.teamName ?? null,
  }));

  const fastestLap = payload.fastestLap
    ? {
        driver: payload.fastestLap.fullName ?? payload.fastestLap.driverCode ?? null,
        lap: payload.fastestLap.lapNumber ?? null,
        lapTimeSeconds: payload.fastestLap.lapTimeSeconds,
      }
    : null;

  const summaryInput = {
    session: payload.session,
    podium,
    topFinishers: payload.topFinishers.map((f) => ({
      position: f.position,
      name: formatDriverName(f),
      team: f.teamName ?? null,
    })),
    fastestLap,
    notableFacts: payload.notableFacts,
  };

  return [
    "Write a concise Formula 1 race report for email.",
    "Use only the facts provided.",
    "Do not invent incidents, overtakes, strategy details, penalties, or weather.",
    "Keep the tone factual and compact.",
    "Prefer 1 short paragraph, maximum 2.",
    "Mention the event name, leading finishers, and fastest lap only if present.",
    "",
    "Facts:",
    JSON.stringify(summaryInput, null, 2),
  ].join("\n");
}

export async function buildSummary(
  payload: RaceReportPayload
): Promise<BuildSummaryResult> {
  if (!payload || !payload.session) {
    return {
      summary: "Race report unavailable due to missing payload.",
      model: null,
      fallbackUsed: true,
    };
  }

  const config = getSummaryConfig();
  if (!config) {
    return {
      summary: buildFallbackSummary(payload),
      model: null,
      fallbackUsed: true,
    };
  }

  try {
    const client = new OpenAI({ apiKey: config.apiKey });
    const prompt = buildPrompt(payload);
    const response = await client.responses.create({
      model: config.model,
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 300,
    });

    const summary =
      response.output_text?.trim() || buildFallbackSummary(payload);

    return {
      summary,
      model: config.model,
      fallbackUsed: !response.output_text,
    };
  } catch (err) {
    console.warn("buildRaceSummary: model call failed", err);
    return {
      summary: buildFallbackSummary(payload),
      model: config.model,
      fallbackUsed: true,
    };
  }
}
