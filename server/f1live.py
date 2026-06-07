"""
FastF1 live timing bridge server.

Connects to the F1TV SignalR stream using FastF1 and serves live timing
data in the same JSON format as /api/telemetry so the dashboard works
without any frontend changes.

Usage:
    python3 server/f1live.py

Requires:
    - fastf1 >= 3.8 (pip install fastf1)
    - fastapi + uvicorn (pip install fastapi uvicorn)
    - F1TV auth token saved via:
        python3 -c "from fastf1.internals.f1auth import _run_auth_server; _run_auth_server()"

Endpoint:  GET http://localhost:8001/live
The Next.js app proxies /api/telemetry to this when FASTF1_LIVE=1.
"""

import json
import logging
import ssl
import threading
import time
from collections import defaultdict
from datetime import datetime
from typing import Any

import certifi
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastf1.internals.f1auth import get_auth_token
from signalrcore.hub_connection_builder import HubConnectionBuilder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("f1live")

app = FastAPI(title="F1 Live Timing Bridge")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])

# ─── State ────────────────────────────────────────────────────────────────────

_lock = threading.Lock()
_state: dict[str, Any] = {
    "connected": False,
    "session_name": None,
    "session_type": None,
    "session_status": None,
    "drivers": {},        # driver_number -> driver info
    "timing": {},         # driver_number -> latest timing
    "lap_count": {"current": None, "total": None},
    "weather": None,
    "race_control": [],
    "last_update": 0,
}

# ─── SignalR message handlers ─────────────────────────────────────────────────

TOPICS = [
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
]


def _deep_merge(base: dict, update: dict) -> dict:
    for key, val in update.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            _deep_merge(base[key], val)
        else:
            base[key] = val
    return base


def _handle_message(raw: list | dict):
    """Parse a SignalR feed message and update shared state."""
    try:
        if isinstance(raw, list):
            for item in raw:
                _handle_message(item)
            return

        if not isinstance(raw, dict):
            return

        topic = raw.get("topic") or raw.get("Topic")
        data = raw.get("data") or raw.get("Data") or raw.get("R")

        if not topic or data is None:
            # Try parsing as [topic, json_str, timestamp] line format
            return

        with _lock:
            _state["last_update"] = time.time()

            if topic == "SessionInfo":
                if isinstance(data, dict):
                    meeting = data.get("Meeting", {})
                    _state["session_name"] = (
                        meeting.get("OfficialName")
                        or meeting.get("Name")
                        or data.get("Name")
                    )
                    _state["session_type"] = data.get("Type")

            elif topic == "SessionStatus":
                if isinstance(data, dict):
                    _state["session_status"] = data.get("Status")

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
                    lines = data.get("Lines", {})
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
                    lines = data.get("Lines", {})
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

            elif topic == "RaceControlMessages":
                if isinstance(data, dict):
                    msgs = data.get("Messages", {})
                    if isinstance(msgs, dict):
                        for msg in msgs.values():
                            if isinstance(msg, dict):
                                _state["race_control"].append(msg)
                                _state["race_control"] = _state["race_control"][-20:]

    except Exception:
        log.exception("Error handling message")


def _on_feed(raw):
    try:
        if isinstance(raw, str):
            raw = json.loads(raw)
        _handle_message(raw)
    except Exception:
        pass


# ─── Connection management ────────────────────────────────────────────────────

_connection = None
_connection_thread = None


def _connect():
    global _connection
    log.info("Connecting to F1 live timing SignalR...")

    try:
        token = get_auth_token()
        if not token:
            log.error("No F1TV auth token. Run the auth flow first.")
            return
    except Exception as e:
        log.error(f"Auth error: {e}")
        return

    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    options = {
        "ssl_context": ssl_ctx,
        "access_token_factory": lambda: token,
    }

    url = "https://livetiming.formula1.com/signalr"
    conn = HubConnectionBuilder() \
        .with_url(url, options=options) \
        .configure_logging(logging.WARNING) \
        .build()

    def on_open():
        with _lock:
            _state["connected"] = True
        log.info("Connected to F1 live timing")
        # Subscribe to topics
        conn.send("Subscribe", [TOPICS])

    def on_close():
        with _lock:
            _state["connected"] = False
        log.warning("Disconnected from F1 live timing — will retry in 10s")
        time.sleep(10)
        _connect()

    conn.on_open(on_open)
    conn.on_close(on_close)
    conn.on("feed", _on_feed)

    _connection = conn

    try:
        conn.start()
        # Block thread
        while _state["connected"]:
            time.sleep(1)
    except Exception as e:
        log.error(f"Connection error: {e}")
        with _lock:
            _state["connected"] = False
        time.sleep(10)
        _connect()


