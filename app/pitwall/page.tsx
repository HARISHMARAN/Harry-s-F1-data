"use client";

import { useEffect, useState } from "react";

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
};

export default function PitwallPage() {
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/telemetry", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Telemetry fetch failed: ${response.status}`);
        }
        const json = (await response.json()) as TelemetryResponse;
        if (active) {
          setData(json);
          setError(null);
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
