export interface RaceSummary {
  raceId: string;
  title: string;
  summary: string;
}

export interface PredictionRow {
  driver: string;
  position: number;
  confidence: number;
}
