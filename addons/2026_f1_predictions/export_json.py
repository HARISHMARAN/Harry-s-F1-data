"""
Export prediction results as JSON for the Next.js dashboard.

Usage:
  python export_json.py --out ../../addons/predictions-cache/predictions.json

This script re-runs the core prediction logic from prediction1.py and
prediction2.py and writes a structured JSON file that the dashboard API
route can serve without a Python runtime.
"""
import argparse
import json
import os
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, LeaveOneOut
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")


# ─── Australian GP — prediction1 data ────────────────────────────────────────

def predict_australian_gp():
    qualifying_2026 = pd.DataFrame({
        "Driver": [
            "RUS", "ANT", "HAD", "LEC", "PIA", "NOR", "HAM",
            "LAW", "LIN", "BOR", "HUL", "BEA", "OCO", "GAS",
            "ALB", "COL", "ALO", "PER", "BOT", "VER", "SAI", "STR",
        ],
        "QualifyingTime (s)": [
            78.518, 78.811, 79.303, 79.327, 79.380, 79.475, 79.478,
            79.994, 81.247, 80.221, 80.303, 80.311, 80.491, 80.501,
            80.941, 81.270, 81.969, 82.605, 83.244, 82.500, 83.000, 85.000,
        ],
        "GridPosition": list(range(1, 23)),
    })

    driver_team = {
        "RUS": "Mercedes", "ANT": "Mercedes", "HAD": "Racing Bulls",
        "LEC": "Ferrari", "PIA": "McLaren", "NOR": "McLaren",
        "HAM": "Ferrari", "LAW": "Racing Bulls", "LIN": "Williams",
        "BOR": "Alpine", "HUL": "Haas", "BEA": "Haas",
        "OCO": "Alpine", "GAS": "Alpine", "ALB": "Williams",
        "COL": "Williams", "ALO": "Aston Martin", "PER": "Red Bull",
        "BOT": "Audi", "VER": "Red Bull", "SAI": "Williams", "STR": "Aston Martin",
    }

    team_points_2025 = {
        "McLaren": 800, "Mercedes": 459, "Red Bull": 426, "Ferrari": 382,
        "Williams": 137, "Aston Martin": 80, "Haas": 73, "Racing Bulls": 92,
        "Audi": 68, "Alpine": 22, "Cadillac": 5,
    }
    max_pts = max(team_points_2025.values())
    team_performance_score = {t: p / max_pts for t, p in team_points_2025.items()}

    qualifying_2026["Team"] = qualifying_2026["Driver"].map(driver_team)
    qualifying_2026["TeamScore"] = qualifying_2026["Team"].map(team_performance_score).fillna(0.1)
    pole_time = qualifying_2026["QualifyingTime (s)"].min()
    qualifying_2026["GapFromPole (s)"] = qualifying_2026["QualifyingTime (s)"] - pole_time
    qualifying_2026["GridPenalty"] = 0
    rain_probability = 0.3
    temperature = 22.0
    qualifying_2026["RainProbability"] = rain_probability
    qualifying_2026["Temperature"] = temperature

    features = ["QualifyingTime (s)", "GapFromPole (s)", "TeamScore", "GridPenalty", "RainProbability", "Temperature"]
    X = qualifying_2026[features]
    y = qualifying_2026["GridPosition"]

    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X_imputed, y, test_size=0.3, random_state=42)

    model = XGBRegressor(
        n_estimators=200, learning_rate=0.05, max_depth=3,
        subsample=0.8, colsample_bytree=0.8, reg_lambda=1.5, random_state=42,
        monotone_constraints=(1, 1, -1, 1, 1, 0),
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    merged = qualifying_2026.copy()
    merged["PredictedRaceTime (s)"] = model.predict(X_imputed)
    final_results = merged.sort_values(by=["PredictedRaceTime (s)", "GridPosition"]).reset_index(drop=True)

    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))

    return {
        "race": "2026 Australian Grand Prix",
        "model_mae": round(mae, 3),
        "weather": {"temperature_c": temperature, "rain_probability": rain_probability},
        "podium": [
            {"position": i + 1, "driver": row["Driver"], "team": row["Team"]}
            for i, (_, row) in enumerate(final_results.head(3).iterrows())
        ],
        "full_order": [
            {"position": i + 1, "driver": row["Driver"], "team": row["Team"],
             "predicted_time_s": round(float(row["PredictedRaceTime (s)"]), 3)}
            for i, (_, row) in enumerate(final_results.iterrows())
        ],
    }


# ─── Chinese GP — prediction2 data ───────────────────────────────────────────

