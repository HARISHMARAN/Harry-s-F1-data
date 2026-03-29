# Harry's F1 True Live Dashboard

A completely custom built, native "live-live" Formula 1 React Dashboard. This project bypasses commercial API locking mechanisms by drawing telemetry data strictly from the native F1 SignalR broadcast arrays. 

## 🏎️ Features
- **True Live Pipeline:** Polls and re-sorts all competitive metrics every 5 seconds natively across the Grid.
- **InfluxDB Integration:** Proxied via Vite to scrape `fastf1` database tables (`gapToLeader` and `numberOfLaps`).
- **Browser Replay:** Historical race replay now runs directly inside the Vite app on localhost using OpenF1 session, lap, race-control, and position data.
- **Premium Glassmorphism:** Fully vanilla CSS-defined design focusing on rich gradients, dynamic layout rendering, and thematic team branding without heavy library imports.
- **Race Tracking Widget:** Continuously checks for real-time race events (like Laps).

## Architecture
- **Frontend:** React + TypeScript (Vite + SWC)
- **Data Integration:** Direct InfluxDB `Flux` Query parsing engine baked into the React logic (`src/services/openf1.ts`). 
- **Dependencies:** `lucide-react` for minimal thematic rendering, `f1-live-data` python instance for data ingestion.

## How to Run
1. Install dependencies:
```bash
npm install
```
2. Start the dashboard locally:
```bash
npm run dev
```
3. Open `http://localhost:5173`.
4. Use:
   - `Live Telemetry` for the Influx-backed live dashboard
   - `Historical Archive` for Jolpica race classification data
   - `Race Replay` for the new browser-native replay experience

## Live Telemetry Backend
The live telemetry tab still expects the local `f1-live-data` pipeline and InfluxDB proxy:

1. Run the `f1-live-data` backend and its Docker services for `influxdb` and `data-importer`.
2. Keep the Vite dev server running so `/influx` can proxy to `http://localhost:8086`.

## Branching
- `main`: stable branch
- `developer`: active development branch for integration work
