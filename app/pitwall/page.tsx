"use client";

import { useEffect, useState } from "react";
import { fetchLiveDashboardData } from "../../src/services/openf1";

type TelemetryDriver = {
  code: string;
  name: string;
  color: string;
  position: number | null;
  lapTime: number | null;
  gapToLeader: number | null;
  deltaToBest: number | null;
};

type TelemetryResponse = {
  session: string;
  timestamp: number;
  drivers: TelemetryDriver[];
  health: "healthy" | "degraded" | "offline";
};

export default function PitwallPage() {
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const dashboard = await fetchLiveDashboardData();
        const json: TelemetryResponse = {
          session: dashboard.session.session_name,
          timestamp: Math.floor(Date.now() / 1000),
          health: dashboard.data_health ?? "healthy",
          drivers: dashboard.leaderboard.map((entry) => ({
            code: entry.name_acronym,
            name: entry.full_name,
            color: entry.team_colour,
            position: entry.position,
            lapTime: null,
            gapToLeader: null,
            deltaToBest: null,
          })),
        };
        if (active) {
          setData(json);
          setError(
            dashboard.data_health === "offline"
              ? "Telemetry is offline. Rendering fallback data."
              : dashboard.data_health === "degraded"
                ? "Telemetry is degraded. Some values may be stale."
                : null
          );
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    load();
    const interval = setInterval(load, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Live Pitwall</h1>
      {data?.session && <p>Session: {data.session}</p>}
      {data && <p>Health: {data.health.toUpperCase()}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!data && !error && <p>Loading telemetry...</p>}
      {data && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Pos</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Driver</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Lap Time</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Gap</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {data.drivers.map((driver) => (
              <tr key={driver.code}>
                <td style={{ padding: "0.25rem 0" }}>{driver.position ?? "-"}</td>
                <td style={{ padding: "0.25rem 0" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "0.5rem",
                      height: "0.5rem",
                      backgroundColor: driver.color,
                      borderRadius: "999px",
                      marginRight: "0.5rem",
                    }}
                  />
                  {driver.name}
                </td>
                <td style={{ padding: "0.25rem 0" }}>
                  {driver.lapTime !== null ? driver.lapTime.toFixed(3) : "-"}
                </td>
                <td style={{ padding: "0.25rem 0" }}>
                  {driver.gapToLeader !== null ? driver.gapToLeader.toFixed(3) : "-"}
                </td>
                <td style={{ padding: "0.25rem 0" }}>
                  {driver.deltaToBest !== null ? driver.deltaToBest.toFixed(3) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
