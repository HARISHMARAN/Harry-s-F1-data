export type PredictionScript = {
  id: string;
  title: string;
  race: string;
  category: "Forecast" | "Analysis";
  season: number;
  summary: string;
  model: string;
  inputs: string[];
  command: string;
  notes: string[];
};

export const predictionScripts: PredictionScript[] = [
  {
    id: "prediction1",
    title: "Australian GP Forecast",
    race: "2026 Australian Grand Prix",
    category: "Forecast",
    season: 2026,
    summary:
      "XGBoost regressor that blends qualifying pace, grid penalty, team strength, regulation boost, and weather into a predicted race finishing time.",
    model: "XGBoost regression with monotone constraints",
    inputs: [
      "Qualifying time",
      "Gap from pole",
      "Adjusted team score",
      "Grid penalty",
      "Rain probability",
      "Temperature",
    ],
    command: "cd addons/2026_f1_predictions && python3 prediction1.py",
    notes: [
      "Uses hard-coded 2026 qualifying times and a 2025 team-strength prior.",
      "Prints a podium prediction and a feature-importance plot.",
    ],
  },
  {
    id: "prediction2",
    title: "Chinese GP Forecast",
    race: "2026 Chinese Grand Prix",
    category: "Forecast",
    season: 2026,
    summary:
      "Leave-one-out XGBoost model that combines China qualifying sectors, Australia carry-over signals, team score, and weather to estimate finishing order.",
    model: "XGBoost regression with Leave-One-Out validation",
    inputs: [
      "China sector times",
      "China qualifying gap",
      "China grid",
      "Australia grid",
      "Team score",
      "Rain probability",
      "Temperature",
    ],
    command: "cd addons/2026_f1_predictions && python3 prediction2.py",
    notes: [
      "Uses OpenWeatherMap with a fallback weather assumption.",
      "Prints a full predicted finishing order and feature importances.",
    ],
  },
  {
    id: "racepace",
    title: "Chinese GP Pace Study",
    race: "2026 Chinese Grand Prix",
    category: "Analysis",
    season: 2026,
    summary:
      "Pure pace comparison that compares each driver's ultimate lap against the quickest reference lap and converts that delta into an estimated pace signal.",
    model: "Deterministic pace analysis",
    inputs: ["S1", "S2", "S3", "Actual qualifying time", "Grid position"],
    command: "cd addons/2026_f1_predictions && python3 racepace.py",
    notes: [
      "No ML dependency, just sector-time comparison.",
      "Useful as a sanity check against the model-based forecasts.",
    ],
  },
];

export const predictionRepoSummary = {
  title: "2026 F1 Predictions",
  description:
    "A local prediction pack imported from the upstream repository and exposed through the dashboard as a dedicated web page.",
  sourcePath: "addons/2026_f1_predictions",
};