def start_connection():
    global _connection_thread
    _connection_thread = threading.Thread(target=_connect, daemon=True)
    _connection_thread.start()


# ─── Data serialisation helpers ───────────────────────────────────────────────

COMPOUND_MAP = {
    "SOFT": "SOFT", "SUPERSOFT": "SOFT", "ULTRASOFT": "SOFT",
    "MEDIUM": "MEDIUM",
    "HARD": "HARD",
    "INTERMEDIATE": "INTER", "INTER": "INTER",
    "WET": "WET",
}


def _normalise_compound(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.upper().strip()
    for k, v in COMPOUND_MAP.items():
        if k in s:
            return v
    return s


def _format_gap(raw) -> str:
    if raw is None:
        return "LEADER"
    if isinstance(raw, (int, float)):
        return "LEADER" if raw == 0 else f"+{abs(raw):.3f}"
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


def _team_colour(team_name: str | None) -> str:
    colours = {
        "McLaren": "FF8000", "Mercedes": "00D2BE", "Red Bull": "3671C6",
        "Ferrari": "E8002D", "Aston Martin": "229971", "Alpine": "0093CC",
        "Williams": "64C4FF", "Haas": "B6BABD", "Kick Sauber": "52E252",
        "Racing Bulls": "6692FF", "Audi": "2E5B6F",
    }
    if not team_name:
        return "AAAAAA"
    for k, v in colours.items():
        if k.lower() in team_name.lower():
            return v
    return "AAAAAA"


def _build_response() -> dict:
    with _lock:
        state = json.loads(json.dumps(_state))  # deep copy

    drivers_out = []
    timing = state["timing"]
    drivers = state["drivers"]

    # Merge driver info + timing
    all_nums = set(drivers.keys()) | set(timing.keys())

    for num in all_nums:
        d = drivers.get(num, {})
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
        last_lap = None
        best_lap = t.get("BestLapTime", {})
        last_lap_obj = t.get("LastLapTime", {})
        if isinstance(last_lap_obj, dict):
            last_lap_val = last_lap_obj.get("Value")
            if last_lap_val:
                # Convert "1:22.456" to seconds float
                try:
                    if ":" in str(last_lap_val):
                        parts = str(last_lap_val).split(":")
                        last_lap = int(parts[0]) * 60 + float(parts[1])
                    else:
                        last_lap = float(last_lap_val)
                except (ValueError, TypeError):
                    pass

        # Current lap
        lap_num = None
        num_laps = t.get("NumberOfLaps")
        try:
            lap_num = int(num_laps) if num_laps is not None else None
        except (ValueError, TypeError):
            pass

        # Tyre compound
        stints = t.get("Stints", {})
        compound = None
        if isinstance(stints, dict) and stints:
            # Get last stint
            try:
                last_stint = stints[max(stints.keys(), key=lambda k: int(k) if str(k).isdigit() else 0)]
                if isinstance(last_stint, dict):
                    compound = _normalise_compound(last_stint.get("Compound"))
            except Exception:
                pass

        drivers_out.append({
            "code": code,
            "name": name,
            "team": team,
            "color": _team_colour(team),
            "position": pos,
            "lap": lap_num,
            "lapTime": last_lap,
            "deltaToBest": None,
            "gapToLeader": _format_gap(gap_raw),
            "intervalGap": _format_gap(interval_raw) if interval_raw else None,
            "compound": compound,
            "sectors": [None, None, None],
            "stint": None,
        })

    # Sort by position
    drivers_out.sort(key=lambda d: d["position"] if d["position"] is not None else 999)

    is_live = state["connected"] and bool(drivers_out)
    laps = state["lap_count"]
    session_name = state["session_name"] or "Live Session"

    return {
        "status": "live" if is_live else "no_live",
        "session": session_name.lower().replace(" ", "-"),
        "session_name": session_name,
        "session_type": state["session_type"] or "Race",
        "country_name": "",
        "location": "Circuit",
        "circuit_short_name": session_name,
        "timestamp": int(time.time()),
        "drivers": drivers_out,
        "lap_count": laps,
        "weather": state["weather"],
        "race_control": state["race_control"][-8:],
        "connected": state["connected"],
        "warnings": [] if is_live else ["FastF1 live timing not connected"],
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/live")
def get_live():
    return JSONResponse(_build_response())


@app.get("/health")
def health():
    with _lock:
        return {"connected": _state["connected"], "drivers": len(_state["drivers"])}


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    start_connection()


if __name__ == "__main__":
    uvicorn.run("f1live:app", host="0.0.0.0", port=8001, reload=False, log_level="info")
