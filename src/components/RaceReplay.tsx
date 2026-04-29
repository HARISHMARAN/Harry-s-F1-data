import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Flag,
  Gauge,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { fetchDriverReplayTelemetry, fetchReplayDataset, fetchReplaySessions } from '../services/replay';
import { buildTrackPath, getTrackPointsForCircuit, normalizeTrack } from '../services/trackLayout';
import RaceIntelligencePanel from './RaceIntelligencePanel';
import type {
  ReplayDataset,
  ReplayDrsZone,
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
  compound: string | null;
  drsUsed: boolean | null;
  drsActiveNow: boolean | null;
  sectorPercent: number;
  lapDuration: number | null;
  lapDateStart: string | null;
  sectorTimes: [number | null, number | null, number | null];
}

const TRACK_WIDTH = 860;
const TRACK_HEIGHT = 560;
const REPLAY_SPEEDS = [0.5, 1, 2, 4];
const START_SEQUENCE_MS = 5000;
const REPLAY_ROW_HEIGHT = 74;
const REPLAY_TABLE_VIEWPORT_ROWS = 7;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatReplayClock(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatLapDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return '--.--';
  }

  const totalMilliseconds = Math.max(Math.round(seconds * 1000), 0);
  const minutes = Math.floor(totalMilliseconds / 60000);
  const remaining = totalMilliseconds - minutes * 60000;
  const secs = Math.floor(remaining / 1000);
  const millis = remaining % 1000;

  return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function isSafetyCarMessage(message: ReplayRaceControlMessage | null) {
  if (!message) return false;
  const text = `${message.flag ?? ''} ${message.category ?? ''} ${message.message ?? ''}`.toUpperCase();
  return text.includes('SAFETY CAR') || text.includes('VSC') || text.includes('VIRTUAL SAFETY CAR') || text.includes('SC DEPLOYED');
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

function getTyreTone(compound: string | null) {
  switch ((compound ?? '').toUpperCase()) {
    case 'SOFT':
      return '#ea3323';
    case 'MEDIUM':
      return '#f4b400';
    case 'HARD':
      return '#9ca3af';
    case 'INTERMEDIATE':
      return '#00d2be';
    case 'WET':
      return '#1d4ed8';
    default:
      return '#6b7280';
  }
}

function getTyreLabel(compound: string | null) {
  const label = (compound ?? 'UNKNOWN').toUpperCase();
  if (label === 'INTERMEDIATE') return 'I';
  if (label === 'WET') return 'W';
  if (label === 'SOFT') return 'S';
  if (label === 'MEDIUM') return 'M';
  if (label === 'HARD') return 'H';
  return label.slice(0, 1);
}

function TyreBadge({ compound }: { compound: string | null }) {
  const tone = getTyreTone(compound);
  return (
    <span
      style={{
        minWidth: 32,
        height: 22,
        padding: '0 0.45rem',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: `${tone}22`,
        border: `1px solid ${tone}66`,
        color: tone,
        fontSize: '0.66rem',
        fontWeight: 900,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '999px',
          background: tone,
          boxShadow: `0 0 10px ${tone}99`,
          flex: '0 0 auto',
        }}
      />
      {getTyreLabel(compound)}
    </span>
  );
}

function DrsLight({ active }: { active: boolean | null }) {
  const isOn = active === true;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0.2rem 0.45rem',
        borderRadius: 999,
        border: '1px solid var(--border-light)',
        background: isOn ? 'rgba(0, 210, 190, 0.16)' : 'rgba(255,255,255,0.03)',
        color: isOn ? '#00d2be' : 'var(--text-muted)',
        fontSize: '0.65rem',
        fontWeight: 900,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '999px',
          background: isOn ? '#00d2be' : '#4b5563',
          boxShadow: isOn ? '0 0 10px rgba(0, 210, 190, 0.95)' : 'none',
        }}
      />
      DRS
    </span>
  );
}

