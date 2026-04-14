import { NextResponse } from "next/server";
import { predictionScripts } from "../../../../lib/predictions";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const script = predictionScripts.find((entry) => entry.id === id);

  if (!script) {
    return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
  }

  return NextResponse.json(script);
}
