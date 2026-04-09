from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import fastf1
import pandas as pd
from datetime import datetime
import os
from typing import List, Optional
import uvicorn
import numpy as np
import logging
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("f1-replay-api")

# Import existing logic from the project
try:
    from src.f1_data import enable_cache, load_session, get_driver_colors
    from src.lib.season import get_season
except ImportError:
    logger.error("Failed to import local modules. Ensure you are running from the correct directory.")
    raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enable FastF1 caching on startup
    try:
        enable_cache()
        logger.info("FastF1 cache enabled successfully.")
    except Exception as e:
        logger.error(f"Failed to enable FastF1 cache: {e}")
    yield

app = FastAPI(title="Harry's Pitwall - Replay API", lifespan=lifespan)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/sessions")
def get_sessions(year: int = Query(default=None)):
    if year is None:
        year = get_season()
    
    try:
        schedule = fastf1.get_event_schedule(year)
        if schedule.empty:
            return []
            
        races = schedule[schedule['EventFormat'] != 'testing']
        
        results = []
        for _, row in races.iterrows():
            try:
                # Ensure Session5Date exists and is valid
                start_date = None
                if 'Session5Date' in row and pd.notnull(row['Session5Date']):
                    start_date = row['Session5Date'].isoformat()
                
                results.append({
                    "session_key": int(row['RoundNumber']) if pd.notnull(row['RoundNumber']) else 0,
                    "country_name": row.get('Country', 'Unknown'),
                    "location": row.get('Location', 'Unknown'),
                    "event_name": row.get('EventName', 'Unknown'),
                    "date_start": start_date,
                    "year": year,
                    "round": int(row['RoundNumber']) if pd.notnull(row['RoundNumber']) else 0
                })
            except Exception as e:
                logger.warning(f"Skipping row during schedule processing: {e}")
                continue
        
        results.sort(key=lambda x: x['date_start'] or "", reverse=True)
        return results
    except Exception as e:
        logger.error(f"Error in get_sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/replay/{year}/{round_number}")
def get_replay_data(year: int, round_number: int, session_type: str = "R"):
    try:
        logger.info(f"Loading session: {year} Round {round_number} Type {session_type}")
        session = load_session(year, round_number, session_type)
        
        # Load necessary data
        # We catch timeout or other loading errors here
        try:
            session.load(laps=True, telemetry=True, weather=False, messages=True)
        except Exception as e:
            logger.error(f"FastF1 session.load failed: {e}")
            raise HTTPException(status_code=404, detail=f"Could not load session data: {e}")
            
        session_start = session.date
        if pd.isnull(session_start):
             session_start = datetime(year, 1, 1) # Fallback

        # Get drivers
        drivers_list = []
        if session.drivers:
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
                except Exception as e:
                    logger.debug(f"Could not get info for driver {drv_code}: {e}")
                    continue

        # Get Laps (High Fidelity Timing)
        laps_data = []
        earliest_start = None
        latest_end = None

        if not session.laps.empty:
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
                except Exception:
                    continue

        # Get Positions from Laps
        positions_data = []
        if not session.laps.empty:
            for _, lap in session.laps.iterlaps():
                try:
                    if pd.notnull(lap['Time']) and 'Position' in lap and pd.notnull(lap['Position']):
                        abs_time = session_start + lap['Time']
                        positions_data.append({
                            "driver_number": int(lap['DriverNumber']),
                            "date": abs_time.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                            "position": int(lap['Position'])
                        })
                except Exception:
                    continue

        # Track Map Outline
        track_points = []
        source_driver = 1
        try:
            if not session.laps.empty:
                fastest_lap = session.laps.pick_fastest()
                if pd.notnull(fastest_lap.get('LapTime')):
                    tel_map = fastest_lap.get_telemetry()
                    if tel_map is not None and not tel_map.empty:
                        # Use every 5th point for efficiency
                        for i in range(0, len(tel_map), 5):
                            track_points.append({
                                "x": float(tel_map.iloc[i]['X']),
                                "y": float(tel_map.iloc[i]['Y'])
                            })
                    source_driver = int(fastest_lap['DriverNumber']) if 'DriverNumber' in fastest_lap else 1
        except Exception as e:
            logger.warning(f"Track Map generation failed: {e}")

        # Race Control Messages
        race_control = []
        try:
            if hasattr(session, 'race_control') and not session.race_control.empty:
                for _, row in session.race_control.iterrows():
                    try:
                        msg_time_abs = session_start + row['Time']
                        race_control.append({
                            "date": msg_time_abs.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
                            "category": row.get('Category', 'Other'),
                            "message": row.get('Message', ''),
                            "flag": row.get('Flag') if 'Flag' in row else None
                        })
                    except Exception:
                        continue
        except Exception:
            pass

        # Use actual race start/end instead of session start
        final_start = earliest_start if earliest_start else session_start
        final_end = latest_end if latest_end else (final_start + pd.Timedelta(hours=2))

        return {
            "session": {
                "session_key": round_number,
                "country_name": session.event['Country'] if 'Country' in session.event else 'Unknown',
                "circuit_short_name": session.event['Location'] if 'Location' in session.event else 'Unknown',
                "year": year,
                "location": session.event['Location'] if 'Location' in session.event else 'Unknown'
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_replay_data: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Use 127.0.0.1 for local dev to avoid Mac OS network issues
    # and use port 8001 as previously established.
    uvicorn.run(app, host="127.0.0.1", port=8001)
