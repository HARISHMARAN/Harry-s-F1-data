import { NextResponse } from "next/server";
import { predictionRepoSummary, predictionScripts } from "../../../lib/predictions";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    repoSummary: predictionRepoSummary,
    defaultId: predictionScripts[0]?.id ?? null,
    predictions: predictionScripts.map((script) => ({
      id: script.id,
      title: script.title,
      race: script.race,
      category: script.category,
      season: script.season,
    })),
  });
}
