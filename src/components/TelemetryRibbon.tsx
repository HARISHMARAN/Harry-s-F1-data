"use client";

import type { DashboardSession } from '../types/f1';

interface TelemetryRibbonProps {
  session: DashboardSession | null;
  viewMode: 'LIVE' | 'HISTORICAL' | 'REPLAY' | 'CHAT' | 'PREDICTIONS' | 'NEWS';
  live: boolean;
  signalLabel?: string;
}

const PHASE_LABELS: Record<string, string> = {
  LIVE: 'LIVE RUN',
  HISTORICAL: 'ARCHIVE',
  REPLAY: 'REPLAY',
  CHAT: 'AI CHAT',
  PREDICTIONS: 'PREDICT',
  NEWS: 'NEWS',
};

export default function TelemetryRibbon({ session, viewMode, live, signalLabel = 'SIGNAL: NOMINAL' }: TelemetryRibbonProps) {
  const circuit = session?.circuit_short_name ?? '---';
  const venue   = session?.location ?? '---';
  const phase   = PHASE_LABELS[viewMode] ?? viewMode;
  const sessionType = session?.session_type ?? '---';

  const monoFont = "'JetBrains Mono', monospace";

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
      padding: '0.42rem 0.85rem',
      borderRadius: 8,
      background: 'rgba(6, 11, 18, 0.85)',
      border: '1px solid rgba(0, 212, 224, 0.12)',
      borderBottom: '1px solid rgba(0, 212, 224, 0.06)',
      flexWrap: 'wrap',
    }}>
      {/* Left: signal + data chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Signal badge */}
        <span style={{
          padding: '0.22rem 0.55rem',
          borderRadius: 4,
          background: live ? 'rgba(232, 0, 45, 0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${live ? 'rgba(232,0,45,0.3)' : 'rgba(255,255,255,0.07)'}`,
          color: live ? '#ff6055' : 'var(--text-muted)',
          fontFamily: monoFont,
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}>
          {live && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e8002d', boxShadow: '0 0 6px rgba(232,0,45,0.7)', display: 'inline-block', animation: 'status-pulse 2s infinite' }} />}
          {signalLabel}
        </span>

        {/* Divider */}
        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)' }} />

        {/* Data chips */}
        {[
          { label: 'CIRCUIT', value: circuit },
          { label: 'VENUE',   value: venue },
          { label: 'SESSION', value: sessionType },
        ].map(({ label, value }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontFamily: monoFont, fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {label}
            </span>
            <span style={{ fontFamily: monoFont, fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {value}
            </span>
            <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.07)', marginLeft: '0.3rem' }} />
          </span>
        ))}
      </div>

      {/* Right: phase badge */}
      <span style={{
        padding: '0.22rem 0.65rem',
        borderRadius: 4,
        background: live ? 'rgba(232, 0, 45, 0.1)' : 'rgba(0, 212, 224, 0.08)',
        border: `1px solid ${live ? 'rgba(232,0,45,0.25)' : 'rgba(0,212,224,0.2)'}`,
        color: live ? '#ff8070' : 'var(--accent-cyan)',
        fontFamily: monoFont,
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        {phase}
      </span>
    </div>
  );
}
