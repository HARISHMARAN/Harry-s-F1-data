"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BarChart3, CalendarDays, Gauge, Timer, Trophy } from 'lucide-react';
import { fetchLatestCompletedRaceSummary, type CompletedRaceSummary } from '../services/jolpica';
import { fetchPredictionForecast, type PredictionForecastResponse } from '../services/predictionsApi';
import type { DashboardSession } from '../types/f1';

type NextRaceIntelligenceProps = {
  nextSession: DashboardSession | null;
  compact?: boolean;
};

const FALLBACK_NEXT_RACE = 'Miami Grand Prix';
const GENERIC_SESSION_NAMES = new Set(['', 'Race', 'NO LIVE SESSION', 'TELEMETRY OFFLINE']);

function formatSchedule(value?: string) {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule pending';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRaceDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getSessionYear(nextSession: DashboardSession | null) {
  if (nextSession?.date_start) {
    const date = new Date(nextSession.date_start);
    if (!Number.isNaN(date.getTime())) return date.getUTCFullYear();
  }

  return new Date().getUTCFullYear();
}

function StatLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default function NextRaceIntelligence({ nextSession, compact = false }: NextRaceIntelligenceProps) {
  const [raceSummary, setRaceSummary] = useState<CompletedRaceSummary | null>(null);
  const [forecast, setForecast] = useState<PredictionForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nextRaceName = nextSession?.session_name && !GENERIC_SESSION_NAMES.has(nextSession.session_name)
    ? nextSession.session_name
    : FALLBACK_NEXT_RACE;
  const nextRaceYear = useMemo(() => getSessionYear(nextSession), [nextSession]);

  useEffect(() => {
    let cancelled = false;

    async function loadIntelligence() {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, forecastData] = await Promise.all([
          fetchLatestCompletedRaceSummary(),
          fetchPredictionForecast({ grandPrix: nextRaceName, year: nextRaceYear }),
        ]);

        if (!cancelled) {
          setRaceSummary(summaryData);
          setForecast(forecastData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load next race intelligence');
          setRaceSummary(null);
          setForecast(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadIntelligence();

    return () => {
      cancelled = true;
    };
  }, [nextRaceName, nextRaceYear]);

  const panelWidth = compact ? '100%' : '430px';

  return (
    <section style={{ width: panelWidth, maxWidth: '100%', display: 'grid', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div>
          <StatLabel icon={<CalendarDays size={14} />} label="Next upcoming race" />
          <h2 style={{ margin: '0.25rem 0 0', fontSize: compact ? '1.15rem' : '1.35rem', lineHeight: 1.15 }}>
            {nextRaceName}
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            {nextSession?.location ? `${nextSession.location}, ${nextSession.country_name}` : 'Miami Gardens, United States'} - {formatSchedule(nextSession?.date_start)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--accent-cyan)', fontWeight: 900, fontSize: '1.2rem' }}>
            {forecast ? `${forecast.confidence}%` : '--'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>model confidence</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: 8, color: 'var(--text-secondary)' }}>
          Loading race intelligence...
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: '0.85rem', border: '1px solid rgba(234, 51, 35, 0.35)', borderRadius: 8, color: 'var(--text-secondary)', background: 'rgba(234, 51, 35, 0.08)' }}>
          {error}
        </div>
      ) : null}

      {raceSummary ? (
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
            <StatLabel icon={<Trophy size={14} />} label={`Previous race: ${raceSummary.raceName}`} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{formatRaceDate(raceSummary.date)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '0.55rem' }}>
            {raceSummary.podium.map((driver) => (
              <div key={driver.code} style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.7rem', background: 'rgba(255,255,255,0.045)' }}>
                <div style={{ color: 'var(--accent-f1)', fontWeight: 900, fontSize: '0.78rem' }}>P{driver.position}</div>
                <div style={{ marginTop: '0.2rem', fontWeight: 900, fontSize: '1.05rem' }}>{driver.code}</div>
                <div style={{ marginTop: '0.15rem', color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.25 }}>{driver.fullName}</div>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid rgba(21, 209, 204, 0.25)', borderRadius: 8, padding: '0.75rem', background: 'rgba(21, 209, 204, 0.08)' }}>
            <StatLabel icon={<Timer size={14} />} label="Fastest lap" />
            {raceSummary.fastestLap ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline', marginTop: '0.35rem' }}>
                <strong style={{ fontSize: '1.05rem' }}>{raceSummary.fastestLap.code} - {raceSummary.fastestLap.time}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  {raceSummary.fastestLap.lap ? `Lap ${raceSummary.fastestLap.lap}` : raceSummary.fastestLap.teamName}
                </span>
              </div>
            ) : (
              <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>Fastest lap unavailable from source.</div>
            )}
          </div>
        </div>
      ) : null}

      {forecast ? (
        <div style={{ border: '1px solid rgba(0, 147, 204, 0.3)', borderRadius: 8, padding: '0.85rem', background: 'rgba(0, 147, 204, 0.08)', display: 'grid', gap: '0.65rem' }}>
          <StatLabel icon={<BarChart3 size={14} />} label="Miami GP prediction" />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Projected winner</div>
              <strong style={{ display: 'block', marginTop: '0.25rem', fontSize: '1.35rem' }}>{forecast.winner}</strong>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Projected podium</div>
              <strong style={{ display: 'block', marginTop: '0.25rem' }}>{forecast.podium.join(' > ')}</strong>
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: '0.82rem' }}>{forecast.narrative}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <Gauge size={13} />
            <span>{forecast.matchedBy}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
