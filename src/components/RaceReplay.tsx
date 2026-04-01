import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Flag,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { fetchReplayDataset, fetchReplaySessions } from '../services/replay';
import type {
  ReplayDataset,
  ReplayDriver,
  ReplayLap,
  ReplayPositionSample,
  ReplayRaceControlMessage,
  ReplaySessionSummary,
  ReplayTrackPoint,
} from '../types/f1';

interface ReplayMarker {
  driver: ReplayDriver;
  position: number | null;
  lapNumber: number;
  lapFraction: number;
  globalProgress: number;
  x: number;
  y: number;
}

const TRACK_WIDTH = 860;
const TRACK_HEIGHT = 560;
const TRACK_PADDING = 56;
const REPLAY_SPEEDS = [0.5, 1, 2, 4];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatReplayClock(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getFlagTone(flag: string | null) {
  switch (flag) {
    case 'YELLOW':
      return '#f4b400';
    case 'RED':
      return '#ff4d4f';
    case 'GREEN':
    case 'CLEAR':
      return '#00d2be';
    default:
      return 'var(--accent-blue)';
  }
}

function groupByDriver<T extends { driver_number: number }>(rows: T[]) {
  const grouped = new Map<number, T[]>();

  rows.forEach((row) => {
    const driverRows = grouped.get(row.driver_number);

    if (driverRows) {
      driverRows.push(row);
      return;
    }

    grouped.set(row.driver_number, [row]);
  });

  return grouped;
}

function findLatestIndexByTime<T>(rows: T[], targetTime: number, getTimestamp: (row: T) => number) {
  let low = 0;
  let high = rows.length - 1;
  let answer = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sampleTime = getTimestamp(rows[mid]);

    if (sampleTime <= targetTime) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return answer;
}

function pointAtFraction(points: ReplayTrackPoint[], fraction: number) {
  if (points.length === 0) {
    return { x: TRACK_WIDTH / 2, y: TRACK_HEIGHT / 2 };
  }

  const boundedFraction = clamp(fraction, 0, 0.9999);
  const scaledIndex = boundedFraction * (points.length - 1);
  const leftIndex = Math.floor(scaledIndex);
  const rightIndex = Math.min(leftIndex + 1, points.length - 1);
  const interpolation = scaledIndex - leftIndex;
  const leftPoint = points[leftIndex];
  const rightPoint = points[rightIndex];

  return {
    x: leftPoint.x + (rightPoint.x - leftPoint.x) * interpolation,
    y: leftPoint.y + (rightPoint.y - leftPoint.y) * interpolation,
  };
}

function normalizeTrack(points: ReplayTrackPoint[]) {
  if (points.length === 0) {
    return [];
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (TRACK_WIDTH - TRACK_PADDING * 2) / width,
    (TRACK_HEIGHT - TRACK_PADDING * 2) / height,
  );

  return points.map((point) => ({
    x: TRACK_PADDING + (point.x - minX) * scale,
    y: TRACK_HEIGHT - TRACK_PADDING - (point.y - minY) * scale,
  }));
}

function buildTrackPath(points: ReplayTrackPoint[]) {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function getLapState(laps: ReplayLap[], replayTime: number) {
  if (laps.length === 0) {
    return { lapNumber: 0, lapFraction: 0, globalProgress: 0 };
  }

  const currentLapIndex = findLatestIndexByTime(laps, replayTime, (lap) => Date.parse(lap.date_start));

  if (currentLapIndex === -1) {
    return { lapNumber: 0, lapFraction: 0, globalProgress: 0 };
  }

  const currentLap = laps[currentLapIndex];
  const nextLap = laps[currentLapIndex + 1];
  const lapStart = Date.parse(currentLap.date_start);
  const lapEnd = nextLap
    ? Date.parse(nextLap.date_start)
    : currentLap.lap_duration
      ? lapStart + currentLap.lap_duration * 1000
      : lapStart + 90_000;
  const lapFraction = clamp(
    (replayTime - lapStart) / Math.max(lapEnd - lapStart, 1000),
    0,
    1,
  );

  return {
    lapNumber: currentLap.lap_number,
    lapFraction,
    globalProgress: currentLap.lap_number - 1 + lapFraction,
  };
}

function getPositionAtTime(positions: ReplayPositionSample[], replayTime: number) {
  const currentIndex = findLatestIndexByTime(
    positions,
    replayTime,
    (positionSample) => Date.parse(positionSample.date),
  );

  return currentIndex === -1 ? null : positions[currentIndex].position;
}

function getLatestRaceControlMessage(messages: ReplayRaceControlMessage[], replayTime: number) {
  const currentIndex = findLatestIndexByTime(
    messages,
    replayTime,
    (message) => Date.parse(message.date),
  );

  return currentIndex === -1 ? null : messages[currentIndex];
}

function buildReplayMarkers(
  dataset: ReplayDataset,
  normalizedTrack: ReplayTrackPoint[],
  replayTime: number,
) {
  const lapsByDriver = groupByDriver(dataset.laps);
  const positionsByDriver = groupByDriver(dataset.positions);
  const markers: ReplayMarker[] = [];

  dataset.drivers.forEach((driver) => {
    const lapRows = lapsByDriver.get(driver.driver_number) ?? [];
    const positionRows = positionsByDriver.get(driver.driver_number) ?? [];
    const lapState = getLapState(lapRows, replayTime);
    const markerPoint = pointAtFraction(normalizedTrack, lapState.lapFraction);

    markers.push({
      driver,
      position: getPositionAtTime(positionRows, replayTime),
      lapNumber: lapState.lapNumber,
      lapFraction: lapState.lapFraction,
      globalProgress: lapState.globalProgress,
      x: markerPoint.x,
      y: markerPoint.y,
    });
  });

  return markers.sort((left, right) => {
    if (left.position !== null && right.position !== null && left.position !== right.position) {
      return left.position - right.position;
    }

    return right.globalProgress - left.globalProgress;
  });
}

function pickDefaultSession(sessions: ReplaySessionSummary[]) {
  const now = Date.now();

  return sessions.find((session) => Date.parse(session.date_end) <= now) ?? sessions[0] ?? null;
}

interface RaceReplayProps {
  isEmbedded?: boolean;
}

export default function RaceReplay({ isEmbedded = false }: RaceReplayProps) {
  const currentYear = new Date().getFullYear();
  const replayYears = [currentYear, currentYear - 1, currentYear - 2];
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(replayYears[0]);
  const [sessions, setSessions] = useState<ReplaySessionSummary[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<number | null>(null);
  const [dataset, setDataset] = useState<ReplayDataset | null>(null);
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number | null>(null);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [loadingReplay, setLoadingReplay] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading replay sessions...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [replayMs, setReplayMs] = useState<number>(0);

  // ... (keeping all the useEffects and logic from the original file unchanged for now)
  // I will only change the render logic below to handle isEmbedded

  useEffect(() => {
    let ignore = false;

    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setErrorMsg(null);
        const replaySessions = await fetchReplaySessions(selectedYear);

        if (ignore) {
          return;
        }

        setSessions(replaySessions);
        setSelectedSessionKey(pickDefaultSession(replaySessions)?.session_key ?? null);
      } catch (error: unknown) {
        if (!ignore) {
          setErrorMsg(
            error instanceof Error ? error.message : 'Unable to load replay sessions from OpenF1.',
          );
          setSessions([]);
          setSelectedSessionKey(null);
        }
      } finally {
        if (!ignore) {
          setLoadingSessions(false);
        }
      }
    }

    loadSessions();

    return () => {
      ignore = true;
    };
  }, [selectedYear]);

  useEffect(() => {
    const selectedSession = sessions.find((session) => session.session_key === selectedSessionKey);

    if (!selectedSession) {
      setDataset(null);
      setReplayMs(0);
      setIsPlaying(false);
      return;
    }

    const sessionToLoad = selectedSession;
    let ignore = false;

    async function loadDataset() {
      try {
        setLoadingReplay(true);
        setErrorMsg(null);
        setLoadingMessage('Preparing race replay...');
        const replayDataset = await fetchReplayDataset(sessionToLoad, (message) => {
          if (!ignore) {
            setLoadingMessage(message);
          }
        });

        if (ignore) {
          return;
        }

        setDataset(replayDataset);
        setReplayMs(0);
        setIsPlaying(false);
        setSelectedDriverNumber(replayDataset.track.source_driver_number);
      } catch (error: unknown) {
        if (!ignore) {
          setErrorMsg(
            error instanceof Error ? error.message : 'Unable to build the browser replay.',
          );
          setDataset(null);
        }
      } finally {
        if (!ignore) {
          setLoadingReplay(false);
        }
      }
    }

    loadDataset();

    return () => {
      ignore = true;
    };
  }, [selectedSessionKey, sessions]);

  const replayDurationMs = dataset
    ? Math.max(Date.parse(dataset.end_time) - Date.parse(dataset.start_time), 1000)
    : 1000;
  const normalizedTrack = dataset ? normalizeTrack(dataset.track.points) : [];
  const trackPath = buildTrackPath(normalizedTrack);
  const currentReplayTime = dataset ? Date.parse(dataset.start_time) + replayMs : 0;
  const markers = dataset ? buildReplayMarkers(dataset, normalizedTrack, currentReplayTime) : [];
  const currentRaceControl = dataset
    ? getLatestRaceControlMessage(dataset.race_control, currentReplayTime)
    : null;
  const currentLap = markers.reduce((maxLap, marker) => Math.max(maxLap, marker.lapNumber), 0);
  const focusedDriver =
    markers.find((marker) => marker.driver.driver_number === selectedDriverNumber) ?? markers[0];

  useEffect(() => {
    if (!dataset || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      lastFrameRef.current = null;
      return;
    }

    const tick = (frameTime: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = frameTime;
      }

      const elapsed = frameTime - lastFrameRef.current;
      lastFrameRef.current = frameTime;

      setReplayMs((currentValue) => {
        const nextValue = Math.min(currentValue + elapsed * playbackSpeed, replayDurationMs);

        if (nextValue >= replayDurationMs) {
          setIsPlaying(false);
          return replayDurationMs;
        }

        return nextValue;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      lastFrameRef.current = null;
    };
  }, [dataset, isPlaying, playbackSpeed, replayDurationMs]);

  const replayHeader = dataset
    ? `${dataset.session.country_name} ${dataset.session.year} Replay`
    : 'Race Replay';

  if (isEmbedded) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="replay-stage" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-header" style={{ justifyContent: 'space-between', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Flag size={14} color={getFlagTone(currentRaceControl?.flag ?? null)} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                {dataset ? `${dataset.session.circuit_short_name} • LAP ${currentLap}` : 'SYSTEM IDLE'}
              </span>
            </div>
            {dataset && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {REPLAY_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    className={`speed-chip ${playbackSpeed === speed ? 'active' : ''}`}
                    onClick={() => setPlaybackSpeed(speed)}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.6rem' }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="replay-canvas" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {!dataset && !loadingReplay && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                NO REPLAY DATA SELECTED
              </div>
            )}
            {dataset && (
              <svg
                viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
                style={{ width: '100%', height: '100%' }}
              >
                <defs>
                   <linearGradient id="trackGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="rgba(21, 209, 204, 0.15)" />
                     <stop offset="50%" stopColor="rgba(21, 209, 204, 0.4)" />
                     <stop offset="100%" stopColor="rgba(21, 209, 204, 0.15)" />
                   </linearGradient>
                </defs>
                <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="20" />
                <path d={trackPath} fill="none" stroke="url(#trackGlow)" strokeWidth="4" strokeLinecap="round" />
                {markers.map((marker) => (
                  <g key={marker.driver.driver_number}>
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={selectedDriverNumber === marker.driver.driver_number ? 10 : 7}
                      fill={`#${marker.driver.team_colour}`}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="2"
                    />
                    <text
                      x={marker.x}
                      y={marker.y - 14}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      style={{ fontSize: 9, fontWeight: 700 }}
                    >
                      {marker.driver.name_acronym}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          {dataset && (
            <div className="replay-controls" style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  className="replay-button"
                  onClick={() => setIsPlaying((v) => !v)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div style={{ flex: 1 }} className="replay-progress">
                  <input
                    type="range"
                    min={0}
                    max={replayDurationMs}
                    value={replayMs}
                    onChange={(e) => { setIsPlaying(false); setReplayMs(Number(e.target.value)); }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', width: '40px' }}>
                  {formatReplayClock(replayMs)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original non-embedded layout continues...
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fade-in 0.35s ease-out' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'end',
          }}
        >
          <label className="replay-field">
            <span className="replay-label">Season</span>
            <select
              className="race-selector"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {replayYears.map((year) => (
                <option key={year} value={year}>
                  {year} Season
                </option>
              ))}
            </select>
          </label>

          <label className="replay-field">
            <span className="replay-label">Race</span>
            <select
              className="race-selector"
              value={selectedSessionKey ?? ''}
              onChange={(event) => setSelectedSessionKey(Number(event.target.value))}
              disabled={loadingSessions || sessions.length === 0}
            >
              {sessions.map((session) => (
                <option key={session.session_key} value={session.session_key}>
                  {session.country_name} • {new Date(session.date_start).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>

          <div className="replay-metric">
            <span className="replay-label">Playback</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {REPLAY_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={`speed-chip ${playbackSpeed === speed ? 'active' : ''}`}
                  onClick={() => setPlaybackSpeed(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="replay-metric">
            <span className="replay-label">Session</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{replayHeader}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Browser-native replay using OpenF1 timing and position data
              </span>
            </div>
          </div>
        </div>
      </div>

      {loadingReplay ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <LoaderCircle size={36} className="spin-icon" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Building Replay</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{loadingMessage}</p>
        </div>
      ) : errorMsg ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--accent-f1)' }}>
          <AlertCircle size={44} color="var(--accent-f1)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ marginBottom: '0.75rem' }}>Replay Unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto' }}>{errorMsg}</p>
        </div>
      ) : dataset ? (
        <div className="replay-layout">
          <div className="glass-panel replay-stage">
            <div className="panel-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="panel-title" style={{ marginBottom: '0.35rem' }}>
                  Track Replay
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {dataset.session.circuit_short_name} • {dataset.session.location}, {dataset.session.country_name}
                </p>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  gap: '0.55rem',
                  alignItems: 'center',
                  borderRadius: '999px',
                  padding: '0.5rem 0.85rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <Flag size={14} color={getFlagTone(currentRaceControl?.flag ?? null)} />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}>
                  LAP {currentLap || 0} / {dataset.total_laps || '--'}
                </span>
              </div>
            </div>

            <div className="replay-canvas">
              <svg
                viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
                style={{ width: '100%', height: '100%' }}
                role="img"
                aria-label="F1 race replay map"
              >
                <defs>
                  <linearGradient id="trackGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                  </linearGradient>
                </defs>

                <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="26" />
                <path d={trackPath} fill="none" stroke="url(#trackGlow)" strokeWidth="8" strokeLinecap="round" />

                {markers.map((marker) => (
                  <g key={marker.driver.driver_number}>
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={selectedDriverNumber === marker.driver.driver_number ? 13 : 9}
                      fill={`#${marker.driver.team_colour}`}
                      stroke="rgba(10, 10, 12, 0.95)"
                      strokeWidth={selectedDriverNumber === marker.driver.driver_number ? 4 : 2}
                    />
                    <text
                      x={marker.x}
                      y={marker.y - 18}
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}
                    >
                      {marker.driver.name_acronym}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="replay-controls">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="replay-button"
                  onClick={() => setIsPlaying((currentValue) => !currentValue)}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  type="button"
                  className="replay-button replay-button-secondary"
                  onClick={() => {
                    setIsPlaying(false);
                    setReplayMs(0);
                  }}
                >
                  <RotateCcw size={16} />
                  Restart
                </button>
              </div>

              <div className="replay-progress">
                <input
                  type="range"
                  min={0}
                  max={replayDurationMs}
                  step={250}
                  value={replayMs}
                  onChange={(event) => {
                    setIsPlaying(false);
                    setReplayMs(Number(event.target.value));
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span>{formatReplayClock(replayMs)}</span>
                  <span>{formatReplayClock(replayDurationMs)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <Radio size={18} color={getFlagTone(currentRaceControl?.flag ?? null)} />
                <h2 className="panel-title">Race Control</h2>
              </div>
              {currentRaceControl ? (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${getFlagTone(currentRaceControl.flag)}`,
                    borderRadius: '14px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.55rem' }}>
                    <span style={{ color: getFlagTone(currentRaceControl.flag), fontWeight: 800, letterSpacing: '0.08em' }}>
                      {currentRaceControl.flag ?? currentRaceControl.category}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(currentRaceControl.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>{currentRaceControl.message}</p>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No race control message has been reached at the current replay point.</p>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <Gauge size={18} color="var(--accent-blue)" />
                <h2 className="panel-title">Focused Driver</h2>
              </div>
              {focusedDriver ? (
                <div className="driver-focus-card">
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '16px',
                      background: `#${focusedDriver.driver.team_colour}`,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 900,
                      color: '#0a0a0c',
                    }}
                  >
                    {focusedDriver.driver.name_acronym}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{focusedDriver.driver.full_name}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{focusedDriver.driver.team_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      P{focusedDriver.position ?? '--'} • Lap {focusedDriver.lapNumber || '--'} • {(focusedDriver.lapFraction * 100).toFixed(0)}% through lap
                    </span>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No driver focus is available for this replay.</p>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.4rem', minHeight: 0 }}>
              <h2 className="panel-title" style={{ marginBottom: '1rem' }}>
                Replay Leaderboard
              </h2>

              <div className="replay-table">
                {markers.map((marker) => (
                  <button
                    key={marker.driver.driver_number}
                    type="button"
                    className={`replay-row ${selectedDriverNumber === marker.driver.driver_number ? 'selected' : ''}`}
                    onClick={() => setSelectedDriverNumber(marker.driver.driver_number)}
                  >
                    <span style={{ width: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {marker.position ?? '--'}
                    </span>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '999px',
                        background: `#${marker.driver.team_colour}`,
                        boxShadow: `0 0 12px #${marker.driver.team_colour}66`,
                      }}
                    />
                    <span style={{ flex: 1, textAlign: 'left' }}>{marker.driver.full_name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      L{marker.lapNumber || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Select a completed race to load the replay.</p>
        </div>
      )}
    </div>
  );
}
