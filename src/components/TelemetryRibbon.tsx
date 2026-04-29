import type { DashboardSession } from '../types/f1';

interface TelemetryRibbonProps {
  session: DashboardSession | null;
  viewMode: 'LIVE' | 'HISTORICAL' | 'REPLAY' | 'ADDONS' | 'CHAT' | 'PREDICTIONS';
  live: boolean;
  signalLabel?: string;
}

function RibbonChip({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'red' | 'cyan' }) {
  const colors = {
    default: { fg: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border-light)' },
    green: { fg: '#00d2be', bg: 'rgba(0,210,190,0.12)', border: 'rgba(0,210,190,0.28)' },
    red: { fg: '#ea3323', bg: 'rgba(234,51,35,0.12)', border: 'rgba(234,51,35,0.28)' },
    cyan: { fg: '#15d1cc', bg: 'rgba(21,209,204,0.12)', border: 'rgba(21,209,204,0.28)' },
  } as const;

  const color = colors[tone];

  return (
    <div style={{
      minWidth: 104,
      padding: '0.42rem 0.65rem',
      borderRadius: 12,
      background: color.bg,
      border: `1px solid ${color.border}`,
      display: 'grid',
      gap: '0.08rem',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <strong style={{ color: color.fg, fontSize: '0.8rem' }}>{value}</strong>
    </div>
  );
}

export default function TelemetryRibbon({ session, viewMode, live, signalLabel = 'SIGNAL: NOMINAL' }: TelemetryRibbonProps) {
  const circuit = session?.circuit_short_name ?? 'TRACKSIDE';
  const venue = session?.location ?? 'OPENF1';
  const phase = viewMode === 'LIVE' ? 'LIVE RUN' : viewMode === 'HISTORICAL' ? 'ARCHIVE' : viewMode === 'REPLAY' ? 'REPLAY' : viewMode.toUpperCase();

  return (
    <div style={{
      display: 'grid',
      gap: '0.55rem',
      margin: '0.15rem 0 0.7rem',
      padding: '0.7rem 0.85rem',
      borderRadius: 16,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
      border: '1px solid var(--border-light)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 999,
            background: live ? 'rgba(234,51,35,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${live ? 'rgba(234,51,35,0.28)' : 'var(--border-light)'}`,
            color: live ? 'var(--accent-f1)' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 900,
          }}>
            {signalLabel}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            PIT WALL / TELEMETRY LAYER
          </span>
        </div>

        <span style={{
          padding: '0.45rem 0.75rem',
          borderRadius: 999,
          background: 'rgba(21,209,204,0.08)',
          border: '1px solid rgba(21,209,204,0.22)',
          color: 'var(--accent-cyan)',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 900,
        }}>
          {phase}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
        <RibbonChip label="Circuit" value={circuit} tone="cyan" />
        <RibbonChip label="Venue" value={venue} />
        <RibbonChip label="Mode" value={viewMode} tone={live ? 'green' : 'default'} />
        <RibbonChip label="Status" value={live ? 'TRACK LIVE' : 'TRACK CLEAR'} tone={live ? 'green' : 'red'} />
      </div>

    </div>
  );
}
