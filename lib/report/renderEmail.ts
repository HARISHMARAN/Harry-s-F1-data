import type { RaceReportPayload } from "./fetchRaceData";

export type RenderEmailResult = {
  subject: string;
  html: string;
};

function formatDriverName(name?: string | null, code?: string | null, number?: number | null) {
  return name ?? code ?? `Driver ${number ?? "?"}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function renderRaceEmail(
  payload: RaceReportPayload,
  summary: string
): RenderEmailResult {
  const session = payload.session;
  const title = session.sessionName;
  const date = formatDate(session.dateStart);

  const podium = payload.podium
    .map((row) =>
      `${row.position}. ${formatDriverName(row.fullName, row.driverCode, row.driverNumber)}`
    )
    .join("<br />");

  const fastest = payload.fastestLap
    ? `${formatDriverName(
        payload.fastestLap.fullName,
        payload.fastestLap.driverCode,
        payload.fastestLap.driverNumber
      )} (lap ${payload.fastestLap.lapNumber ?? "?"})`
    : "N/A";

  const subject = `F1 Weekly Report — ${title}`;

  const html = `
  <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
    <h2 style="margin: 0 0 4px 0;">${title}</h2>
    <div style="color: #475569; font-size: 14px; margin-bottom: 16px;">${date} • ${session.countryName ?? ""}</div>

    <p style="margin: 0 0 16px 0;">${summary}</p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="padding: 8px 0; font-weight: 700;">Podium</td>
        <td style="padding: 8px 0;">${podium || "N/A"}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: 700;">Fastest lap</td>
        <td style="padding: 8px 0;">${fastest}</td>
      </tr>
    </table>

    <div style="font-size: 12px; color: #64748b;">
      Generated ${new Date(payload.generatedAt).toLocaleString("en-US")}
    </div>
  </div>
  `.trim();

  return { subject, html };
}
