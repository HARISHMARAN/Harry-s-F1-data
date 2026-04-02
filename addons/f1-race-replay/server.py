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
        # Load session. We NEED telemetry=True for the track map,
        # but we will only call get_telemetry() once to keep it fast.
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
        earliest_start = None
        latest_end = None

        for _, lap in session.laps.iterlaps():
            try:
                if pd.notnull(lap['Time']) and pd.notnull(lap['LapTime']):
                    lap_end_td = lap['Time']
                    lap_duration_td = lap['LapTime']
                    lap_start_td = lap_end_td - lap_duration_td
                    
                    lap_end_abs = session_start + lap_end_td
                    lap_start_abs = session_start + lap_start_td
                    
                    if earliest_start is None or lap_start_abs < earliest_start:
                        earliest_start = lap_start_abs
                    if latest_end is None or lap_end_abs > latest_end:
                        latest_end = lap_end_abs

                    laps_data.append({
                        "driver_number": int(lap['DriverNumber']),
                        "lap_number": int(lap['LapNumber']),
                        "lap_duration": float(lap_duration_td.total_seconds()),
                        "date_start": lap_start_abs.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                        "is_pit_out_lap": bool(pd.notnull(lap.get('PitOutTime')))
                    })
            except:
                continue

        # Get Positions from Laps (Much lighter than telemetry sampling)
        positions_data = []
        for _, lap in session.laps.iterlaps():
            try:
                if pd.notnull(lap['Time']) and pd.notnull(lap['Position']):
                    abs_time = session_start + lap['Time']
                    positions_data.append({
                        "driver_number": int(lap['DriverNumber']),
                        "date": abs_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                        "position": int(lap['Position'])
                    })
            except:
                continue

        # Track Map Outline from fastest lap - ONE SINGLE TELEMETRY CALL
        try:
            fastest_lap = session.laps.pick_fastest()
            tel_map = fastest_lap.get_telemetry()
            track_points = []
            if tel_map is not None and not tel_map.empty:
                # Use every 5th point for better resolution than before (10th) but still light
                for i in range(0, len(tel_map), 5):
                    track_points.append({
                        "x": float(tel_map.iloc[i]['X']),
                        "y": float(tel_map.iloc[i]['Y'])
                    })
            source_driver = int(fastest_lap['DriverNumber']) if 'DriverNumber' in fastest_lap else 1
        except Exception as e:
            print(f"Track Map Error: {e}")
            track_points = []
            source_driver = 1

        # Race Control Messages
        race_control = []
        try:
            for _, row in session.race_control.iterrows():
                msg_time_abs = session_start + row['Time']
                race_control.append({
                    "date": msg_time_abs.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                    "category": row['Category'],
                    "message": row['Message'],
                    "flag": row['Flag'] if 'Flag' in row else None
                })
        except:
            pass

        # Use actual race start/end instead of session start
        final_start = earliest_start if earliest_start else session_start
        final_end = latest_end if latest_end else (final_start + pd.Timedelta(hours=2))

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
                "source_driver_number": source_driver
            },
            "start_time": final_start.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
            "end_time": final_end.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
            "total_laps": int(session.laps['LapNumber'].max()) if not session.laps.empty else 0
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
