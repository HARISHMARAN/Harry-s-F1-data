"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, BatteryWarning, CloudRain, Droplets, Flag, Gauge, Radio, Timer, Wind } from 'lucide-react';
import type { DashboardSession } from '../types/f1';

type DriverTelemetryInsight = {
  driver_number: number;
  code: string;
  name: string;
  team: string;
  position: number | null;
  current_lap: number | null;
  compound: string | null;
  tyre_age_laps: number | null;
  stint_number: number | null;
  pit_stops: number;
  last_lap_time: number | null;
  top_speed: number | null;
  elimination_status: string;
  battery_status: string;
};

type TelemetryIntelligence = {
  session_name: string;
  session_type: string;
  status: 'live' | 'no_live';
  generated_at: string;
  weather: {
    air_temperature: number | null;
    track_temperature: number | null;
    humidity: number | null;
    rainfall: number | null;
    wind_speed: number | null;
    pressure: number | null;
  } | null;
  drivers: DriverTelemetryInsight[];
  race_control: {
    category: string | null;
    flag: string | null;
    message: string;
    lap_number: number | null;
  }[];
  eliminations: {
    drivers: string[];
    teams: string[];
    note: string;
  };
  battery: {
    available: boolean;
    note: string;
  };
  track_status: string;
  data_notes: string[];
};

type TelemetryApiResponse = {
  status: 'live' | 'no_live';
  next_session?: DashboardSession | null;
  telemetry_intelligence?: TelemetryIntelligence;
  warnings?: string[];
};

type LiveRaceTelemetryPanelProps = {
  nextSession: DashboardSession | null;
  compact?: boolean;
};

const REFRESH_MS = 12_000;

function formatValue(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

function formatLapTime(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '--';
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function formatSchedule(value?: string | null) {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule pending';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function compoundTone(compound: string | null) {
  const normalized = compound?.toLowerCase() ?? '';
  if (normalized.includes('soft')) return '#ef4444';
  if (normalized.includes('medium')) return '#facc15';
  if (normalized.includes('hard')) return '#f8fafc';
  if (normalized.includes('inter')) return '#22c55e';
  if (normalized.includes('wet')) return '#38bdf8';
  return 'var(--text-muted)';
}

function MetricTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.65rem', background: 'rgba(255,255,255,0.04)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase' }}>
        {icon}
        <span>{label}</span>
      </div>
      <strong style={{ display: 'block', marginTop: '0.35rem', fontSize: '1rem', color: 'var(--text-primary)' }}>{value}</strong>
    </div>
  );
}

