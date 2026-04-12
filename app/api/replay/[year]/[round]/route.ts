import { NextResponse } from "next/server";
import { DRIVERS } from "../../../../../lib/constants/drivers";
import {
  getDrivers,
  getLaps,
  getRaceControl,
  getSessionPositions,
  getRaceSessions,
  type OpenF1Lap,
  type OpenF1Session,
} from "../../../../../lib/openf1";

export const runtime = "nodejs";

function normalizeTeamColour(colour?: string | null) {
  if (!colour) return "AAAAAA";
  return colour.replace("#", "");
}

function computeTimeBounds(laps: OpenF1Lap[], fallbackStart: string, fallbackEnd?: string | null) {
  if (laps.length === 0) {
    return {
      start_time: fallbackStart,
      end_time: fallbackEnd ?? new Date(Date.parse(fallbackStart) + 90 * 60 * 1000).toISOString(),
    };
  }

  const starts = laps
    .map((lap) => (lap.date_start ? Date.parse(lap.date_start) : Date.parse(fallbackStart)))
    .filter((v) => Number.isFinite(v));
  const minStart = Math.min(...starts);
  let maxEnd = minStart;

  for (const lap of laps) {
    const start = lap.date_start ? Date.parse(lap.date_start) : minStart;
    const duration = lap.lap_duration ? lap.lap_duration * 1000 : 90_000;
    maxEnd = Math.max(maxEnd, start + duration);
  }

  return {
    start_time: new Date(minStart).toISOString(),
    end_time: new Date(maxEnd).toISOString(),
  };
}

export async function GET(_: Request, { params }: { params: { year: string; round: string } }) {
  try {
    const year = Number(params.year);
    const round = Number(params.round);
    if (!Number.isFinite(year) || !Number.isFinite(round)) {
      return NextResponse.json({ error: "Invalid year or round" }, { status: 400 });
    }

    const sessions = await getRaceSessions(year);
    const sortedSessions = [...sessions].sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
    const raceSession: OpenF1Session | undefined = sortedSessions[round - 1];
    if (!raceSession) {
      return NextResponse.json({ error: "Race session not found" }, { status: 404 });
    }

    const [driversRaw, laps, positions, raceControl] = await Promise.all([
      getDrivers(raceSession.session_key),
      getLaps(raceSession.session_key),
      getSessionPositions(raceSession.session_key),
      getRaceControl(raceSession.session_key),
    ]);

    const drivers = driversRaw.map((driver) => {
      const code = driver.name_acronym ?? driver.broadcast_name ?? String(driver.driver_number);
      const meta = DRIVERS[code] ?? null;
      return {
        session_key: raceSession.session_key,
        driver_number: driver.driver_number,
        broadcast_name: driver.broadcast_name ?? code,
        full_name: meta?.name ?? driver.full_name ?? code,
        name_acronym: code,
        team_name: meta?.team ?? driver.team_name ?? "Unknown",
        team_colour: normalizeTeamColour(meta?.color ?? driver.team_colour ?? "AAAAAA"),
        first_name: driver.first_name ?? meta?.name?.split(" ")[0] ?? code,
        last_name: driver.last_name ?? meta?.name?.split(" ").slice(1).join(" ") ?? code,
        headshot_url: driver.headshot_url ?? "",
        country_code: driver.country_code ?? "",
      };
    });

    const totalLaps = laps.reduce((max, lap) => Math.max(max, lap.lap_number), 0);
    const timeBounds = computeTimeBounds(laps, raceSession.date_start, raceSession.date_end ?? null);

    const dataset = {
      session: {
        session_key: raceSession.session_key,
        session_type: raceSession.session_type ?? raceSession.session_name ?? "Race",
        session_name: raceSession.session_name,
        date_start: raceSession.date_start,
        date_end: raceSession.date_end ?? null,
        meeting_key: raceSession.meeting_key ?? null,
        circuit_key: raceSession.circuit_key ?? null,
        circuit_short_name: raceSession.circuit_short_name ?? "",
        country_name: raceSession.country_name ?? "",
        location: raceSession.location ?? "",
        year: year,
        round: round,
      },
      drivers,
      laps,
      positions,
      race_control: raceControl,
      track: {
        points: [],
        source_driver_number: drivers[0]?.driver_number ?? 0,
      },
      total_laps: totalLaps,
      start_time: timeBounds.start_time,
      end_time: timeBounds.end_time,
    };

    return NextResponse.json(dataset);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to build replay dataset", detail: message }, { status: 500 });
  }
}
