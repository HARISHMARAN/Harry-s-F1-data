from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import pandas as pd
from datetime import datetime
import os
from typing import List, Optional
import uvicorn
import numpy as np

# Import existing logic from the project
from src.f1_data import enable_cache, load_session, get_driver_colors
from src.lib.season import get_season

app = FastAPI(title="Harry's Pitwall - Replay API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enable FastF1 caching on startup
@app.on_event("startup")
def startup_event():
    enable_cache()

@app.get("/api/sessions")
def get_sessions(year: int = Query(default=None)):
    if year is None:
        year = get_season()
    
    try:
        schedule = fastf1.get_event_schedule(year)
        races = schedule[schedule['EventFormat'] != 'testing']
        
        results = []
        for _, row in races.iterrows():
            results.append({
                "session_key": int(row['RoundNumber']),
                "country_name": row['Country'],
                "location": row['Location'],
                "event_name": row['EventName'],
                "date_start": row['Session5Date'].isoformat() if pd.notnull(row['Session5Date']) else None,
                "year": year,
                "round": int(row['RoundNumber'])
            })
        
        results.sort(key=lambda x: x['date_start'] or "", reverse=True)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/replay/{year}/{round_number}")
def get_replay_data(year: int, round_number: int, session_type: str = "R"):
    try:
        # Load session with full laps AND telemetry
        session = load_session(year, round_number, session_type)
        session.load(laps=True, telemetry=True, weather=False, messages=True)
        
        session_start = session.date
        
        # Get drivers
        drivers_list = []
        for drv_code in session.drivers:
            try:
                info = session.get_driver(drv_code)
                drivers_list.append({
                    "driver_number": int(info['DriverNumber']),
                    "full_name": info['FullName'],
                    "name_acronym": info['Abbreviation'],
                    "team_name": info['TeamName'],
                    "team_colour": info['TeamColor'],
                })
            except:
                continue

        # Get Laps (High Fidelity Timing)
        laps_data = []
        for _, lap in session.laps.iterlaps():
            try:
                if pd.notnull(lap['Time']) and pd.notnull(lap['LapTime']):
                    lap_end = session_start + lap['Time']
                    lap_start = lap_end - lap['LapTime']
                    
                    laps_data.append({
                        "driver_number": int(lap['DriverNumber']),
                        "lap_number": int(lap['LapNumber']),
                        "lap_duration": float(lap['LapTime'].total_seconds()),
                        "date_start": lap_start.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                        "is_pit_out_lap": bool(lap['PitOutTime'] is not None and pd.notnull(lap['PitOutTime']))
                    })
            except:
                continue

        # Get Positions from Telemetry (Sampled every 5 seconds)
        positions_data = []
        for drv_code in session.drivers:
            try:
                # Use pick_drivers for FastF1 v3 compatibility
                drv_laps = session.laps.pick_drivers(drv_code)
                # We iterate through laps to get per-lap telemetry
                for _, lap in drv_laps.iterrows():
                    tel = lap.get_telemetry()
                    if tel is not None and not tel.empty:
                        # Sample 3 points per lap: start, middle, end
                        indices = [0, len(tel)//2, len(tel)-1]
                        for idx in indices:
                            row = tel.iloc[idx]
                            abs_time = session_start + row['Time']
                            positions_data.append({
                                "driver_number": int(drv_code),
                                "date": abs_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                                "position": int(lap['LapNumber'])
                            })
            except Exception as e:
                # log or ignore errors for individual drivers
                pass

        # Track Map Outline from fastest lap
        try:
            fastest_lap = session.laps.pick_fastest()
            tel_map = fastest_lap.get_telemetry()
            track_points = []
            for i in range(0, len(tel_map), 10):
                track_points.append({
                    "x": float(tel_map.iloc[i]['X']),
                    "y": float(tel_map.iloc[i]['Y'])
                })
        except:
            track_points = []

        # Race Control Messages
        race_control = []
        try:
            for _, row in session.race_control.iterrows():
                race_control.append({
                    "date": (session_start + row['Time']).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                    "category": row['Category'],
                    "message": row['Message'],
                    "flag": row['Flag'] if 'Flag' in row else None
                })
        except:
            pass

        return {
            "session": {
                "session_key": round_number,
                "country_name": session.event['Country'],
                "circuit_short_name": session.event['Location'],
                "year": year,
                "location": session.event['Location']
            },
            "drivers": drivers_list,
            "laps": laps_data,
            "positions": positions_data,
            "race_control": race_control,
            "track": {
                "points": track_points,
                "source_driver_number": int(fastest_lap.get('DriverNumber', 1))
            },
            "start_time": session_start.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
            "end_time": (session_start + pd.Timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
            "total_laps": int(session.laps['LapNumber'].max())
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
