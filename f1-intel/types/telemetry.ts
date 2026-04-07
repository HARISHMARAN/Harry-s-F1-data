export interface TelemetryLap {
  driver: string;
  lap: number;
  lapTime: number;
  sectors: [number, number, number];
  speedTrap?: number;
  stint?: number;
}

export interface TelemetryMetrics {
  lapDelta: number;
  sectorDelta: number[];
  gapToLeader: number;
  stint: number;
  paceConsistency: number;
  tyreDeg: number;
}

export interface TelemetryResponse {
  driver: string;
  lap: number;
  lapTime: number;
  delta: number;
  sectors: [number, number, number];
  gapToLeader: number;
  stint: number;
  metrics: TelemetryMetrics;
  raw?: unknown;
}
