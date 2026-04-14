import { NextResponse } from "next/server";
import { runWeeklyReport } from "../../../../lib/report";

export const runtime = "nodejs";

function parseBool(value: string | null) {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseRecipients(value: string | null) {
  if (!value) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const windowDaysParam = url.searchParams.get("windowDays");
    const windowDays = windowDaysParam ? Number(windowDaysParam) : undefined;
    const dryRun = parseBool(url.searchParams.get("dryRun"));
    const recipients = parseRecipients(url.searchParams.get("recipients"));

    const result = await runWeeklyReport({
      windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
      dryRun,
      recipients,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}
