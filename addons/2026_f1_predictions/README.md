# 2026 F1 Predictions

This add-on packages the upstream `2026_f1_predictions` scripts into the monorepo as a standalone Python prediction toolkit.

## What It Does

- `prediction1.py` predicts the Australian GP finish order and podium
- `prediction2.py` predicts the Chinese GP finishing order
- `racepace.py` compares single-lap pace for the Chinese GP

## Dependencies

Install the Python dependencies in this folder:

```bash
pip install -r requirements.txt
```

## Run

```bash
python3 prediction1.py
python3 prediction2.py
python3 racepace.py
```

## Integration Note

This add-on is intentionally script-driven. The core dashboard should call into it through an API or job runner if you want live predictions inside the web UI.
