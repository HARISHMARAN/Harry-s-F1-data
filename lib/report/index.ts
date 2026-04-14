import {
  detectReportableRaceSession,
  type DetectRaceOptions,
  type ReportableRaceSession,
} from "./detectRace";
import { fetchRaceData, type RaceReportPayload } from "./fetchRaceData";
import { buildSummary, type BuildSummaryResult } from "./buildSummary";
import { renderRaceEmail } from "./renderEmail";
import { sendReportEmail } from "./sendEmail";

/**
 * index.ts
 * Orchestration only:
 * - detect
 * - fetch
 * - summarize
 * - render
 * - send
 */

export type ReportPipelineOptions = DetectRaceOptions & {
  dryRun?: boolean;
  recipients?: string[];
};

export type ReportPipelineResult =
  | {
      status: "skipped";
      reason: "no-race";
      windowStart: string;
      windowEnd: string;
    }
  | {
      status: "dry-run";
      session: ReportableRaceSession;
      summary: BuildSummaryResult;
      subject: string;
    }
  | {
      status: "sent";
      session: ReportableRaceSession;
      summary: BuildSummaryResult;
      subject: string;
      emailId?: string | null;
    };

export async function runWeeklyReport(
  options: ReportPipelineOptions = {}
): Promise<ReportPipelineResult> {
  const detection = await detectReportableRaceSession({
    now: options.now,
    windowDays: options.windowDays,
  });

  if (detection.status === "none") {
    return {
      status: "skipped",
      reason: "no-race",
      windowStart: detection.windowStart,
      windowEnd: detection.windowEnd,
    };
  }

  const session = detection.session;
  const payload: RaceReportPayload = await fetchRaceData(session);
  const summary = await buildSummary(payload);
  const email = renderRaceEmail(payload, summary.summary);

  if (options.dryRun) {
    return {
      status: "dry-run",
      session,
      summary,
      subject: email.subject,
    };
  }

  const sendResult = await sendReportEmail({
    subject: email.subject,
    html: email.html,
    recipients: options.recipients,
  });

  return {
    status: "sent",
    session,
    summary,
    subject: email.subject,
    emailId: sendResult.id ?? null,
  };
}

export { detectReportableRaceSession } from "./detectRace";
export { fetchRaceData } from "./fetchRaceData";
export { buildSummary } from "./buildSummary";
export { renderRaceEmail } from "./renderEmail";
export { sendReportEmail } from "./sendEmail";
