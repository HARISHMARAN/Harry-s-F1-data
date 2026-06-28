"""
FastF1 live timing bridge — FREE tier, no F1TV auth required.

Uses FastF1's SignalRClient(no_auth=True) to connect to the public
livetiming.formula1.com feed. Provides all timing data available
without a subscription:

  DriverList, SessionInfo, SessionStatus, TimingData, TimingAppData,
  TimingStats, LapCount, WeatherData, RaceControlMessages, TrackStatus,
  TopThree, ExtrapolatedClock, SessionData

NOT available (requires F1TV):
  CarData.z (speed/RPM/throttle/brake)
  Position.z (GPS coordinates)

Usage:
    pip install fastf1 fastapi uvicorn
    python3 server/f1live.py

Endpoint:  GET http://localhost:8001/live
Set FASTF1_LIVE=1 in .env.local to activate in the Next.js app.
"""

import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from fastf1.livetiming.client import SignalRClient
    HAS_FASTF1_CLIENT = True
except ImportError:
    HAS_FASTF1_CLIENT = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("f1live")

app = FastAPI(title="F1 Live Timing Bridge (free tier)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])

# ─── Shared state ─────────────────────────────────────────────────────────────

_lock = threading.Lock()

_state: dict[str, Any] = {
    "connected": False,
    "session_name": None,
    "session_type": None,
    "session_status": None,
    "session_remaining": None,       # ExtrapolatedClock
    "drivers": {},                   # num -> driver info
    "timing": {},                    # num -> timing data
    "lap_count": {"current": None, "total": None},
    "weather": None,
    "race_control": [],
    "track_status": {"status": None, "message": None},
    "top_three": {},
    "last_update": 0,
}

# ─── Deep merge ───────────────────────────────────────────────────────────────

def _deep_merge(base: dict, update: dict) -> dict:
    for key, val in update.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            _deep_merge(base[key], val)
        else:
            base[key] = val
    return base

# ─── Message dispatcher ───────────────────────────────────────────────────────

TRACK_STATUS_MAP = {
    "1": ("GREEN",   "TRACK CLEAR"),
    "2": ("YELLOW",  "YELLOW FLAG"),
    "4": ("YELLOW",  "SAFETY CAR DEPLOYED"),
    "5": ("RED",     "RED FLAG"),
    "6": ("YELLOW",  "VIRTUAL SAFETY CAR DEPLOYED"),
    "7": ("YELLOW",  "VIRTUAL SAFETY CAR ENDING"),
}


def _handle_message(topic: str, data: Any) -> None:
    """Update shared state from a parsed SignalR feed message."""
    with _lock:
        _state["last_update"] = time.time()

        if topic == "SessionInfo":
            if isinstance(data, dict):
                meeting = data.get("Meeting", {}) or {}
                _state["session_name"] = (
                    meeting.get("OfficialName")
                    or meeting.get("Name")
                    or data.get("Name")
                )
                _state["session_type"] = data.get("Type")

        elif topic == "SessionStatus":
            if isinstance(data, dict):
                _state["session_status"] = data.get("Status")

        elif topic == "ExtrapolatedClock":
            if isinstance(data, dict):
                _state["session_remaining"] = data.get("Remaining")

        elif topic == "DriverList":
            if isinstance(data, dict):
                for num_str, info in data.items():
                    if not isinstance(info, dict):
                        continue
                    try:
                        num = int(num_str)
                    except (ValueError, TypeError):
                        continue
                    existing = _state["drivers"].get(num, {})
                    _state["drivers"][num] = _deep_merge(existing, info)

        elif topic == "TimingData":
            if isinstance(data, dict):
                lines = data.get("Lines", {}) or {}
                for num_str, timing in lines.items():
                    if not isinstance(timing, dict):
                        continue
                    try:
                        num = int(num_str)
                    except (ValueError, TypeError):
                        continue
                    existing = _state["timing"].get(num, {})
                    _state["timing"][num] = _deep_merge(existing, timing)

        elif topic == "TimingAppData":
            if isinstance(data, dict):
                lines = data.get("Lines", {}) or {}
                for num_str, app_data in lines.items():
                    try:
                        num = int(num_str)
                    except (ValueError, TypeError):
                        continue
                    if not isinstance(app_data, dict):
                        continue
                    existing = _state["timing"].get(num, {})
                    _state["timing"][num] = _deep_merge(existing, app_data)

        elif topic == "LapCount":
            if isinstance(data, dict):
                _state["lap_count"] = {
                    "current": data.get("CurrentLap"),
                    "total": data.get("TotalLaps"),
                }

        elif topic == "WeatherData":
            if isinstance(data, dict):
                _state["weather"] = data

        elif topic == "TrackStatus":
            if isinstance(data, dict):
                code = str(data.get("Status", ""))
                flag, message = TRACK_STATUS_MAP.get(code, (None, data.get("Message")))
                _state["track_status"] = {"status": flag, "message": message, "code": code}

        elif topic == "RaceControlMessages":
            if isinstance(data, dict):
                msgs = data.get("Messages", {}) or {}
                if isinstance(msgs, dict):
                    for msg in msgs.values():
                        if isinstance(msg, dict):
                            _state["race_control"].append(msg)
                            _state["race_control"] = _state["race_control"][-30:]
                elif isinstance(msgs, list):
                    for msg in msgs:
                        if isinstance(msg, dict):
                            _state["race_control"].append(msg)
                            _state["race_control"] = _state["race_control"][-30:]

        elif topic == "TopThree":
            if isinstance(data, dict):
                _state["top_three"] = data


# ─── FastF1 SignalRClient integration ─────────────────────────────────────────

# Topics available without auth:
FREE_TOPICS = [
    "DriverList",
    "SessionInfo",
    "SessionStatus",
    "TimingData",
    "TimingAppData",
    "TimingStats",
    "LapCount",
    "WeatherData",
    "RaceControlMessages",
    "TrackStatus",
    "TopThree",
    "ExtrapolatedClock",
    "SessionData",
]

_client_thread: threading.Thread | None = None
_stop_event = threading.Event()


def _run_client():
    """Background thread: connect SignalRClient and feed messages into state."""
    if not HAS_FASTF1_CLIENT:
        log.error("fastf1 not installed — run: pip install fastf1")
        return

    while not _stop_event.is_set():
        log.info("Connecting to F1 live timing (no auth)...")
        try:
            # Provide a dummy output file — we don't want file logging,
            # we intercept via the on_message hook instead.
            client = SignalRClient(filename="/dev/null", no_auth=True, timeout=60)

            # Monkey-patch the message handler to route into our state.
            # SignalRClient calls self._on_message(msg) for each raw message.
            original_on_message = client._on_message

            def patched_on_message(msg):
                try:
                    if isinstance(msg, str):
                        msg = json.loads(msg)
                    _dispatch(msg)
                except Exception:
                    pass
                # Still call original so file logging works if configured.
                try:
                    original_on_message(msg)
                except Exception:
                    pass

            client._on_message = patched_on_message

            with _lock:
                _state["connected"] = True

            client.start()
            # client.start() blocks until disconnected

        except Exception as exc:
            log.warning(f"SignalRClient error: {exc}")
        finally:
            with _lock:
                _state["connected"] = False

        if not _stop_event.is_set():
            log.info("Reconnecting in 10s...")
            _stop_event.wait(10)


def _dispatch(msg: Any):
    """Parse SignalR envelope and dispatch to state handler."""
    if isinstance(msg, list):
        for item in msg:
            _dispatch(item)
        return
    if not isinstance(msg, dict):
        return

    # SignalR v2 envelope: {"M": [{"H": "Streaming", "M": "feed", "A": [topic, data, ts]}]}
    invocations = msg.get("M") or []
    if isinstance(invocations, list):
        for inv in invocations:
            if not isinstance(inv, dict):
                continue
            args = inv.get("A") or []
            if isinstance(args, list) and len(args) >= 2:
                topic = args[0]
                raw_data = args[1]
                if isinstance(raw_data, str):
                    try:
                        raw_data = json.loads(raw_data)
                    except Exception:
                        pass
                _handle_message(topic, raw_data)
        return

    # Flat envelope: {"topic": "...", "data": {...}}
    topic = msg.get("topic") or msg.get("Topic")
    data = msg.get("data") or msg.get("Data") or msg.get("R")
    if topic and data is not None:
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception:
                pass
        _handle_message(topic, data)


# ─── Serialisation helpers ────────────────────────────────────────────────────

COMPOUND_MAP = {
    "SOFT": "SOFT", "SUPERSOFT": "SOFT", "ULTRASOFT": "SOFT", "HYPERSOFT": "SOFT",
    "MEDIUM": "MEDIUM",
    "HARD": "HARD",
    "INTERMEDIATE": "INTER", "INTER": "INTER",
    "WET": "WET",
}

TEAM_COLOURS = {
    "mclaren":      "FF8000",
    "mercedes":     "00D2BE",
    "red bull":     "3671C6",
    "ferrari":      "E8002D",
    "aston martin": "229971",
    "alpine":       "0093CC",
    "williams":     "64C4FF",
    "haas":         "B6BABD",
    "kick sauber":  "52E252",
    "sauber":       "52E252",
    "racing bulls": "6692FF",
    "rb":           "6692FF",
    "audi":         "2E5B6F",
}


def _normalise_compound(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.upper().strip()
    for k, v in COMPOUND_MAP.items():
        if k in s:
            return v
    return s


def _team_colour(team_name: str | None) -> str:
    if not team_name:
        return "AAAAAA"
    lower = team_name.lower()
    for key, colour in TEAM_COLOURS.items():
        if key in lower:
            return colour
    return "AAAAAA"


def _format_gap(raw) -> str:
    if raw is None:
        return "LEADER"
    s = str(raw).strip()
    if not s or s in ("0", "0.000"):
        return "LEADER"
    if "LAP" in s.upper():
        import re
        m = re.search(r"\d+", s)
        return f"+{m.group()}L" if m else "+1L"
    if not s.startswith("+"):
        try:
            return f"+{float(s):.3f}"
        except ValueError:
            pass
    return s


def _format_lap_time(raw) -> str | None:
    """Convert '1:22.456' or seconds float to a display string."""
    if not raw:
        return None
    s = str(raw).strip()
    if ":" in s:
        return s
    try:
        secs = float(s)
        minutes = int(secs // 60)
        rem = secs % 60
        return f"{minutes}:{rem:06.3f}"
    except (ValueError, TypeError):
        return s if s else None


def _parse_lap_time_seconds(raw) -> float | None:
    if not raw:
        return None
    s = str(raw).strip()
    try:
        if ":" in s:
            parts = s.split(":")
            return int(parts[0]) * 60 + float(parts[1])
        return float(s)
    except (ValueError, TypeError):
        return None


def _extract_sectors(timing: dict) -> list[dict | None]:
    """Extract sector times from TimingData Sectors dict."""
    sectors_raw = timing.get("Sectors", {}) or {}
    result = []
    for i in range(3):
        key = str(i)
        sector = sectors_raw.get(key, {}) or {}
        val = sector.get("Value") if isinstance(sector, dict) else None
        seg_count = None
        segments = sector.get("Segments", {}) if isinstance(sector, dict) else {}
        if isinstance(segments, dict) and segments:
            seg_count = len(segments)
        result.append({
            "time": _format_lap_time(val) if val else None,
            "value": _parse_lap_time_seconds(val),
            "personal_fastest": sector.get("PersonalFastest", False) if isinstance(sector, dict) else False,
            "overall_fastest": sector.get("OverallFastest", False) if isinstance(sector, dict) else False,
            "segment_count": seg_count,
        } if (val or seg_count) else None)
    return result


def _extract_speeds(timing: dict) -> dict:
    """Extract speed trap values from TimingData Speeds dict."""
    speeds_raw = timing.get("Speeds", {}) or {}
    result = {}
    for trap_key in ("I1", "I2", "FL", "ST"):
        trap = speeds_raw.get(trap_key, {}) or {}
        if isinstance(trap, dict):
            val = trap.get("Value")
            result[trap_key] = {
                "speed": int(val) if val and str(val).isdigit() else None,
                "personal_fastest": trap.get("PersonalFastest", False),
                "overall_fastest": trap.get("OverallFastest", False),
            }
    return result


def _extract_stints(timing: dict) -> list[dict]:
    """Extract stint history from TimingAppData Stints."""
    stints_raw = timing.get("Stints", {}) or {}
    if isinstance(stints_raw, dict):
        stints_list = list(stints_raw.values())
    elif isinstance(stints_raw, list):
        stints_list = stints_raw
    else:
        return []

    result = []
    for stint in stints_list:
        if not isinstance(stint, dict):
            continue
        compound = _normalise_compound(stint.get("Compound"))
        total_laps = stint.get("TotalLaps")
        new_tyre_raw = stint.get("New")
        new_tyre = str(new_tyre_raw).lower() == "true" if new_tyre_raw is not None else None
        result.append({
            "compound": compound,
            "laps": int(total_laps) if total_laps is not None else None,
            "new": new_tyre,
            "tyre_age_at_start": stint.get("StartLaps"),
            "tyre_not_changed": stint.get("TyresNotChanged", False),
        })
    return result


def _build_response() -> dict:
    with _lock:
        state = json.loads(json.dumps(_state))  # deep copy

    drivers_out = []
    timing = state["timing"]
    drivers_info = state["drivers"]

    all_nums = set(drivers_info.keys()) | set(timing.keys())

    lap_times_all = []

    for num in all_nums:
        d = drivers_info.get(num, {})
        t = timing.get(num, {})

        code = d.get("Tla") or d.get("NameAcronym") or str(num)
        name = d.get("FullName") or d.get("BroadcastName") or code
        team = d.get("TeamName") or ""

        # Position
        pos_raw = t.get("Position") or t.get("Line")
        try:
            pos = int(pos_raw) if pos_raw is not None else None
        except (ValueError, TypeError):
            pos = None

        # Gap / interval
        gap_raw = t.get("GapToLeader") or t.get("TimeDiffToFastest")
        interval_raw = t.get("IntervalToPositionAhead", {})
        if isinstance(interval_raw, dict):
            interval_raw = interval_raw.get("Value")

        # Last lap time
        last_lap_obj = t.get("LastLapTime", {})
        last_lap_val = last_lap_obj.get("Value") if isinstance(last_lap_obj, dict) else None
        last_lap_secs = _parse_lap_time_seconds(last_lap_val)
        last_lap_display = _format_lap_time(last_lap_val) if last_lap_val else None
        if last_lap_secs and last_lap_secs > 0:
            lap_times_all.append(last_lap_secs)

        # Best lap
        best_lap_obj = t.get("BestLapTime", {})
        best_lap_val = best_lap_obj.get("Value") if isinstance(best_lap_obj, dict) else None

        # Current lap
        num_laps = t.get("NumberOfLaps")
        try:
            lap_num = int(num_laps) if num_laps is not None else None
        except (ValueError, TypeError):
            lap_num = None

        # Pit
        in_pit = bool(t.get("InPit", False))
        pit_stop_count = t.get("NumberOfPitStops")
        try:
            pit_stops = int(pit_stop_count) if pit_stop_count is not None else 0
        except (ValueError, TypeError):
            pit_stops = 0

        # Sectors
        sectors = _extract_sectors(t)

        # Speeds
        speeds = _extract_speeds(t)

        # Stints + current compound
        stints = _extract_stints(t)
        current_compound = None
        if stints:
            current_compound = stints[-1].get("compound")
        if not current_compound:
            # Fallback: check TimingData for compound hints
            current_compound = _normalise_compound(t.get("Compound"))

        # Tyre age
        tyre_age = None
        if stints and lap_num is not None:
            last_stint = stints[-1]
            stint_laps = last_stint.get("laps")
            if isinstance(stint_laps, int) and stint_laps > 0:
                tyre_age = stint_laps

        # Qualifying status (knockout rounds)
        knock_out = t.get("KnockedOut", False)
        retired = t.get("Retired", False)
        stopped = t.get("Stopped", False)
        status = "RETIRED" if retired else ("STOPPED" if stopped else ("OUT" if knock_out else "OK"))

        drivers_out.append({
            "code": code,
            "name": name,
            "team": team,
            "color": _team_colour(team),
            "position": pos,
            "lap": lap_num,
            "lapTime": last_lap_secs,
            "lapTimeDisplay": last_lap_display,
            "bestLapTime": _parse_lap_time_seconds(best_lap_val),
            "bestLapTimeDisplay": _format_lap_time(best_lap_val),
            "deltaToBest": None,  # computed below
            "gapToLeader": _format_gap(gap_raw),
            "intervalGap": _format_gap(interval_raw) if interval_raw else None,
            "compound": current_compound,
            "sectors": sectors,
            "speeds": speeds,
            "stints": stints,
            "stint": len(stints) if stints else None,
            "tyreAge": tyre_age,
            "pitStops": pit_stops,
            "inPit": in_pit,
            "status": status,
            "driverNumber": num,
        })

    # Sort by position
    drivers_out.sort(key=lambda d: d["position"] if d["position"] is not None else 999)

    # Compute delta to best lap
    best_lap = min(lap_times_all) if lap_times_all else None
    for d in drivers_out:
        lt = d["lapTime"]
        if lt and best_lap and lt > best_lap:
            d["deltaToBest"] = round(lt - best_lap, 3)
        elif lt and best_lap and lt == best_lap:
            d["deltaToBest"] = 0.0

    is_live = state["connected"] and bool(drivers_out)
    laps = state["lap_count"]
    session_name = state["session_name"] or "Live Session"
    weather = state["weather"]
    track_status = state["track_status"]

    # Build weather block
    weather_out = None
    if weather:
        weather_out = {
            "air_temperature": weather.get("AirTemp"),
            "track_temperature": weather.get("TrackTemp"),
            "humidity": weather.get("Humidity"),
            "pressure": weather.get("Pressure"),
            "wind_speed": weather.get("WindSpeed"),
            "wind_direction": weather.get("WindDirection"),
            "rainfall": weather.get("Rainfall"),
        }

    # Build race control block
    race_ctrl_out = []
    for msg in state["race_control"][-20:]:
        race_ctrl_out.append({
            "category": msg.get("Category"),
            "flag": msg.get("Flag"),
            "message": msg.get("Message", ""),
            "lap_number": msg.get("Lap"),
            "driver_number": msg.get("RacingNumber"),
            "timestamp": msg.get("Utc"),
        })

    # Build telemetry intelligence block (same shape as OpenF1 route)
    ti_drivers = []
    for d in drivers_out:
        ti_drivers.append({
            "driver_number": d["driverNumber"],
            "code": d["code"],
            "name": d["name"],
            "team": d["team"],
            "position": d["position"],
            "current_lap": d["lap"],
            "compound": d["compound"],
            "tyre_age_laps": d["tyreAge"],
            "stint_number": d["stint"],
            "pit_stops": d["pitStops"],
            "last_lap_time": d["lapTime"],
            "top_speed": None,  # not available without auth
            "elimination_status": "Retired" if d["status"] == "RETIRED" else ("Stopped" if d["status"] == "STOPPED" else "No elimination indicated"),
            "battery_status": "Unavailable — requires F1TV subscription",
            "sectors": d["sectors"],
            "speeds": d["speeds"],
            "stints": d["stints"],
            "best_lap_time": d["bestLapTime"],
        })

    telemetry_intelligence = {
        "session_name": session_name,
        "session_type": state["session_type"] or "Race",
        "status": "live" if is_live else "no_live",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "weather": weather_out,
        "drivers": ti_drivers,
        "race_control": race_ctrl_out[-8:],
        "eliminations": {
            "drivers": [d["code"] for d in drivers_out if d["status"] in ("RETIRED", "STOPPED")],
            "teams": [],
            "note": "Derived from SignalR Retired/Stopped flags.",
        },
        "battery": {
            "available": False,
            "note": "ERS/battery data requires F1TV subscription (CarData.z topic).",
        },
        "track_status": track_status.get("message") or track_status.get("status") or "Unknown",
        "track_status_flag": track_status.get("status"),
        "session_remaining": state["session_remaining"],
        "lap_count": laps,
        "data_notes": [
            "Source: livetiming.formula1.com via FastF1 SignalRClient (no_auth=True).",
            "Position, gaps, sector times, tyre compounds, pit stops available.",
            "Car telemetry (speed/RPM) and GPS positions require F1TV subscription.",
        ],
    }

    return {
        "status": "live" if is_live else "no_live",
        "session": session_name.lower().replace(" ", "-"),
        "session_name": session_name,
        "session_type": state["session_type"] or "Race",
        "country_name": "",
        "location": "Circuit",
        "circuit_short_name": session_name,
        "timestamp": int(time.time()),
        "drivers": [
            {
                "code": d["code"],
                "name": d["name"],
                "team": d["team"],
                "color": d["color"],
                "position": d["position"],
                "lap": d["lap"],
                "lapTime": d["lapTime"],
                "deltaToBest": d["deltaToBest"],
                "gapToLeader": d["gapToLeader"],
                "intervalGap": d["intervalGap"],
                "compound": d["compound"],
                "sectors": d["sectors"],
                "speeds": d["speeds"],
                "stints": d["stints"],
                "stint": d["stint"],
                "tyreAge": d["tyreAge"],
                "pitStops": d["pitStops"],
                "inPit": d["inPit"],
                "status": d["status"],
                "driverNumber": d["driverNumber"],
            }
            for d in drivers_out
        ],
        "lap_count": laps,
        "weather": weather_out,
        "race_control": race_ctrl_out[-8:],
        "track_status": track_status,
        "session_remaining": state["session_remaining"],
        "connected": state["connected"],
        "telemetry_intelligence": telemetry_intelligence,
        "warnings": [] if is_live else [
            "FastF1 SignalR not connected — no live session active or connecting.",
        ],
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/live")
def get_live():
    return JSONResponse(_build_response())


@app.get("/health")
def health():
    with _lock:
        return {
            "connected": _state["connected"],
            "drivers": len(_state["drivers"]),
            "last_update": _state["last_update"],
            "session": _state["session_name"],
        }


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    if not HAS_FASTF1_CLIENT:
        log.error("fastf1 package not found — install with: pip install fastf1")
        return

    global _client_thread
    _stop_event.clear()
    _client_thread = threading.Thread(target=_run_client, daemon=True, name="f1-signalr")
    _client_thread.start()
    log.info("F1 live timing client started (no auth — free tier)")


@app.on_event("shutdown")
def shutdown():
    _stop_event.set()


if __name__ == "__main__":
    uvicorn.run("f1live:app", host="0.0.0.0", port=8001, reload=False, log_level="info")
