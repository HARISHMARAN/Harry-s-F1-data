# UI/UX Version Lock

Saved on: 2026-04-30

Restore branch: `uaux-fixed`
Restore tag: `uaux-fixed-2026-04-30`
Baseline commit before this note: `c5fe4ae`

This version is the locked UI/UX baseline after the homepage, track backdrop,
live telemetry layout, visual regression baselines, and dashboard QA fixes were
stabilized.

Use this restore point when future feature work changes the interface and the
project needs to return to this known-good UI/UX version.

## Locked Surfaces

- Homepage dashboard layout and draggable HUD layering.
- Miami/upcoming race track backdrop treatment without raw SVG dots.
- Live telemetry dashboard sizing and navigation click behavior.
- Chatbot, News, Predictions, Historical Archive, Race Replay, and Live
  Telemetry homepage controls.
- Visual regression baselines under `tests/visual/ui.spec.ts-snapshots/`.

## Restore Commands

To inspect this version locally:

```bash
git fetch origin --tags
git switch uaux-fixed
```

To create a new branch from this locked version:

```bash
git fetch origin --tags
git switch -c restore-from-uaux-fixed uaux-fixed-2026-04-30
```

## Verification At Lock Time

- `npm run typecheck`
- `npx eslint src app tests scripts --max-warnings=0`
- `npm run test:unit`
- `npm run test:integration`
- `npm run build`
- `npm run test:visual`
- Browser smoke over the homepage controls
