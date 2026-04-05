# Harry's F1 Chatbot Blueprint

## Purpose
A production-ready Formula 1 chatbot with a separate API backend and a Vercel-hosted frontend. The API uses OpenRouter (free router) for chat completions, plus PostgreSQL (Neon) for structured F1 data and optional knowledge-base embeddings.

This document covers:
- Architecture overview
- Repos and responsibilities
- Deployment runbook (end-to-end)
- Environment variables
- Database setup
- Debugging checklist
- What changed and why

---

## Architecture Overview

**High-level flow**

```
User Browser
  |
  |  HTTPS (chat requests)
  v
Frontend (Vercel) - harry-s-f1-data
  |
  |  POST /api/v1/chat or /api/v1/chat/stream
  v
API (Vercel) - harry-s-f1-api-s
  |
  |  OpenRouter Chat Completions
  |  PostgreSQL (Neon) for SQL + optional RAG
  v
OpenRouter + Neon
```

**Components**
- **Frontend:** React app (Vercel). Displays chat, reads API URL from `VITE_FORMULA_CHAT_API_URL`.
- **API:** Express server deployed as a Vercel Serverless Function.
- **Model Provider:** OpenRouter (free router model).
- **Database:** Neon Postgres (with pgvector for optional RAG).

---

## Repositories

### 1) Frontend
- **Repo:** `Harry-s-F1-data`
- **Role:** UI + chat experience + live F1 visuals
- **Key paths:**
  - `src/hooks/useChat.ts` — core chat logic
  - `src/components/chat/*` — UI

### 2) API
- **Repo:** `harry-s-f1-api-s`
- **Role:** Chat API (OpenRouter + DB)
- **Key paths:**
  - `api/index.js` — Express API (Vercel function)
  - `scripts/db/*` — schema + indexes
  - `scripts/ingest/*` — knowledge base ingestion

---

## Deployment Runbook (End-to-End)

### Step 1 — Deploy API (Vercel)
1. Create new Vercel project from `harry-s-f1-api-s` repo.
2. Framework preset: **Other**.
3. Root directory: **repo root**.
4. Create a Postgres database from Vercel Marketplace (Neon).

### Step 2 — API Environment Variables
Set in **harry-s-f1-api-s** (Production + Preview):

```
OPENAI_API_KEY=sk-or-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openrouter/free
OPENROUTER_APP_URL=https://harry-s-f1-data.vercel.app
OPENROUTER_APP_NAME=harry-s-f1-api-s
POSTGRES_URL=...            # auto from Neon integration
API_CORS_ORIGINS=https://harry-s-f1-data.vercel.app,https://harry-s-f1-data-git-main-harishmarans-projects.vercel.app
DISABLE_TOOLS=true          # optional; safest for free router
ENABLE_KNOWLEDGE_BASE=false # optional if embeddings are failing
```

Then **Redeploy API**.

### Step 3 — Deploy Frontend
1. In Vercel project **harry-s-f1-data**, set:

```
VITE_FORMULA_CHAT_API_URL=https://harry-s-f1-api-s.vercel.app
```

2. Redeploy frontend.

### Step 4 — Verify
- API health:
  ```
  https://harry-s-f1-api-s.vercel.app/health
  ```
- Test chat:
  ```bash
  curl -X POST https://harry-s-f1-api-s.vercel.app/api/v1/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello","history":[]}'
  ```

---

## Database Setup (One-Time)
After Neon is connected, initialize schema:

- `scripts/db/schema.sql`
- `scripts/db/users.sql`
- `scripts/db/indexes.sql`

You can run these using Neon SQL Editor or `psql`.

---

## Knowledge Base (Optional)
The RAG pipeline is optional and may be disabled for OpenRouter free.

To ingest:
```
cd scripts
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# set OPENAI_API_KEY and DATABASE_URL

python ingest/run_ingest.py
```

---

## Key Fixes Implemented

### 1) OpenRouter Support
- Added `OPENAI_BASE_URL` and OpenRouter headers.
- Free router does not reliably support tools → auto-disable.
- Added fallback to direct OpenRouter HTTP call if SDK fails.

### 2) Vercel Routing
- Added rewrites so `/health` and `/api/v1/*` route to the single API function.

### 3) Frontend Online Mode
- Chat now detects online mode via `VITE_FORMULA_CHAT_API_URL`.
- Health check points to the correct API base.

---

## Common Errors + Fixes

### Error: `Missing OPENAI_API_KEY`
Fix: add `OPENAI_API_KEY` in API project env vars and redeploy.

### Error: `Missing DATABASE_URL`
Fix: use `POSTGRES_URL` or set `DATABASE_URL` explicitly.

### Error: `Connection error` (OpenRouter)
Cause: OpenRouter free model failing tool calls or embeddings.
Fix: set `DISABLE_TOOLS=true` and/or `ENABLE_KNOWLEDGE_BASE=false`.

### Frontend shows `API: DOWN`
Cause: wrong CORS or missing frontend env var.
Fix:
- Ensure `API_CORS_ORIGINS` includes prod + preview URLs.
- Set `VITE_FORMULA_CHAT_API_URL` and redeploy frontend.

---

## Final Verified State
- API health endpoint returns 200
- Chat works via OpenRouter free router
- Frontend displays `API: OK`

---

## Appendix: Architecture Diagram (ASCII)

```
+------------------+       HTTPS        +--------------------------+
|  Browser Client  | --------------->   |  Frontend (Vercel)        |
|  (User)          |                    |  harry-s-f1-data          |
+------------------+                    +-------------+------------+
                                                   |
                                                   | HTTPS (chat)
                                                   v
                                         +--------------------------+
                                         |  API (Vercel)            |
                                         |  harry-s-f1-api-s        |
                                         |  Express + OpenRouter    |
                                         +-----------+--------------+
                                                     |
                           +-------------------------+----------------------+
                           |                                                |
                           v                                                v
                  +------------------+                           +--------------------+
                  |  OpenRouter API  |                           |  Neon Postgres     |
                  |  openrouter/free |                           |  (pgvector optional)|
                  +------------------+                           +--------------------+
```

---

## Files Changed (High-Level)

### Frontend (`Harry-s-F1-data`)
- `src/hooks/useChat.ts` — online/offline detection
- `src/components/chat/ChatView.tsx` — health check uses API base
- `src/components/chat/WelcomeScreen.tsx` — mode detection

### API (`harry-s-f1-api-s`)
- `api/index.js` — OpenRouter support, retries, fallbacks
- `vercel.json` — rewrites for `/health` and `/api/v1/*`

