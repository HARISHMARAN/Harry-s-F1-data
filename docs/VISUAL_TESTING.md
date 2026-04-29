# Visual Regression Testing

This repo includes Playwright-based visual regression tests for:

- `/`
- `/replay`
- `/pitwall`

## First-time baseline setup

1. Build app: `npm run build`
2. Start app: `npm run start -- --hostname 127.0.0.1 --port 3000`
3. Generate snapshots: `npm run test:visual:update`

This creates snapshot baselines under `tests/visual/ui.spec.ts-snapshots/`.

## Run checks against baseline

- `npm run test:visual`

If UI changed intentionally, update baselines with:

- `npm run test:visual:update`

## CI workflow

- `.github/workflows/visual-regression.yml`
- Installs Chromium and runs visual tests on relevant PR changes.
