# Folder Notes: addons/2026_f1_predictions
## Purpose
Standalone 2026 F1 race prediction scripts imported from the upstream predictions repo.

## Key Files
- `prediction1.py`
- `prediction2.py`
- `racepace.py`
- `README.md`
- `requirements.txt`

## Recent Bug Fixes / Changes
- 2026-04-14: Added as a local add-on so prediction logic lives inside the monorepo.

## How It Works (High-Level)
These scripts are static, race-specific predictors. They are best treated as an offline analysis tool unless we wire them into a backend job/API layer.