function SectorBars({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  const activeSector = clamped < 0.33 ? 1 : clamped < 0.66 ? 2 : 3;

  return (
    <div style={{ display: 'grid', gap: '0.25rem', minWidth: 132 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem' }}>
        {[1, 2, 3].map((sector) => (
          <div
            key={sector}
            style={{
              height: 6,
              borderRadius: 999,
              background:
                sector < activeSector
                  ? 'rgba(0,210,190,0.78)'
                  : sector === activeSector
                    ? 'linear-gradient(90deg, rgba(21,209,204,0.18), rgba(0,240,255,0.85))'
                    : 'rgba(255,255,255,0.08)',
              boxShadow: sector === activeSector ? '0 0 12px rgba(0,240,255,0.55)' : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span>S1</span>
        <span>S2</span>
        <span>S3</span>
      </div>
    </div>
  );
}

function SectorIcon({
  index,
  value,
  best,
}: {
  index: 1 | 2 | 3;
  value: number | null;
  best: boolean;
}) {
  return (
    <span
      title={value !== null ? `Sector ${index}: ${formatLapDuration(value)}` : `Sector ${index}: no data`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '999px',
        border: `1px solid ${best ? '#b56dff' : 'rgba(255,255,255,0.14)'}`,
        background: best ? 'rgba(181, 109, 255, 0.18)' : 'rgba(255,255,255,0.04)',
        color: best ? '#d8b5ff' : 'var(--text-muted)',
        boxShadow: best ? '0 0 14px rgba(181, 109, 255, 0.75)' : 'none',
        fontSize: '0.64rem',
        fontWeight: 900,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      S{index}
    </span>
  );
}

function DrsZoneRail({
  zones,
  currentFraction,
}: {
  zones: ReplayDrsZone[];
  currentFraction: number;
}) {
  if (!zones.length) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '120px',
          right: '14px',
          width: '92px',
          padding: '0.55rem',
          borderRadius: '16px',
          background: 'rgba(5, 10, 8, 0.72)',
          border: '1px solid rgba(0, 210, 190, 0.14)',
          color: 'var(--text-muted)',
          fontSize: '0.62rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        DRS data
        <br />
        unavailable
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '120px',
        right: '14px',
        width: '92px',
        padding: '0.55rem 0.45rem',
        borderRadius: '16px',
        background: 'rgba(5, 10, 8, 0.72)',
        border: '1px solid rgba(0, 210, 190, 0.18)',
        boxShadow: '0 0 24px rgba(0, 210, 190, 0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          DRS
        </span>
        <span style={{ color: '#00d2be', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ZONES
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: '210px',
          borderRadius: '999px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 44%',
            background: 'linear-gradient(180deg, rgba(0, 210, 190, 0.08), rgba(0, 210, 190, 0.02))',
          }}
        />
        {zones.map((zone) => {
          const start = Math.max(0, Math.min(1, zone.start_fraction));
          const end = Math.max(start, Math.min(1, zone.end_fraction));
          const top = `${(1 - end) * 100}%`;
          const height = `${Math.max((end - start) * 100, 2.2)}%`;
          const isActive = currentFraction >= start && currentFraction <= end;

          return (
            <div
              key={`${zone.start_fraction}-${zone.end_fraction}-${zone.sample_count}`}
              style={{
                position: 'absolute',
                left: '12px',
                right: '12px',
                top,
                height,
                borderRadius: '999px',
                background: isActive
                  ? 'linear-gradient(180deg, rgba(0, 210, 190, 0.95), rgba(21, 209, 204, 0.55))'
                  : 'linear-gradient(180deg, rgba(0, 210, 190, 0.75), rgba(0, 210, 190, 0.18))',
                boxShadow: isActive ? '0 0 14px rgba(0, 240, 255, 0.55)' : '0 0 8px rgba(0, 210, 190, 0.16)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 6px)',
                  top: '-2px',
                  color: isActive ? '#00f0ff' : 'rgba(200, 200, 207, 0.75)',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {zone.label ?? 'DRS'}
              </span>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${(1 - currentFraction) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '999px',
            background: '#00f0ff',
            boxShadow: '0 0 14px rgba(0, 240, 255, 0.9)',
          }}
        />
      </div>
    </div>
  );
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

function resolveTrackPoints(dataset: ReplayDataset | null): ReplayTrackPoint[] {
  if (!dataset) return [];
  if (dataset.track?.points?.length) return dataset.track.points;
  const seed = `${dataset.session?.circuit_short_name ?? dataset.session?.location ?? 'circuit'}-${dataset.session?.year ?? ''}`;
  return getTrackPointsForCircuit(seed);
}

type PreparedLapRow = {
  row: ReplayLap;
  startMs: number;
  endMs: number;
};

type ReplayDriverIndex = {
  lapRows: PreparedLapRow[];
  lapStartMs: number[];
  positionRows: ReplayPositionSample[];
  positionMs: number[];
};

function parseIsoMs(value: string | null | undefined) {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

function latestIndexFromMs(times: number[], replayTime: number) {
  let low = 0;
  let high = times.length - 1;
  let answer = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sampleTime = times[mid];
    if (sampleTime <= replayTime) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return answer;
}

function buildReplayIndex(dataset: ReplayDataset) {
  const lapsByDriver = groupByDriver(dataset.laps);
  const positionsByDriver = groupByDriver(dataset.positions);
  const index = new Map<number, ReplayDriverIndex>();

  dataset.drivers.forEach((driver) => {
    const rawLaps = (lapsByDriver.get(driver.driver_number) ?? [])
      .map((row) => {
        const startMs = parseIsoMs(row.date_start);
        return startMs === null ? null : { row, startMs };
      })
      .filter((entry): entry is { row: ReplayLap; startMs: number } => Boolean(entry))
      .sort((left, right) => left.startMs - right.startMs);

    const lapRows = rawLaps.map((entry, idx) => {
      const startMs = entry.startMs;
      const nextStart = rawLaps[idx + 1]?.startMs ?? null;
      const endMs = nextStart ?? (entry.row.lap_duration ? startMs + entry.row.lap_duration * 1000 : startMs + 90_000);
      return { row: entry.row, startMs, endMs };
    });

    const positionRows = (positionsByDriver.get(driver.driver_number) ?? [])
      .map((row) => {
        const positionMs = parseIsoMs(row.date);
        return positionMs === null ? null : { row, positionMs };
      })
      .filter((entry): entry is { row: ReplayPositionSample; positionMs: number } => Boolean(entry))
      .sort((left, right) => left.positionMs - right.positionMs);

    index.set(driver.driver_number, {
      lapRows,
      lapStartMs: lapRows.map((entry) => entry.startMs),
      positionRows: positionRows.map((entry) => entry.row),
      positionMs: positionRows.map((entry) => entry.positionMs),
    });
  });

  return index;
}

function getLapState(laps: PreparedLapRow[], lapStartMs: number[], replayTime: number) {
  if (laps.length === 0 || lapStartMs.length === 0) {
    return { lapNumber: 0, lapFraction: 0, globalProgress: 0, compound: null, drsUsed: null, lapRow: null as ReplayLap | null };
  }

  const currentLapIndex = latestIndexFromMs(lapStartMs, replayTime);

  if (currentLapIndex === -1) {
    return { lapNumber: 0, lapFraction: 0, globalProgress: 0, compound: null, drsUsed: null, lapRow: null as ReplayLap | null };
  }

  const currentLap = laps[currentLapIndex];
  const lapStart = currentLap.startMs;
  const lapEnd = currentLap.endMs;
  const lapFraction = clamp(
    (replayTime - lapStart) / Math.max(lapEnd - lapStart, 1000),
    0,
    1,
  );

  return {
    lapNumber: currentLap.row.lap_number,
    lapFraction,
    globalProgress: currentLap.row.lap_number - 1 + lapFraction,
    compound: currentLap.row.compound ?? null,
    drsUsed: currentLap.row.drs_used ?? null,
    lapRow: currentLap.row,
  };
}

function getPositionAtTime(positions: ReplayPositionSample[], positionMs: number[], replayTime: number) {
  const currentIndex = latestIndexFromMs(positionMs, replayTime);

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
  replayIndex: Map<number, ReplayDriverIndex>,
  normalizedTrack: ReplayTrackPoint[],
  replayTime: number,
  driverDrsZones: Map<number, ReplayDrsZone[]>,
) {
  const markers: ReplayMarker[] = [];

  dataset.drivers.forEach((driver) => {
    const indexed = replayIndex.get(driver.driver_number);
    const lapRows = indexed?.lapRows ?? [];
    const lapStartMs = indexed?.lapStartMs ?? [];
    const positionRows = indexed?.positionRows ?? [];
    const positionMs = indexed?.positionMs ?? [];
    const lapState = getLapState(lapRows, lapStartMs, replayTime);
    const markerPoint = pointAtFraction(normalizedTrack, lapState.lapFraction);
    const driverZones = driverDrsZones.get(driver.driver_number) ?? [];
    const drsActiveNow = driverZones.length
      ? driverZones.some(
          (zone) => lapState.lapFraction >= zone.start_fraction && lapState.lapFraction <= zone.end_fraction,
        )
      : null;

    markers.push({
      driver,
      position: getPositionAtTime(positionRows, positionMs, replayTime),
      lapNumber: lapState.lapNumber,
      lapFraction: lapState.lapFraction,
      globalProgress: lapState.globalProgress,
      x: markerPoint.x,
      y: markerPoint.y,
      compound: lapState.compound,
      drsUsed: lapState.drsUsed,
      drsActiveNow,
      sectorPercent: lapState.lapFraction,
      lapDuration: lapState.lapRow?.lap_duration ?? null,
      lapDateStart: lapState.lapRow?.date_start ?? null,
      sectorTimes: [
        lapState.lapRow?.duration_sector_1 ?? null,
        lapState.lapRow?.duration_sector_2 ?? null,
        lapState.lapRow?.duration_sector_3 ?? null,
      ],
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

  return (
    sessions.find((session) => {
      const sessionEnd = session.date_end ?? session.date_start;
      return Date.parse(sessionEnd) <= now;
    }) ??
    sessions[0] ??
    null
  );
}

interface RaceReplayProps {
  isEmbedded?: boolean;
}

type ReplayLayoutMode = 'balanced' | 'track-focus' | 'data-focus';

function StartLightStrip({ replayMs, motionStartMs }: { replayMs: number; motionStartMs: number }) {
  const startWindowMs = 5000;
  const lightCount = 5;
  const sequenceStartMs = Math.max(0, motionStartMs - startWindowMs);
  const sequenceProgressMs = Math.max(0, replayMs - sequenceStartMs);
  const activeLights =
    replayMs < motionStartMs
      ? Math.max(0, Math.min(lightCount, Math.ceil((sequenceProgressMs / startWindowMs) * lightCount)))
      : lightCount;
  const isGo = replayMs >= motionStartMs;

  return (
    <div
      style={{
        display: 'grid',
        gap: '0.35rem',
        padding: '0.55rem 0.7rem',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: 160,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Start Lights
        </span>
        <span style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: isGo ? '#00d2be' : '#ea3323', fontWeight: 900 }}>
          {isGo ? 'GO' : 'ARMED'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.35rem' }}>
        {Array.from({ length: lightCount }).map((_, index) => {
          const lit = isGo ? true : index < activeLights;
          return (
            <span
              key={index}
              style={{
                height: 10,
                borderRadius: 999,
                background: lit
                  ? isGo
                    ? 'linear-gradient(180deg, #00d2be, #00f0ff)'
                    : 'linear-gradient(180deg, #ff4d4f, #ea3323)'
                  : 'rgba(255,255,255,0.08)',
                boxShadow: lit ? `0 0 10px ${isGo ? 'rgba(0, 240, 255, 0.75)' : 'rgba(234, 51, 35, 0.75)'}` : 'none',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {isGo ? 'Race underway' : 'Pre-start sequence'}
        </span>
        <span style={{ color: 'var(--text-primary)', fontSize: '0.72rem', fontFamily: 'monospace' }}>
          {formatReplayClock(replayMs)}
        </span>
      </div>
    </div>
  );
}

function getStartCuePhase(replayMs: number, motionStartMs: number) {
  const startWindowMs = 5000;
  const sequenceStartMs = Math.max(0, motionStartMs - startWindowMs);

  if (replayMs < sequenceStartMs) return 0;
  if (replayMs >= motionStartMs) return 6;

  const phase = Math.floor((replayMs - sequenceStartMs) / (startWindowMs / 5)) + 1;
  return Math.max(1, Math.min(5, phase));
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
  const [zoom, setZoom] = useState<number>(1);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<ReplayLayoutMode>('balanced');
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [driverDrsZones, setDriverDrsZones] = useState<Map<number, ReplayDrsZone[]>>(new Map());
  const [driverLapDrs, setDriverLapDrs] = useState<Map<string, boolean>>(new Map());
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [replayMetrics, setReplayMetrics] = useState<{
    firstPlayableMs: number | null;
    averageFps: number | null;
    frameDrops: number;
  }>({ firstPlayableMs: null, averageFps: null, frameDrops: 0 });
  const replayLoadStartedRef = useRef<number | null>(null);
  const startCueAudioRef = useRef<AudioContext | null>(null);
  const lastStartCuePhaseRef = useRef<number>(0);
  const frameStatsRef = useRef<{ startTs: number; frames: number; dropped: number; lastPushTs: number }>({
    startTs: 0,
    frames: 0,
    dropped: 0,
    lastPushTs: 0,
  });

  const demoSessions = useMemo<ReplaySessionSummary[]>(() => [
    {
      session_key: 1,
      session_type: 'R',
      session_name: 'Bahrain Grand Prix',
      date_start: `${currentYear}-03-02T12:00:00Z`,
      date_end: `${currentYear}-03-02T14:00:00Z`,
      meeting_key: 1,
      circuit_key: 1,
      circuit_short_name: 'Bahrain',
      country_name: 'Bahrain',
      location: 'Sakhir',
      year: currentYear,
      round: 1,
    },
    {
      session_key: 2,
      session_type: 'R',
      session_name: 'Monaco Grand Prix',
      date_start: `${currentYear}-05-25T14:00:00Z`,
      date_end: `${currentYear}-05-25T16:00:00Z`,
      meeting_key: 2,
      circuit_key: 2,
      circuit_short_name: 'Monaco',
      country_name: 'Monaco',
      location: 'Monte Carlo',
      year: currentYear,
      round: 2,
    },
    {
      session_key: 3,
      session_type: 'R',
      session_name: 'Italian Grand Prix',
      date_start: `${currentYear}-09-07T13:00:00Z`,
      date_end: `${currentYear}-09-07T15:00:00Z`,
      meeting_key: 3,
      circuit_key: 3,
      circuit_short_name: 'Monza',
      country_name: 'Italy',
      location: 'Monza',
      year: currentYear,
      round: 3,
    },
  ], [currentYear]);

  function buildDemoDataset(session: ReplaySessionSummary): ReplayDataset {
    const baseTime = new Date(session.date_start).getTime() || Date.now();
    const totalLaps = 12;
    const drivers: ReplayDriver[] = [
      {
        session_key: session.session_key,
        driver_number: 1,
        broadcast_name: 'VER',
        full_name: 'Max Verstappen',
        name_acronym: 'VER',
        team_name: 'Red Bull Racing',
        team_colour: '3671C6',
        first_name: 'Max',
        last_name: 'Verstappen',
        headshot_url: '',
        country_code: 'NED',
      },
      {
        session_key: session.session_key,
        driver_number: 44,
        broadcast_name: 'HAM',
        full_name: 'Lewis Hamilton',
        name_acronym: 'HAM',
        team_name: 'Ferrari',
        team_colour: 'E8002D',
        first_name: 'Lewis',
        last_name: 'Hamilton',
        headshot_url: '',
        country_code: 'GBR',
      },
      {
        session_key: session.session_key,
        driver_number: 16,
        broadcast_name: 'LEC',
        full_name: 'Charles Leclerc',
        name_acronym: 'LEC',
        team_name: 'Ferrari',
        team_colour: 'E8002D',
        first_name: 'Charles',
        last_name: 'Leclerc',
        headshot_url: '',
        country_code: 'MON',
      },
      {
        session_key: session.session_key,
        driver_number: 4,
        broadcast_name: 'NOR',
        full_name: 'Lando Norris',
        name_acronym: 'NOR',
        team_name: 'McLaren',
        team_colour: 'FF8000',
        first_name: 'Lando',
        last_name: 'Norris',
        headshot_url: '',
        country_code: 'GBR',
      },
      {
        session_key: session.session_key,
        driver_number: 63,
        broadcast_name: 'RUS',
        full_name: 'George Russell',
        name_acronym: 'RUS',
        team_name: 'Mercedes',
        team_colour: '27F4D2',
        first_name: 'George',
        last_name: 'Russell',
        headshot_url: '',
        country_code: 'GBR',
      },
      {
        session_key: session.session_key,
        driver_number: 14,
        broadcast_name: 'ALO',
        full_name: 'Fernando Alonso',
        name_acronym: 'ALO',
        team_name: 'Aston Martin',
        team_colour: '229971',
        first_name: 'Fernando',
        last_name: 'Alonso',
        headshot_url: '',
        country_code: 'ESP',
      },
    ];

    const laps: ReplayLap[] = [];
    const positions: ReplayPositionSample[] = [];

    drivers.forEach((driver, idx) => {
      const offset = idx * 4000;
      for (let lap = 1; lap <= totalLaps; lap += 1) {
        const lapDuration = 88 + (idx % 3) * 1.5;
        const lapStart = baseTime + offset + (lap - 1) * lapDuration * 1000;
        laps.push({
          session_key: session.session_key,
          driver_number: driver.driver_number,
          lap_number: lap,
          date_start: new Date(lapStart).toISOString(),
          lap_duration: lapDuration,
          is_pit_out_lap: lap === 1,
        });
        positions.push({
          session_key: session.session_key,
          driver_number: driver.driver_number,
          position: idx + 1,
          date: new Date(lapStart).toISOString(),
        });
      }
    });

    const track = {
      points: getTrackPointsForCircuit(session.circuit_short_name),
      source_driver_number: drivers[0].driver_number,
    };

    return {
      session,
      drivers,
      laps: laps.map((lap, index) => ({
        ...lap,
        compound: ['SOFT', 'MEDIUM', 'HARD'][index % 3],
        drs_used: index % 2 === 0,
      })),
      positions,
      race_control: [],
      stints: [],
      pit_stops: [],
      weather: [],
      team_radio: [],
      tyre_per_lap: [],
      strategy_summaries: [],
      track,
      total_laps: totalLaps,
      start_time: new Date(baseTime).toISOString(),
      end_time: new Date(baseTime + totalLaps * 90 * 1000).toISOString(),
    };
  }

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

        if (replaySessions.length === 0 && selectedYear === currentYear) {
          setSelectedYear(currentYear - 1);
          return;
        }

        setSessions(replaySessions);
        if (replaySessions.length > 0) {
          setSelectedSessionKey(pickDefaultSession(replaySessions)?.session_key ?? null);
        } else if (selectedYear === 2026) {
          setSelectedYear(2025);
        } else {
          setSelectedSessionKey(null);
        }
      } catch {
        if (!ignore) {
          setDemoMode(true);
          setErrorMsg(null);
          setSessions(demoSessions);
          setSelectedSessionKey(demoSessions[0]?.session_key ?? null);
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
  }, [selectedYear, currentYear, demoSessions]);

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
        replayLoadStartedRef.current = performance.now();
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
        setDemoMode(false);
        setSelectedDriverNumber(replayDataset.track.source_driver_number);
        setDriverDrsZones(new Map());
        setDriverLapDrs(new Map());
        setReplayMetrics((prev) => ({
          ...prev,
          firstPlayableMs:
            replayLoadStartedRef.current !== null
              ? Math.round(performance.now() - replayLoadStartedRef.current)
              : prev.firstPlayableMs,
        }));
      } catch {
        if (!ignore) {
          setDemoMode(true);
          setErrorMsg(null);
          setDataset(buildDemoDataset(sessionToLoad));
          setReplayMs(0);
          setIsPlaying(false);
          setSelectedDriverNumber(null);
          setDriverDrsZones(new Map());
          setDriverLapDrs(new Map());
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
  }, [selectedSessionKey, sessions, reloadNonce]);

  useEffect(() => {
    if (!dataset || selectedDriverNumber === null) return;
    const driverNumber = selectedDriverNumber;
    const sessionSummary = dataset.session;
    if (driverDrsZones.has(driverNumber)) return;

    let ignore = false;

    async function loadDriverTelemetry() {
      try {
        const driverTelemetry = await fetchDriverReplayTelemetry(sessionSummary, driverNumber);
        if (ignore) return;

        setDriverDrsZones((prev) => {
          const next = new Map(prev);
          next.set(driverNumber, driverTelemetry.drs_zones ?? []);
          return next;
        });

        setDriverLapDrs((prev) => {
          const next = new Map(prev);
          (driverTelemetry.lap_drs ?? []).forEach((lap) => {
            next.set(`${driverNumber}:${lap.lap_number}:${lap.date_start ?? ''}`, Boolean(lap.drs_used));
          });
          return next;
        });
      } catch {
        if (ignore) return;
        setDriverDrsZones((prev) => {
          const next = new Map(prev);
          next.set(driverNumber, []);
          return next;
        });
      }
    }

    loadDriverTelemetry();

    return () => {
      ignore = true;
    };
  }, [dataset, selectedDriverNumber, driverDrsZones]);

  const replayDurationMs = dataset
    ? Math.max(Date.parse(dataset.end_time) - Date.parse(dataset.start_time), 1000)
    : 1000;
  const normalizedTrack = useMemo(
    () => (dataset ? normalizeTrack(resolveTrackPoints(dataset)) : []),
    [dataset],
  );
  const replayIndex = useMemo(
    () => (dataset ? buildReplayIndex(dataset) : new Map<number, ReplayDriverIndex>()),
    [dataset],
  );
  const trackPath = useMemo(() => buildTrackPath(normalizedTrack), [normalizedTrack]);
  const motionReplayMs = Math.max(0, replayMs - START_SEQUENCE_MS);
  const controlReplayTime = dataset ? Date.parse(dataset.start_time) + replayMs : 0;
  const currentReplayTime = dataset ? Date.parse(dataset.start_time) + motionReplayMs : 0;
  const motionStartMs = useMemo(() => {
    if (!dataset) return START_SEQUENCE_MS;

    let firstLapStartMs = Number.POSITIVE_INFINITY;
    replayIndex.forEach((driverIndex) => {
      if (driverIndex.lapStartMs.length > 0) {
        firstLapStartMs = Math.min(firstLapStartMs, driverIndex.lapStartMs[0]);
      }
    });

    if (!Number.isFinite(firstLapStartMs)) {
      return START_SEQUENCE_MS;
    }

    const datasetStartMs = Date.parse(dataset.start_time);
    const firstLapOffsetMs = Math.max(0, firstLapStartMs - datasetStartMs);
    return START_SEQUENCE_MS + firstLapOffsetMs;
  }, [dataset, replayIndex]);
  const startCuePhase = useMemo(() => getStartCuePhase(replayMs, motionStartMs), [replayMs, motionStartMs]);
  const activeDrsZones = useMemo(() => {
    if (!dataset) return [] as ReplayDrsZone[];
    if (selectedDriverNumber && driverDrsZones.has(selectedDriverNumber)) {
      return driverDrsZones.get(selectedDriverNumber) ?? [];
    }
    return dataset.drs_zones ?? [];
  }, [dataset, selectedDriverNumber, driverDrsZones]);
  const markers = useMemo(
    () =>
      dataset
        ? buildReplayMarkers(dataset, replayIndex, normalizedTrack, currentReplayTime, driverDrsZones).map((marker) => {
            const lapDrsKey = `${marker.driver.driver_number}:${marker.lapNumber}:${marker.lapDateStart ?? ''}`;
            const derivedDrsUsed = driverLapDrs.has(lapDrsKey) ? driverLapDrs.get(lapDrsKey) ?? null : marker.drsUsed;
            return {
              ...marker,
              drsUsed: derivedDrsUsed,
            };
          })
        : [],
    [dataset, replayIndex, normalizedTrack, currentReplayTime, driverDrsZones, driverLapDrs],
  );
  const currentRaceControl = dataset
    ? getLatestRaceControlMessage(dataset.race_control, controlReplayTime)
    : null;
  const currentLap = markers.reduce((maxLap, marker) => Math.max(maxLap, marker.lapNumber), 0);
  const focusedDriver =
    markers.find((marker) => marker.driver.driver_number === selectedDriverNumber) ?? markers[0];
  const fastestLapMarker = useMemo(
    () =>
      markers.filter((marker) => marker.lapDuration !== null).sort((left, right) => (left.lapDuration ?? Infinity) - (right.lapDuration ?? Infinity))[0] ?? null,
    [markers],
  );
  const bestSectorTimes = useMemo(() => {
    return [0, 1, 2].map((sectorIndex) => {
      const sectorValues = markers
        .map((marker) => marker.sectorTimes[sectorIndex])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      if (!sectorValues.length) return null;
      return Math.min(...sectorValues);
    }) as [number | null, number | null, number | null];
  }, [markers]);
  const isSafetyCarActive = isSafetyCarMessage(currentRaceControl);
  const selectedDriverTeam = focusedDriver?.driver.team_name ?? '';
  const isFerrariSelected = /ferrari/i.test(selectedDriverTeam);
  const shouldVirtualizeTable = markers.length > 16;
  const virtualWindowSize = REPLAY_TABLE_VIEWPORT_ROWS + 3;
  const virtualStartIndex = shouldVirtualizeTable
    ? Math.max(0, Math.floor(tableScrollTop / REPLAY_ROW_HEIGHT) - 1)
    : 0;
  const virtualEndIndex = shouldVirtualizeTable
    ? Math.min(markers.length, virtualStartIndex + virtualWindowSize)
    : markers.length;
  const visibleMarkers = markers.slice(virtualStartIndex, virtualEndIndex);
  const virtualTopPad = shouldVirtualizeTable ? virtualStartIndex * REPLAY_ROW_HEIGHT : 0;
  const virtualBottomPad = shouldVirtualizeTable
    ? Math.max(0, (markers.length - virtualEndIndex) * REPLAY_ROW_HEIGHT)
    : 0;

  useEffect(() => {
    if (!dataset || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      lastFrameRef.current = null;
      return;
    }

    frameStatsRef.current = {
      startTs: performance.now(),
      frames: 0,
      dropped: 0,
      lastPushTs: performance.now(),
    };

    const tick = (frameTime: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = frameTime;
      }

      const elapsed = frameTime - lastFrameRef.current;
      lastFrameRef.current = frameTime;
      frameStatsRef.current.frames += 1;
      if (elapsed > 34) {
        frameStatsRef.current.dropped += 1;
      }

      if (frameTime - frameStatsRef.current.lastPushTs >= 1000) {
        const totalSeconds = Math.max((frameTime - frameStatsRef.current.startTs) / 1000, 0.001);
        setReplayMetrics((prev) => ({
          ...prev,
          averageFps: Number((frameStatsRef.current.frames / totalSeconds).toFixed(1)),
          frameDrops: frameStatsRef.current.dropped,
        }));
        frameStatsRef.current.lastPushTs = frameTime;
      }

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

  useEffect(() => {
    if (!dataset) return;

    const currentPhase = startCuePhase;
    const previousPhase = lastStartCuePhaseRef.current;

    if (!isPlaying) {
      lastStartCuePhaseRef.current = currentPhase;
      return;
    }

    if (currentPhase < previousPhase) {
      lastStartCuePhaseRef.current = currentPhase;
      return;
    }

    if (currentPhase === previousPhase) return;

    const AudioCtor =
      typeof window !== 'undefined'
        ? (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!AudioCtor) {
      lastStartCuePhaseRef.current = currentPhase;
      return;
    }

    const audioContext = startCueAudioRef.current ?? new AudioCtor();
    startCueAudioRef.current = audioContext;
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const playCue = (kind: 'light' | 'go', phase: number) => {
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(audioContext.destination);

      const now = audioContext.currentTime;

      if (kind === 'light') {
        const stepFreq = [660, 710, 760, 815, 880];
        const base = stepFreq[Math.max(0, Math.min(stepFreq.length - 1, phase - 1))];
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.03, now + 0.08);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.082);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.095);
        return;
      }

      const low = audioContext.createOscillator();
      const high = audioContext.createOscillator();
      const gain = audioContext.createGain();
      low.type = 'sawtooth';
      high.type = 'triangle';
      low.frequency.setValueAtTime(980, now);
      low.frequency.exponentialRampToValueAtTime(1120, now + 0.19);
      high.frequency.setValueAtTime(1320, now);
      high.frequency.exponentialRampToValueAtTime(1480, now + 0.19);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      low.connect(gain);
      high.connect(gain);
      gain.connect(masterGain);
      low.start(now);
      high.start(now);
      low.stop(now + 0.24);
      high.stop(now + 0.24);
    };

    for (let phase = previousPhase + 1; phase <= currentPhase; phase += 1) {
      if (phase >= 1 && phase <= 5) {
        playCue('light', phase);
      } else if (phase === 6) {
        playCue('go', phase);
      }
    }

    lastStartCuePhaseRef.current = currentPhase;
  }, [dataset, isPlaying, startCuePhase]);

  useEffect(() => {
    setTableScrollTop(0);
  }, [selectedSessionKey, markers.length]);

  const replayHeader = dataset
    ? `${dataset.session.country_name} ${dataset.session.year} Replay`
    : 'Race Replay';

  if (isEmbedded) {
    const vWidth = TRACK_WIDTH / zoom;
    const vHeight = TRACK_HEIGHT / zoom;
    const vX = (TRACK_WIDTH - vWidth) / 2;
    const vY = (TRACK_HEIGHT - vHeight) / 2;

    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          className="replay-stage"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            background: isFerrariSelected
              ? 'linear-gradient(180deg, rgba(232, 0, 45, 0.14), rgba(5, 5, 8, 0.18))'
              : undefined,
          }}
        >
          <DrsZoneRail zones={activeDrsZones} currentFraction={focusedDriver?.lapFraction ?? 0} />
          <div style={{ position: 'absolute', top: '64px', left: '14px', zIndex: 5 }}>
            <StartLightStrip replayMs={replayMs} motionStartMs={motionStartMs} />
          </div>
          
          <div style={{ position: 'absolute', bottom: '30px', right: '30px', display: 'flex', gap: '8px', zIndex: 5 }}>
             <button className="replay-button" style={{ padding: '0.4rem 0.8rem', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>-</button>
             <button className="replay-button" style={{ padding: '0.4rem 0.8rem', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => setZoom(z => Math.min(3, z + 0.2))}>+</button>
             <button className="replay-button" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold' }} onClick={() => setZoom(1)}>Reset</button>
          </div>

          <div className="panel-header" style={{ justifyContent: 'space-between', padding: '1rem', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)', borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Flag size={14} color={getFlagTone(currentRaceControl?.flag ?? null)} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                {dataset ? `${dataset.session.circuit_short_name} • LAP ${currentLap}` : 'SYSTEM IDLE'}
              </span>
            </div>
            {demoMode && (
              <span className="speed-chip active" style={{ fontSize: '0.55rem', padding: '0.2rem 0.45rem' }}>
                DEMO MODE
              </span>
            )}
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

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0 1rem 0.5rem', justifyContent: 'center' }}>
            <TyreBadge compound="SOFT" />
            <TyreBadge compound="MEDIUM" />
            <TyreBadge compound="HARD" />
            <DrsLight active={true} />
            <DrsLight active={false} />
          </div>

          <div className="replay-canvas" style={{ flex: 1, minHeight: 0, position: 'relative', background: 'transparent' }}>
            {!dataset && !loadingReplay && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                NO REPLAY DATA SELECTED
              </div>
            )}
            {dataset && (
              <svg
                viewBox={`${vX} ${vY} ${vWidth} ${vHeight}`}
                style={{ width: '100%', height: '100%', transition: 'viewBox 0.3s ease-out' }}
              >
                <defs>
                   <linearGradient id="trackGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="rgba(0, 240, 255, 0.15)" />
                     <stop offset="50%" stopColor="rgba(0, 240, 255, 0.4)" />
                     <stop offset="100%" stopColor="rgba(0, 240, 255, 0.15)" />
                   </linearGradient>
                </defs>
                <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="20" />
                <path d={trackPath} fill="none" stroke="url(#trackGlow)" strokeWidth="4" strokeLinecap="round" />
                {markers.map((marker) => (
                  <g key={marker.driver.driver_number}>
                    {marker.driver.driver_number === fastestLapMarker?.driver.driver_number && (
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r={selectedDriverNumber === marker.driver.driver_number ? 13 : 10}
                        fill="none"
                        stroke="rgba(181, 109, 255, 0.8)"
                        strokeWidth="1.6"
                        strokeDasharray="4 3"
                      />
                    )}
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={selectedDriverNumber === marker.driver.driver_number ? 8 : 5.5}
                      fill={`#${marker.driver.team_colour}`}
                      stroke={marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '#b56dff' : 'rgba(0,0,0,0.5)'}
                      strokeWidth="1.5"
                      filter={marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? 'drop-shadow(0 0 7px rgba(181, 109, 255, 0.95))' : undefined}
                    />
                    <text
                      x={marker.x}
                      y={marker.y - 14}
                      textAnchor="middle"
                      fill={marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '#e7ccff' : 'var(--text-primary)'}
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textShadow: marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '0 0 10px rgba(181, 109, 255, 0.95)' : 'none',
                      }}
                    >
                      {marker.driver.name_acronym}
                    </text>
                  </g>
                ))}
                {isSafetyCarActive && focusedDriver && (
                  <g>
                    <circle
                      cx={focusedDriver.x}
                      cy={focusedDriver.y - 18}
                      r={7}
                      fill="#f4b400"
                      stroke="#fff6bf"
                      strokeWidth="1.4"
                      filter="drop-shadow(0 0 7px rgba(244, 180, 0, 0.85))"
                    />
                    <text
                      x={focusedDriver.x}
                      y={focusedDriver.y - 21}
                      textAnchor="middle"
                      fill="#0a0a0c"
                      style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.08em' }}
                    >
                      SC
                    </text>
                  </g>
                )}
              </svg>
            )}
          </div>

          {dataset && (
            <div className="replay-controls" style={{ padding: '0.75rem 1rem', borderTop: 'none', position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
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
              <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                <SectorBars progress={replayDurationMs ? replayMs / replayDurationMs : 0} />
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <TyreBadge compound="SOFT" />
          <TyreBadge compound="MEDIUM" />
          <TyreBadge compound="HARD" />
          <DrsLight active={true} />
          <DrsLight active={false} />
        </div>
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

      {!isEmbedded && dataset && (
        <div className="glass-panel" style={{ padding: '0.8rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="replay-label" style={{ marginRight: '0.15rem' }}>Layout</span>
              <button type="button" className={`speed-chip ${layoutMode === 'balanced' ? 'active' : ''}`} onClick={() => setLayoutMode('balanced')}>
                Balanced
              </button>
              <button type="button" className={`speed-chip ${layoutMode === 'track-focus' ? 'active' : ''}`} onClick={() => setLayoutMode('track-focus')}>
                <Maximize2 size={12} /> Track Focus
              </button>
              <button type="button" className={`speed-chip ${layoutMode === 'data-focus' ? 'active' : ''}`} onClick={() => setLayoutMode('data-focus')}>
                <Minimize2 size={12} /> Data Focus
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="speed-chip" style={{ fontSize: '0.66rem' }}>
                First Playable: {replayMetrics.firstPlayableMs !== null ? `${replayMetrics.firstPlayableMs}ms` : '--'}
              </span>
              <span className="speed-chip" style={{ fontSize: '0.66rem' }}>
                FPS: {replayMetrics.averageFps !== null ? replayMetrics.averageFps.toFixed(1) : '--'}
              </span>
              <span className="speed-chip" style={{ fontSize: '0.66rem' }}>
                Frame Drops: {replayMetrics.frameDrops}
              </span>
              <StartLightStrip replayMs={replayMs} motionStartMs={motionStartMs} />
            </div>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="button"
              className="replay-button"
              onClick={() => {
                setErrorMsg(null);
                setReloadNonce((value) => value + 1);
              }}
            >
              Retry
            </button>
            <button
              type="button"
              className="replay-button replay-button-secondary"
              onClick={() => {
                const selectedSession = sessions.find((session) => session.session_key === selectedSessionKey);
                if (!selectedSession) return;
                setDataset(buildDemoDataset(selectedSession));
                setDemoMode(true);
                setErrorMsg(null);
                setIsPlaying(false);
                setReplayMs(0);
              }}
            >
              Use Demo Data
            </button>
            <button
              type="button"
              className="replay-button replay-button-secondary"
              onClick={() => setSelectedYear((year) => Math.max(year - 1, replayYears[replayYears.length - 1]))}
            >
              Change Season
            </button>
          </div>
        </div>
      ) : dataset ? (
        <div
          className="replay-layout"
          style={{
            gridTemplateColumns:
              layoutMode === 'track-focus'
                ? 'minmax(0, 1.9fr) minmax(280px, 0.7fr)'
                : layoutMode === 'data-focus'
                  ? 'minmax(0, 1.05fr) minmax(420px, 1.15fr)'
                  : undefined,
          }}
        >
        <div
          className="glass-panel replay-stage"
          style={{
            background: isFerrariSelected
              ? 'linear-gradient(180deg, rgba(232, 0, 45, 0.12), rgba(18, 5, 8, 0.92))'
              : undefined,
          }}
        >
            <DrsZoneRail zones={activeDrsZones} currentFraction={focusedDriver?.lapFraction ?? 0} />
            <div className="panel-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="panel-title" style={{ marginBottom: '0.35rem' }}>
                  Track Replay
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {dataset.session.circuit_short_name} • {dataset.session.location}, {dataset.session.country_name}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {demoMode && (
                  <span className="speed-chip active" style={{ fontSize: '0.65rem' }}>
                    DEMO MODE
                  </span>
                )}
                {isSafetyCarActive && (
                  <span className="speed-chip active" style={{ fontSize: '0.65rem', background: 'rgba(244, 180, 0, 0.18)', borderColor: 'rgba(244, 180, 0, 0.4)', color: '#ffe8a3' }}>
                    SAFETY CAR
                  </span>
                )}
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
                    {marker.driver.driver_number === fastestLapMarker?.driver.driver_number && (
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r={selectedDriverNumber === marker.driver.driver_number ? 13 : 10}
                        fill="none"
                        stroke="rgba(181, 109, 255, 0.8)"
                        strokeWidth="1.6"
                        strokeDasharray="4 3"
                      />
                    )}
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={selectedDriverNumber === marker.driver.driver_number ? 9 : 6.5}
                      fill={`#${marker.driver.team_colour}`}
                      stroke={marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '#b56dff' : 'rgba(10, 10, 12, 0.95)'}
                      strokeWidth={selectedDriverNumber === marker.driver.driver_number ? 2.5 : 1.5}
                      filter={marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? 'drop-shadow(0 0 7px rgba(181, 109, 255, 0.95))' : undefined}
                    />
                    <text
                      x={marker.x}
                      y={marker.y - 18}
                      textAnchor="middle"
                      fill={marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '#e7ccff' : 'var(--text-primary)'}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textShadow: marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '0 0 10px rgba(181, 109, 255, 0.95)' : 'none',
                      }}
                    >
                      {marker.driver.name_acronym}
                    </text>
                  </g>
                ))}
                {isSafetyCarActive && focusedDriver && (
                  <g>
                    <circle
                      cx={focusedDriver.x}
                      cy={focusedDriver.y - 18}
                      r={8}
                      fill="#f4b400"
                      stroke="#fff6bf"
                      strokeWidth="1.4"
                      filter="drop-shadow(0 0 7px rgba(244, 180, 0, 0.85))"
                    />
                    <text
                      x={focusedDriver.x}
                      y={focusedDriver.y - 21}
                      textAnchor="middle"
                      fill="#0a0a0c"
                      style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.08em' }}
                    >
                      SC
                    </text>
                  </g>
                )}
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

          <div className="replay-side-stack">
            <RaceIntelligencePanel dataset={dataset} selectedDriverNumber={selectedDriverNumber} />

            <div className="glass-panel replay-side-card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <Gauge size={18} color="var(--accent-blue)" />
                <h2 className="panel-title">Focused Driver</h2>
              </div>
              {focusedDriver ? (
                <div
                  className="driver-focus-card"
                  style={{
                    alignItems: 'start',
                    background: isFerrariSelected ? 'linear-gradient(180deg, rgba(232, 0, 45, 0.14), rgba(255,255,255,0.03))' : undefined,
                    borderColor: isFerrariSelected ? 'rgba(232, 0, 45, 0.4)' : undefined,
                  }}
                >
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                    <strong
                      style={{
                        fontSize: '1.05rem',
                        color: isFerrariSelected ? '#ffd4dc' : 'inherit',
                        textShadow: isFerrariSelected ? '0 0 8px rgba(232, 0, 45, 0.55)' : 'none',
                      }}
                    >
                      {focusedDriver.driver.full_name}
                    </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{focusedDriver.driver.team_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      P{focusedDriver.position ?? '--'} • Lap {focusedDriver.lapNumber || '--'} • {(focusedDriver.lapFraction * 100).toFixed(0)}% through lap
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Fastest lap: {fastestLapMarker ? `${fastestLapMarker.driver.name_acronym} ${formatLapDuration(fastestLapMarker.lapDuration)}` : '--'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem', alignItems: 'center' }}>
                      <TyreBadge compound={focusedDriver.compound} />
                      <DrsLight active={focusedDriver.drsActiveNow} />
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <SectorIcon index={1} value={focusedDriver.sectorTimes[0]} best={bestSectorTimes[0] !== null && focusedDriver.sectorTimes[0] === bestSectorTimes[0]} />
                        <SectorIcon index={2} value={focusedDriver.sectorTimes[1]} best={bestSectorTimes[1] !== null && focusedDriver.sectorTimes[1] === bestSectorTimes[1]} />
                        <SectorIcon index={3} value={focusedDriver.sectorTimes[2]} best={bestSectorTimes[2] !== null && focusedDriver.sectorTimes[2] === bestSectorTimes[2]} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No driver focus is available for this replay.</p>
              )}
            </div>

            <div className="glass-panel replay-side-card" style={{ padding: '1.15rem', minHeight: 0 }}>
              <h2 className="panel-title" style={{ marginBottom: '1rem' }}>
                Replay Leaderboard
              </h2>

              <div
                className="replay-table"
                style={shouldVirtualizeTable ? { maxHeight: `${REPLAY_TABLE_VIEWPORT_ROWS * REPLAY_ROW_HEIGHT}px`, overflowY: 'auto' } : undefined}
                onScroll={shouldVirtualizeTable ? (event) => setTableScrollTop(event.currentTarget.scrollTop) : undefined}
              >
                {shouldVirtualizeTable && <div style={{ height: virtualTopPad }} />}
                {visibleMarkers.map((marker) => (
                  <button
                    key={marker.driver.driver_number}
                    type="button"
                    className={`replay-row ${selectedDriverNumber === marker.driver.driver_number ? 'selected' : ''}`}
                    onClick={() => setSelectedDriverNumber(marker.driver.driver_number)}
                    style={{
                      alignItems: 'center',
                      gap: '0.6rem',
                      borderColor: marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? 'rgba(181, 109, 255, 0.3)' : undefined,
                      boxShadow: marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '0 0 16px rgba(181, 109, 255, 0.16)' : undefined,
                    }}
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
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        color: marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '#e7ccff' : 'inherit',
                        textShadow: marker.driver.driver_number === fastestLapMarker?.driver.driver_number ? '0 0 8px rgba(181, 109, 255, 0.9)' : 'none',
                      }}
                    >
                      {marker.driver.full_name}
                      {marker.driver.driver_number === fastestLapMarker?.driver.driver_number && (
                        <span style={{ marginLeft: '0.4rem', color: '#c084fc', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Fastest
                        </span>
                      )}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      L{marker.lapNumber || 0}
                    </span>
                    <TyreBadge compound={marker.compound} />
                    <DrsLight active={marker.drsActiveNow} />
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <SectorIcon index={1} value={marker.sectorTimes[0]} best={bestSectorTimes[0] !== null && marker.sectorTimes[0] === bestSectorTimes[0]} />
                      <SectorIcon index={2} value={marker.sectorTimes[1]} best={bestSectorTimes[1] !== null && marker.sectorTimes[1] === bestSectorTimes[1]} />
                      <SectorIcon index={3} value={marker.sectorTimes[2]} best={bestSectorTimes[2] !== null && marker.sectorTimes[2] === bestSectorTimes[2]} />
                    </div>
                    <SectorBars progress={marker.sectorPercent} />
                  </button>
                ))}
                {shouldVirtualizeTable && <div style={{ height: virtualBottomPad }} />}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Select a completed race to load the replay.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button
              type="button"
              className="replay-button"
              onClick={() => setReloadNonce((value) => value + 1)}
            >
              Retry Session Load
            </button>
            <button
              type="button"
              className="replay-button replay-button-secondary"
              onClick={() => setSelectedYear((year) => Math.max(year - 1, replayYears[replayYears.length - 1]))}
            >
              Switch to Previous Season
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