def predict_chinese_gp():
    china_quali = {
        "ANT": (24.003, 27.664, 40.387, 92.064, 1),
        "RUS": (24.012, 27.783, 40.491, 92.286, 2),
        "HAM": (24.080, 27.696, 40.535, 92.415, 3),
        "LEC": (24.022, 27.660, 40.650, 92.428, 4),
        "PIA": (24.120, 27.729, 40.493, 92.550, 5),
        "NOR": (23.995, 27.747, 40.748, 92.608, 6),
        "GAS": (24.099, 27.788, 40.900, 92.873, 7),
        "VER": (24.280, 27.975, 40.613, 93.002, 8),
        "HAD": (24.465, 27.933, 40.659, 93.121, 9),
        "BEA": (24.234, 27.843, 40.931, 93.292, 10),
        "HUL": (24.558, 27.937, 40.743, 93.238, 11),
        "COL": (24.254, 28.078, 40.947, 93.279, 12),
        "OCO": (24.335, 28.041, 41.028, 93.404, 13),
        "LAW": (24.339, 28.117, 40.911, 93.367, 14),
        "LIN": (24.319, 28.181, 40.903, 93.403, 15),
        "BOR": (24.539, 28.145, 40.796, 93.480, 16),
        "SAI": (24.465, 28.669, 41.183, 94.317, 17),
        "ALB": (24.526, 28.694, 41.370, 94.590, 18),
        "ALO": (24.782, 28.723, 41.698, 95.203, 19),
        "BOT": (24.949, 28.972, 41.515, 95.436, 20),
        "STR": (24.953, 29.144, 41.838, 95.935, 21),
        "PER": (25.703, 29.246, 41.611, 96.560, 22),
    }

    df = pd.DataFrame.from_dict(china_quali, orient="index",
                                columns=["S1", "S2", "S3", "ChinaQuali_s", "ChinaGrid"])
    df.index.name = "Driver"
    df = df.reset_index()
    df["UltimateLap_s"] = df["S1"] + df["S2"] + df["S3"]
    pole = df["ChinaQuali_s"].min()
    df["ChinaGapFromPole_s"] = (df["ChinaQuali_s"] - pole).round(3)

    aus_grid = {
        "RUS": 1, "ANT": 2, "HAD": 3, "LEC": 4, "PIA": 5, "NOR": 6,
        "HAM": 7, "LAW": 8, "LIN": 9, "BOR": 10, "OCO": 11, "HUL": 12,
        "ALB": 13, "GAS": 14, "COL": 15, "BEA": 16, "ALO": 17,
        "PER": 18, "BOT": 19, "VER": 20, "SAI": 21, "STR": 22,
    }
    df["AusGrid"] = df["Driver"].map(aus_grid)

    aus_finish = {
        "RUS": 1, "ANT": 2, "LEC": 3, "HAM": 4, "NOR": 5, "VER": 6,
        "BEA": 7, "LIN": 8, "PIA": 9, "LAW": 10, "HAD": 11, "OCO": 12,
        "HUL": 13, "BOR": 14, "COL": 15, "ALB": 16, "GAS": 17,
        "ALO": 18, "SAI": 19, "BOT": 20, "PER": 21, "STR": 22,
    }
    df["AusFinish"] = df["Driver"].map(aus_finish)

    team_map = {
        "ANT": "Mercedes", "RUS": "Mercedes", "HAM": "Ferrari", "LEC": "Ferrari",
        "PIA": "McLaren", "NOR": "McLaren", "GAS": "Alpine", "VER": "Red Bull",
        "HAD": "Racing Bulls", "BEA": "Haas", "HUL": "Haas", "COL": "Williams",
        "OCO": "Alpine", "LAW": "Racing Bulls", "LIN": "Williams", "BOR": "Alpine",
        "SAI": "Williams", "ALB": "Williams", "ALO": "Aston Martin",
        "BOT": "Audi", "STR": "Aston Martin", "PER": "Red Bull",
    }
    team_score_map = {
        "McLaren": 1.0, "Mercedes": 0.574, "Red Bull": 0.533, "Ferrari": 0.478,
        "Williams": 0.171, "Aston Martin": 0.100, "Haas": 0.091, "Racing Bulls": 0.115,
        "Audi": 0.085, "Alpine": 0.028,
    }
    df["Team"] = df["Driver"].map(team_map)
    df["TeamScore"] = df["Team"].map(team_score_map).fillna(0.05)
    df["RainProbability"] = 0.6
    df["Temperature"] = 16.0
    df["RaceScore"] = df["AusFinish"]

    feature_cols = ["ChinaGapFromPole_s", "ChinaGrid", "AusGrid", "TeamScore", "RainProbability", "Temperature"]
    X = df[feature_cols].copy()
    y = df["RaceScore"]

    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    model = XGBRegressor(
        n_estimators=200, learning_rate=0.05, max_depth=3,
        subsample=0.8, colsample_bytree=0.8, reg_lambda=1.5, random_state=42,
    )

    loo = LeaveOneOut()
    loo_errors = []
    for train_idx, test_idx in loo.split(X_imputed):
        X_tr, X_te = X_imputed[train_idx], X_imputed[test_idx]
        y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]
        model.fit(X_tr, y_tr)
        loo_errors.append(abs(model.predict(X_te)[0] - y_te.iloc[0]))
    loo_mae = float(np.mean(loo_errors))

    model.fit(X_imputed, y)
    df["PredictedScore"] = model.predict(X_imputed)
    final = df.sort_values("PredictedScore").reset_index(drop=True)

    return {
        "race": "2026 Chinese Grand Prix",
        "model_mae": round(loo_mae, 4),
        "weather": {"temperature_c": 16.0, "rain_probability": 0.6},
        "podium": [
            {"position": i + 1, "driver": row["Driver"], "team": row["Team"]}
            for i, (_, row) in enumerate(final.head(3).iterrows())
        ],
        "full_order": [
            {"position": i + 1, "driver": row["Driver"], "team": row["Team"],
             "predicted_score": round(float(row["PredictedScore"]), 4)}
            for i, (_, row) in enumerate(final.iterrows())
        ],
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Export F1 predictions to JSON")
    parser.add_argument("--out", default="../../addons/predictions-cache/predictions.json",
                        help="Output JSON file path")
    args = parser.parse_args()

    print("Running Australian GP prediction...", file=sys.stderr)
    aus = predict_australian_gp()

    print("Running Chinese GP prediction...", file=sys.stderr)
    chn = predict_chinese_gp()

    output = {
        "generated_at": pd.Timestamp.utcnow().isoformat() + "Z",
        "season": 2026,
        "predictions": [aus, chn],
    }

    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written to {out_path}", file=sys.stderr)
    print(json.dumps(output))


if __name__ == "__main__":
    main()