export default function LiveRaceTelemetryPanel({ nextSession, compact = false }: LiveRaceTelemetryPanelProps) {
  const [payload, setPayload] = useState<TelemetryApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTelemetry() {
      try {
        const response = await fetch('/api/telemetry', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Telemetry API returned ${response.status}`);
        const json = (await response.json()) as TelemetryApiResponse;
        if (!cancelled) {
          setPayload(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Telemetry API unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTelemetry();
    const intervalId = window.setInterval(loadTelemetry, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const intelligence = payload?.telemetry_intelligence ?? null;
  const sessionLabel = intelligence?.session_name ?? nextSession?.session_name ?? 'Miami Grand Prix';
  const sessionType = intelligence?.session_type ?? nextSession?.session_type ?? 'Race';
  const isLive = payload?.status === 'live';
  const weather = intelligence?.weather ?? null;
  const drivers = useMemo(() => intelligence?.drivers.slice(0, compact ? 6 : 10) ?? [], [compact, intelligence]);
  const raceControl = intelligence?.race_control.slice(0, compact ? 2 : 4) ?? [];
  const eliminatedDrivers = intelligence?.eliminations.drivers ?? [];
  const eliminatedTeams = intelligence?.eliminations.teams ?? [];
  const nextStart = payload?.next_session?.date_start ?? nextSession?.date_start ?? null;

  return (
    <section style={{ width: compact ? '100%' : '620px', maxWidth: '100%', display: 'grid', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: isLive ? 'var(--accent-success)' : 'var(--accent-f1)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>
            <Activity size={14} />
            <span>{isLive ? 'Live OpenF1 feed' : 'Miami live window armed'}</span>
          </div>
          <h2 style={{ margin: '0.3rem 0 0', fontSize: compact ? '1.15rem' : '1.45rem', lineHeight: 1.12 }}>
            {sessionLabel} Telemetry
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            {isLive ? `${sessionType} data is being refreshed every ${REFRESH_MS / 1000}s.` : `Next Miami session: ${formatSchedule(nextStart)}`}
          </p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 92 }}>
          <div style={{ color: isLive ? 'var(--accent-success)' : 'var(--text-muted)', fontSize: '1.25rem', fontWeight: 900 }}>
            {isLive ? 'LIVE' : 'STANDBY'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase' }}>race control</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '0.8rem', border: '1px solid var(--border-light)', borderRadius: 8, color: 'var(--text-secondary)' }}>
          Loading live telemetry packet...
        </div>
      ) : null}

      {error ? (
        <div style={{ display: 'flex', gap: '0.55rem', padding: '0.8rem', border: '1px solid rgba(234, 51, 35, 0.35)', borderRadius: 8, color: 'var(--text-secondary)', background: 'rgba(234, 51, 35, 0.08)' }}>
          <AlertTriangle size={16} color="var(--accent-f1)" />
          <span>{error}</span>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))', gap: '0.55rem' }}>
        <MetricTile icon={<Gauge size={13} />} label="Track" value={formatValue(weather?.track_temperature, ' C')} />
        <MetricTile icon={<Timer size={13} />} label="Air" value={formatValue(weather?.air_temperature, ' C')} />
        <MetricTile icon={<Droplets size={13} />} label="Humidity" value={formatValue(weather?.humidity, '%')} />
        <MetricTile icon={<CloudRain size={13} />} label="Rainfall" value={formatValue(weather?.rainfall, '')} />
        <MetricTile icon={<Wind size={13} />} label="Wind" value={formatValue(weather?.wind_speed, ' m/s')} />
        <MetricTile icon={<Flag size={13} />} label="Flag" value={intelligence?.track_status ?? '--'} />
      </div>

      <div style={{ border: '1px solid rgba(21, 209, 204, 0.22)', borderRadius: 8, overflow: 'hidden', background: 'rgba(4, 10, 14, 0.42)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '42px 1fr 72px 62px' : '42px 1.2fr 1fr 80px 70px 80px 72px', gap: '0.45rem', padding: '0.55rem 0.7rem', color: 'var(--text-muted)', fontSize: '0.66rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)' }}>
          <span>Pos</span>
          <span>Driver</span>
          {!compact && <span>Team</span>}
          <span>Tyre</span>
          <span>Age</span>
          {!compact && <span>Last lap</span>}
          {!compact && <span>Pits</span>}
        </div>
        {drivers.length ? drivers.map((driver) => (
          <div key={driver.driver_number} style={{ display: 'grid', gridTemplateColumns: compact ? '42px 1fr 72px 62px' : '42px 1.2fr 1fr 80px 70px 80px 72px', gap: '0.45rem', alignItems: 'center', padding: '0.55rem 0.7rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
            <strong style={{ color: 'var(--accent-cyan)' }}>{driver.position ?? '--'}</strong>
            <div style={{ minWidth: 0 }}>
              <strong>{driver.code}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{driver.name}</div>
            </div>
            {!compact && <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{driver.team}</span>}
            <strong style={{ color: compoundTone(driver.compound) }}>{driver.compound ?? '--'}</strong>
            <span>{driver.tyre_age_laps !== null ? `${driver.tyre_age_laps}L` : '--'}</span>
            {!compact && <span>{formatLapTime(driver.last_lap_time)}</span>}
            {!compact && <span>{driver.pit_stops}</span>}
          </div>
        )) : (
          <div style={{ padding: '0.85rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Live driver tyre, pit-stop, and lap-age rows will populate when OpenF1 publishes Miami session data.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.15fr 0.85fr', gap: '0.65rem' }}>
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.75rem', background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.55rem' }}>
            <Radio size={13} />
            <span>Race control / elimination</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.4 }}>
            Drivers: {eliminatedDrivers.length ? eliminatedDrivers.join(', ') : 'none indicated'} / Teams: {eliminatedTeams.length ? eliminatedTeams.join(', ') : 'none indicated'}
          </p>
          {raceControl.length ? (
            <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.6rem' }}>
              {raceControl.map((message, index) => (
                <div key={`${message.message}-${index}`} style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', lineHeight: 1.35 }}>
                  {message.lap_number ? `L${message.lap_number} ` : ''}{message.flag ? `[${message.flag}] ` : ''}{message.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ border: '1px solid rgba(244, 180, 0, 0.26)', borderRadius: 8, padding: '0.75rem', background: 'rgba(244, 180, 0, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#f4b400', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.55rem' }}>
            <BatteryWarning size={13} />
            <span>2026 battery / ERS</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.4 }}>
            {intelligence?.battery.note ?? 'OpenF1 does not expose ERS or battery state in the public feed used by this dashboard.'}
          </p>
        </div>
      </div>

      {intelligence?.data_notes.length ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.4 }}>
          {intelligence.data_notes[0]}
        </div>
      ) : null}
    </section>
  );
}
