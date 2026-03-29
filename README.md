# Harry's F1 True Live Dashboard

A completely custom built, native "live-live" Formula 1 React Dashboard. This project bypasses commercial API locking mechanisms by drawing telemetry data strictly from the native F1 SignalR broadcast arrays. 

## 🏎️ Features
- **True Live Pipeline:** Polls and re-sorts all competitive metrics every 5 seconds natively across the Grid.
- **InfluxDB Integration:** Proxied via Vite to scrape `fastf1` database tables (`gapToLeader` and `numberOfLaps`).
- **Premium Glassmorphism:** Fully vanilla CSS-defined design focusing on rich gradients, dynamic layout rendering, and thematic team branding without heavy library imports.
- **Race Tracking Widget:** Continuously checks for real-time race events (like Laps).

## Architecture
- **Frontend:** React + TypeScript (Vite + SWC)
- **Data Integration:** Direct InfluxDB `Flux` Query parsing engine baked into the React logic (`src/services/openf1.ts`). 
- **Dependencies:** `lucide-react` for minimal thematic rendering, `f1-live-data` python instance for data ingestion.

## How to Run
1. Obtain the `f1-live-data` python backend and run its docker containers for `influxdb` and `data-importer`.
2. Boot this frontend:
```bash
npm install
npm run dev
```
3. Open `http://localhost:5173` to view the live timing telemetry!
