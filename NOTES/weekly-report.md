# Weekly F1 Report MVP

## Overview
Server-side report pipeline:
1. Detect recent race session
2. Fetch normalized race data
3. Generate concise AI summary (with deterministic fallback)
4. Render HTML email
5. Send via Resend
6. Skip cleanly if no race is found

All report logic lives under `lib/report` and API is at `app/api/report/cron`.

## Required Environment Variables
OpenAI (summary generation):
- `OPENAI_API_KEY` (required for AI summaries; fallback used if missing)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)

Resend (email delivery):
- `RESEND_API_KEY` (required unless running with `dryRun=1`)
- `REPORT_FROM` (e.g. `"Harry's Pitwall <reports@yourdomain.com>"`)
- `REPORT_RECIPIENTS` (comma-separated list of emails)

## Manual Trigger
Local dev server required (`npm run dev`).

Dry run (no email):
```bash
curl "http://localhost:3000/api/report/cron?dryRun=1"
```

Run with custom window (days):
```bash
curl "http://localhost:3000/api/report/cron?windowDays=10&dryRun=1"
```

Send to specific recipients (overrides `REPORT_RECIPIENTS`):
```bash
curl "http://localhost:3000/api/report/cron?recipients=you@example.com,team@example.com"
```

## Expected Responses
- `status: "skipped"` when no race is found in the window
- `status: "dry-run"` when `dryRun=1`
- `status: "sent"` when an email is sent successfully
