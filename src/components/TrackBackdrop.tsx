import type { DashboardSession } from '../types/f1';
import { buildTrackPath, getTrackPointsForCircuit, normalizeTrack } from '../services/trackLayout';

interface TrackBackdropProps {
  session: DashboardSession | null;
}

export default function TrackBackdrop({ session }: TrackBackdropProps) {
  const seed = `${session?.circuit_short_name ?? session?.location ?? 'circuit'}-${session?.session_key ?? ''}`;
  const points = normalizeTrack(getTrackPointsForCircuit(seed));
  const trackPath = buildTrackPath(points);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.85 }}>
      <svg viewBox="0 0 860 560" style={{ width: '100%', height: '100%' }} aria-hidden>
        <defs>
          <linearGradient id="trackBackdropGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 240, 255, 0.1)" />
            <stop offset="50%" stopColor="rgba(0, 240, 255, 0.35)" />
            <stop offset="100%" stopColor="rgba(0, 240, 255, 0.1)" />
          </linearGradient>
        </defs>
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="26" />
        <path d={trackPath} fill="none" stroke="url(#trackBackdropGlow)" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '2rem',
          padding: '0.6rem 1rem',
          borderRadius: '999px',
          background: 'rgba(8, 8, 10, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-secondary)',
          fontSize: '0.75rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {session?.location ? `${session.location} Circuit` : 'Circuit Layout'}
      </div>
    </div>
  );
}
