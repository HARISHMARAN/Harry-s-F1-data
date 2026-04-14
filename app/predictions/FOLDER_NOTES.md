# Folder Notes: app/predictions

## Purpose
Legacy route that redirects into the dashboard-native Prediction Studio.

## Key Files
- `page.tsx`

## Recent Bug Fixes / Changes
- 2026-04-14: Added the predictions hub page.
- 2026-04-14: Added client-side filters, card view, and compare mode.
- 2026-04-14: Added race selector and compact model comparison table.
- 2026-04-14: Simplified the page to a minimal click-to-view prediction panel.
- 2026-04-14: Switched the page to live API loading with Supabase Edge Function support and local API fallback.
- 2026-04-14: Redirected the route into the dashboard-native Prediction Studio.

## How It Works (High-Level)
This route now forwards to `/?mode=predictions` so the feature lives inside the main dashboard instead of an add-on page.
