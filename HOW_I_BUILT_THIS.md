# How I Built "Harry's Pitwall" - A Comprehensive Workflow

This document outlines the exact process and architecture decisions made to build this premium, ultra-fast F1 Live Dashboard from scratch. 

## 1. The Goal and The Problem
**Goal:** Build a beautiful, responsive, and truly *live* F1 dashboard capable of rendering driver gaps, lap times, and telemetry in real-time.
**The Problem:** The legendary Ergast developer API was deprecated at the end of 2024. Furthermore, the alternative "OpenF1 API" strictly locks out historical and live data access for free users *while an actual F1 race session is active*.

## 2. The Core Tech Stack
To construct a premium dashboard, we initialized:
* **Frontend Framework:** React + TypeScript (via Vite for blazing-fast HMR).
* **Styling:** Pure Vanilla CSS relying on modern "Glassmorphism" (deep `backdrop-filter: blur(24px)`), "Bento Box" grid structures, and glowing radial gradients.
* **Typography:** `Inter` for data legibility, and `Outfit` for sleek, futuristic headers. 

## 3. The "Live Data" Pivot (The Backend)
Because public APIs block access during a live race, we had to become our own API. 
1. We cloned an open-source data scraper (`f1-live-data`) which connects directly to the official Formula 1 **SignalR telemetry feed**.
2. We stood up a local Docker container running **InfluxDB** (a time-series database perfect for telemetry).
3. A Python script (via `FastF1`) listens to the live F1 feed and injects the raw gap loops and timestamps into our local InfluxDB.
4. We bypassed browser CORS restrictions by configuring a **Vite Proxy** (`/influx`) in `vite.config.ts`, allowing our React app to query InfluxDB natively. 

## 4. Crafting the React Frontend
With data streaming locally into InfluxDB, we built custom parsing logic in `src/services/openf1.ts`:
* Used the **Flux Query Language** to extract `lastLapTime`, `numberOfLaps`, and global intervals.
* Re-mapped the raw CSV output from InfluxDB into structured React objects (`leaderboard`, `session`).
* Built `LiveTiming.tsx` to beautifully render the 20-driver taxonomy, complete with mapped team colors and sub-second gap displays.

## 5. The Max Verstappen Tracker
To elevate the dashboard, we built a dedicated right-hand widget entirely for Max Verstappen (Car 33/1).
* Instead of relying on missing static data, we built custom Flux pipelines that iterate over the last 3 hours of his telemetry in InfluxDB to dynamically calculate his **Best Lap** (`min()`) and **Highest Speed Trap** (`max()`).

## 6. The Historical Archive (Jolpica Integration)
Since our local InfluxDB only handles *Live* races, we wanted a way to view past completed races.
* We integrated the **Jolpica F1 API** (the open-source successor to Ergast).
* Added a React Mode Toggle (`<button className="toggle-btn">`) to flip the dashboard's state. 
* Upgraded `src/services/jolpica.ts` to dynamically download the entire 24-race calendar for any given season (2024, 2025, 2026).
* When a historical race is selected via the dropdowns, the dashboard bypasses InfluxDB and renders the static race classification perfectly into the Live Timing components.

## 7. The Final Polish
* Renamed everything to **"Harry's Pitwall"**.
* Deployed the entire monolithic codebase to GitHub (`HARISHMARAN/Harry-s-F1-data`) to ensure the architecture is securely backed up and scalable for future engineering!
