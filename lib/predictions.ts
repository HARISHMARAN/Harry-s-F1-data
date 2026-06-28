export type PredictionScript = {
  id: string;
  title: string;
  race: string;
  category: "Forecast" | "Analysis";
  season: number;
  result: {
    headline: string;
    winner: string;
    podium: string[];
    note: string;
  };
  summary: string;
  model: string;
  inputs: string[];
  command: string;
  notes: string[];
};

export const predictionScripts: PredictionScript[] = [];

export const predictionRepoSummary = {
  title: "2026 F1 Predictions",
  description:
    "No pre-generated predictions available. Predictions are generated live from OpenF1 session data and Jolpica historical results.",
  sourcePath: "lib/predictionEngine.ts",
};
