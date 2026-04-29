# F1 Intelligence Gap Analysis (Current Repo)

## Existing Features
- **Stack and architecture**
  - Next.js App Router + React + TypeScript (`app/*`, `src/*`)
  - In-memory SWR-style caching in API routes (`app/api/telemetry`, `app/api/sessions`, `app/api/replay`)
  - Typed client data-access layer with Zod validation and fallback policy (`src/data-access/*`)
- **Race/replay surfaces**
  - Main dashboard mode-switcher (`LIVE`, `HISTORICAL`, `REPLAY`, `ADDONS`, `CHAT`, `PREDICTIONS`)
  - Replay page with synchronized map playback, driver markers, race control panel, focused driver card, and replay leaderboard (`src/components/RaceReplay.tsx`)
  - Track backdrop renderer with known SVG circuit library (`src/components/TrackBackdrop.tsx`, `src/services/trackLibrary.ts`)
- **APIs and data providers**
  - Live telemetry route (`/api/telemetry`) using OpenF1
  - Historical results path via Jolpica (`src/services/jolpica.ts`)
  - Replay dataset route (`/api/replay/:year/:round`) with laps, stints, race control, positions, DRS derivation
  - Driver replay telemetry route (`/api/replay/:year/:round/driver/:driver`)
  - Prediction forecast route (`/api/predictions/forecast`)
- **Existing reliability work**
  - request retries/timeouts/fallback contracts
  - stale-on-error behavior for telemetry/sessions/replay
  - unit test for HTTP fallback path + visual snapshot tests

## Partially Existing Features
- **Winner strategy summary**
  - Underlying data exists (laps + stints), but no dedicated strategy summary card/engine yet.
- **Tyre stint intelligence**
  - Compound is already derived per lap in replay API.
  - No dedicated tyre stint chart in UI yet.
- **Pit timeline**
  - `is_pit_out_lap` exists in lap payload.
  - No dedicated pit stop timeline module yet.
- **Position evolution**
  - Position samples exist (`positions`) and lap-level `position` may exist.
  - No dedicated trend chart module yet.
- **Recent vs historical capability split**
  - Data sources differ (`OpenF1` vs `Jolpica`), but UI does not yet clearly implement “rich recent mode” vs “lighter archival mode” inside race intelligence modules.
- **Replay/data synchronization**
  - Replay is synchronized already.
  - Intelligence modules are not yet integrated into replay timeline context.

## Missing Features
- Race overview intelligence card (modern mode)
- Winner strategy card with machine-derived narrative
- Tyre stint chart (driver stints and compound spans)
- Pit stop timeline panel
- Position evolution chart
- Weather strip (for modern races where data is available)
- Team radio moments panel (modern races where data is available)
- Driver strategy comparison module
- Explicit archival-mode fallback cards for older races

## Data/Backend Gaps
- No normalized persistent schema in the active Next runtime for:
  - `pit_stops`, `weather_samples`, `team_radio`, `strategy_summaries`
- No OpenF1 adapters currently implemented for:
  - weather endpoint ingestion
  - team radio endpoint ingestion
- No reusable backend derivation endpoint for strategy summaries / tyre-per-lap expansion (currently computed ad-hoc in replay route only for compound assignment).
- No shared domain model that unifies “recent intelligence payload” and “archival payload”.

## Frontend/UI Gaps
- No dedicated race-intelligence module container in replay/race detail surface.
- Missing chart components for stints, pit events, and position trend.
- No explicit mode treatment:
  - rich cards for modern races (2023+)
  - constrained archival cards for older races.
- No reusable strategy comparison panel tied to selected/focused driver.

## UX Consistency Risks
- `src/components/RaceReplay.tsx` is already large and feature-dense; adding intelligence directly there risks maintainability and visual clutter.
- Existing visual language is “glass panel + chips + compact telemetry cards”; adding mismatched chart aesthetics would look disconnected.
- Multiple data freshness states (healthy/degraded/offline) require explicit UI handling on new cards to avoid inconsistent confidence cues.

## Recommended Build Order
1. **Create reusable derivation layer** (no UI yet):
   - tyre-per-lap expansion
   - winner strategy summary
   - pit event extraction
   - position trend series
2. **Add a modular race intelligence panel** integrated into existing replay page layout.
3. **Implement modern-race modules first (2023+)**:
   - RaceOverviewCard
   - WinnerStrategyCard
   - TyreStintChart
   - PitTimeline
   - PositionChart
4. **Add archival mode cards** for older races (results + metadata + limited strategy summary only).
5. **Add weather/radio adapters** (backend + UI) with honest fallback if OpenF1 coverage is missing.
6. **Add DriverStrategyComparison + ReplaySyncRail enhancements**.
7. **Validation pass**
   - typecheck, lint, targeted tests
   - visual consistency pass on touched surfaces.
