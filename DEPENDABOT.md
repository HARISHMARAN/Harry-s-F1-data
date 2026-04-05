# Dependabot Guide (Harry-s-F1-data)

Last updated: 2026-04-05 (local)

## What This Bot Is
Dependabot is GitHub’s automated dependency update service. It scans dependency manifests and opens pull requests to bump versions when updates are available. It can also open security update PRs when vulnerabilities are detected.

## Why It’s Useful
- **Security**: keeps dependencies patched against known vulnerabilities.
- **Maintenance**: reduces manual work to track releases.
- **Reliability**: updates are scoped, reviewable PRs with changelogs.

## Where It’s Useful In This Repo
Dependabot runs on the ecosystems and directories we configured:
- **npm**
  - `/`
  - `/addons/f1-rag-ai`
  - `/addons/formula-chat/frontend`
- **pip**
  - `/addons/racing-lap-trace-python`
  - `/addons/f1-race-replay`
  - `/f1-race-replay`
  - `/addons/formula-chat/api`
  - `/addons/formula-chat/scripts`

## How To Use It (Day-to-Day)
1. **Open a Dependabot PR** and read the summary.
2. **Check the scope** (single dependency or grouped updates).
3. **Run tests** for the affected app (frontend/backend as needed).
4. **Merge if green**, or **close** if it breaks or is not desired.

### Useful Commands (comment on the PR)
- `@dependabot rebase` — rebase the PR
- `@dependabot recreate` — recreate the PR from scratch
- `@dependabot ignore this major version`
- `@dependabot ignore this minor version`
- `@dependabot ignore this dependency`

## Current Setup (from `.github/dependabot.yml`)
```yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "npm"

  - package-ecosystem: "npm"
    directory: "/addons/f1-rag-ai"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "npm"

  - package-ecosystem: "npm"
    directory: "/addons/formula-chat/frontend"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "npm"

  - package-ecosystem: "pip"
    directory: "/addons/racing-lap-trace-python"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "pip"

  - package-ecosystem: "pip"
    directory: "/addons/f1-race-replay"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "pip"

  - package-ecosystem: "pip"
    directory: "/f1-race-replay"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "pip"

  - package-ecosystem: "pip"
    directory: "/addons/formula-chat/api"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "pip"

  - package-ecosystem: "pip"
    directory: "/addons/formula-chat/scripts"
    schedule:
      interval: "weekly"
      day: "sunday"
      time: "06:00"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "pip"
```

## Current Dependabot PRs (latest observed)
GitHub API rate limits can prevent a full fetch. Below is the **latest observed list**; use the GitHub search filter to see all Dependabot PRs.

- #45 — `pgvector` 0.3.6 → 0.4.2 (`/addons/formula-chat/api`)
- #44 — `sqlglot` 26.0.0 → 30.2.1 (`/addons/formula-chat/api`)
- #43 — `openai-agents` 0.0.11 → 0.13.4 (`/addons/formula-chat/api`)
- #4 — `path-to-regexp` + `express` bump (`/addons/f1-rag-ai`)
- #3 — `qs` + `express` bump (`/addons/f1-rag-ai`)
- #2 — `picomatch` 4.0.3 → 4.0.4 (`/addons/formula-chat/frontend`)

### View All Dependabot PRs
Use this filter in GitHub’s PR search bar:
```
author:app/dependabot is:pr repo:HARISHMARAN/Harry-s-F1-data
```

## Suggested Workflow
- **Batch merge low-risk bumps** (patch/minor) after CI passes.
- **Review major bumps** carefully; scan changelog and breaking changes.
- **Close or ignore** if a dependency is not used or introduces issues.

