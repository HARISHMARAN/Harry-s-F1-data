"use client";

import { useEffect, useMemo, useState } from "react";
import { useReplay } from "../../hooks/useReplay";

const FRAME_WINDOW_SEC = 0.12;

type ReplayPoint = {
  driverNumber: number;
  t: number;
  x: number;
  y: number;
};

type OpenF1Position = {
  driver_number: number;
  date: string;
  x: number | null;
  y: number | null;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export default function ReplayPage() {
  const [points, setPoints] = useState<ReplayPoint[]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const { time, isPlaying, setIsPlaying } = useReplay(speed);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/replay/positions", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Replay API failed: ${response.status}`);
        }
        const payload = (await response.json()) as { points: OpenF1Position[] };
        const normalized = normalizePositions(payload.points ?? []);

        if (!active) return;
        setPoints(normalized.points);
        setBounds(normalized.bounds);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load positions");
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const frame = useMemo(() => {
    if (!bounds) return [];

    const framePoints = points.filter((point) => Math.abs(point.t - time) <= FRAME_WINDOW_SEC);
    const latestByDriver = new Map<number, ReplayPoint>();

    for (const point of framePoints) {
      const existing = latestByDriver.get(point.driverNumber);
      if (!existing || point.t > existing.t) {
        latestByDriver.set(point.driverNumber, point);
      }
    }

    return Array.from(latestByDriver.values()).map((point) => ({
      ...point,
      leftPct: toPercent(point.x, bounds.minX, bounds.maxX),
      topPct: toPercent(point.y, bounds.minY, bounds.maxY),
    }));
  }, [bounds, points, time]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505", position: "relative" }}>
      <div style={{ position: "absolute", top: 16, left: 16, color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem" }}>Replay MVP</h1>
        <p style={{ marginTop: 4, color: "#9CA3AF" }}>t = {time.toFixed(2)}s</p>
        {error && <p style={{ color: "#F87171" }}>{error}</p>}
      </div>

      {frame.map((car) => (
        <div
          key={`${car.driverNumber}-${car.t}`}
          style={{
            position: "absolute",
            left: `${car.leftPct}%`,
            top: `${car.topPct}%`,
            width: 8,
            height: 8,
            background: "#EF4444",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ background: "#fff", border: "none", padding: "8px 12px", cursor: "pointer" }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        {[1, 2, 4].map((value) => (
          <button
            key={value}
            onClick={() => setSpeed(value)}
            style={{
              background: speed === value ? "#38BDF8" : "#fff",
              border: "none",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            {value}x
          </button>
        ))}
      </div>
    </div>
  );
}

function normalizePositions(raw: OpenF1Position[]) {
  const points: ReplayPoint[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const valid = raw.filter((pos) => typeof pos.x === "number" && typeof pos.y === "number" && pos.date);
  if (!valid.length) {
    return { points: [], bounds: null } as const;
  }

  const startTime = Math.min(...valid.map((pos) => Date.parse(pos.date)));

  for (const pos of valid) {
    const x = pos.x as number;
    const y = pos.y as number;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    points.push({
      driverNumber: pos.driver_number,
      t: (Date.parse(pos.date) - startTime) / 1000,
      x,
      y,
    });
  }

  return {
    points,
    bounds: { minX, maxX, minY, maxY },
  };
}

function toPercent(value: number, min: number, max: number) {
  if (max === min) return 50;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, pct));
}
