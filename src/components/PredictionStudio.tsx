"use client";

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CalendarRange, RefreshCw } from 'lucide-react';
import { fetchLiveDashboardData } from '../services/openf1';
import { fetchPredictionForecast, getPredictionSourceLabel, type PredictionForecastResponse } from '../services/predictionsApi';

type PredictionFormState = {
  grandPrix: string;
  year: string;
};

const pillStyle: CSSProperties = {
  borderRadius: 999,
  border: '1px solid var(--border-light)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text-primary)',
  padding: '0.7rem 1rem',
  fontWeight: 700,
  cursor: 'pointer',
};

function SourceChip({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: '0.35rem 0.7rem',
        borderRadius: 999,
        border: '1px solid var(--border-light)',
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)',
        fontSize: '0.75rem',
      }}
    >
      {label}
    </span>
  );
}

export default function PredictionStudio() {
  const [form, setForm] = useState<PredictionFormState>({ grandPrix: '', year: '' });
  const [forecast, setForecast] = useState<PredictionForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextLabel, setNextLabel] = useState('');
  const [debouncedForm, setDebouncedForm] = useState(form);

  const sourceLabel = useMemo(() => getPredictionSourceLabel(), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const live = await fetchLiveDashboardData().catch(() => null);
        if (cancelled) return;
        const nextSessionName = live?.next_session?.session_name ?? '';
        setNextLabel(nextSessionName);
        setForm({
          grandPrix: nextSessionName,
          year: String(new Date().getUTCFullYear()),
        });
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedForm(form);
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [form]);

  useEffect(() => {
    if (!debouncedForm.grandPrix || bootstrapping) return;

    let cancelled = false;

    async function loadForecast() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPredictionForecast({
          grandPrix: debouncedForm.grandPrix,
          year: debouncedForm.year ? Number(debouncedForm.year) : undefined,
        });
        if (!cancelled) {
          setForecast(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load forecast');
          setForecast(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, [debouncedForm, bootstrapping]);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.4px', fontSize: '0.75rem' }}>
            Prediction Studio
          </p>
          <h2 style={{ margin: '0.4rem 0 0', fontSize: '1.9rem' }}>Master Grand Prix Forecast</h2>
          <p style={{ margin: '0.6rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 760 }}>
            Enter the next Grand Prix and the dashboard will blend OpenF1 live telemetry, Jolpica race history, and the current schedule into a forecast.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'end' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Live Source</span>
          <strong>{sourceLabel}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'minmax(0, 1fr) 120px auto', alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Grand Prix</span>
          <input
            value={form.grandPrix}
            onChange={(e) => setForm((current) => ({ ...current, grandPrix: e.target.value }))}
            placeholder="e.g. Japanese Grand Prix"
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '14px',
              border: '1px solid var(--border-light)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Year</span>
          <input
            value={form.year}
            onChange={(e) => setForm((current) => ({ ...current, year: e.target.value }))}
            inputMode="numeric"
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '14px',
              border: '1px solid var(--border-light)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" style={pillStyle} onClick={() => setForm((current) => ({ ...current, grandPrix: nextLabel }))}>
            <CalendarRange size={16} style={{ display: 'inline', marginRight: '0.45rem' }} />
            Use Next GP
          </button>
          <button
            type="button"
            style={pillStyle}
            onClick={() => setForm({ grandPrix: nextLabel, year: String(new Date().getUTCFullYear()) })}
          >
            <RefreshCw size={16} style={{ display: 'inline', marginRight: '0.45rem' }} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? <div style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>Building forecast...</div> : null}

      {error ? (
        <div style={{ padding: '0.9rem 1rem', borderRadius: '14px', border: '1px solid rgba(234, 51, 35, 0.35)', background: 'rgba(234, 51, 35, 0.08)' }}>
          {error}
        </div>
      ) : null}

      {forecast ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.3rem', background: 'rgba(0, 147, 204, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '1.3px' }}>
                  Forecast Result
                </p>
                <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.8rem' }}>{forecast.raceName}</h3>
                <p style={{ margin: '0.45rem 0 0', color: 'var(--text-secondary)' }}>
                  {forecast.roundLabel} • {forecast.matchedBy}
                </p>
              </div>

              <div style={{ display: 'grid', gap: '0.4rem', minWidth: 180 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Confidence</span>
                <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${forecast.confidence}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #00d4ff, #ea3323)',
                    }}
                  />
                </div>
                <strong>{forecast.confidence}%</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.1rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Projected Winner</div>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, marginTop: '0.25rem' }}>{forecast.winner}</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.1rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Podium</div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                {forecast.podium.map((driver, index) => (
                  <span
                    key={driver}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: 999,
                      border: '1px solid var(--border-light)',
                      background: index === 0 ? 'rgba(234, 51, 35, 0.18)' : 'rgba(255,255,255,0.06)',
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}. {driver}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.1rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Updated</div>
              <div style={{ marginTop: '0.35rem', fontWeight: 700 }}>{new Date(forecast.updatedAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem', display: 'grid', gap: '0.9rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Why this result</div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{forecast.narrative}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {forecast.factors.map((factor) => (
                <SourceChip key={factor} label={factor} />
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem', display: 'grid', gap: '0.75rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Sources Used</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {forecast.sources.map((source) => (
                <SourceChip key={source} label={source} />
              ))}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Data signals: {forecast.dataSignals.latestRaceWinner ? `latest race winner ${forecast.dataSignals.latestRaceWinner}` : 'no latest race'}{' '}
              {forecast.dataSignals.sameRoundWinner ? `• historical winner ${forecast.dataSignals.sameRoundWinner}` : ''}
              {forecast.dataSignals.liveLeader ? `• live leader ${forecast.dataSignals.liveLeader}` : ''}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
