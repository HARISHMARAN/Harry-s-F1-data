import type { DashboardSession } from '../types/f1';
import { buildTrackPath, generateTrackPoints, normalizeTrack } from '../services/trackLayout';

interface TrackBackdropProps {
  session: DashboardSession | null;
}

export default function TrackBackdrop({ session }: TrackBackdropProps) {
  const seed = `${session?.circuit_short_name ?? session?.location ?? 'circuit'}-${session?.session_key ?? ''}`;
  const points = normalizeTrack(generateTrackPoints(seed));
  const trackPath = buildTrackPath(points);
  const circuitLabel = session?.circuit_short_name ?? session?.location ?? 'Circuit Layout';
  const raceLabel = session?.session_name ?? 'Race Context';
  const startPoint = points[0] ?? { x: 0, y: 0 };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        opacity: 0.88,
        background:
          'radial-gradient(circle at 20% 15%, rgba(21, 209, 204, 0.14), transparent 28%), radial-gradient(circle at 80% 10%, rgba(234, 51, 35, 0.08), transparent 22%), linear-gradient(135deg, rgba(8, 10, 14, 0.98), rgba(12, 16, 22, 0.94) 45%, rgba(6, 8, 12, 0.98))',
      }}
    >
      <svg viewBox="0 0 860 560" style={{ width: '100%', height: '100%' }} aria-hidden>
        <defs>
          <linearGradient id="trackBackdropGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 240, 255, 0.06)" />
            <stop offset="50%" stopColor="rgba(0, 240, 255, 0.18)" />
            <stop offset="100%" stopColor="rgba(0, 240, 255, 0.06)" />
          </linearGradient>
        </defs>
        <g opacity="0.42">
          <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="30" />
          <path d={trackPath} fill="none" stroke="url(#trackBackdropGlow)" strokeWidth="8" strokeLinecap="round" />
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
            strokeDasharray="4 16"
            strokeLinecap="round"
          />
        </g>
        <line
          x1={startPoint.x - 12}
          y1={startPoint.y}
          x2={startPoint.x + 12}
          y2={startPoint.y}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={startPoint.x} cy={startPoint.y} r="3.5" fill="rgba(255,255,255,0.85)" />
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
        {session?.location ? `${session.location} Circuit` : circuitLabel}
      </div>
      <div
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          padding: '0.6rem 0.9rem',
          borderRadius: '999px',
          background: 'rgba(8, 8, 10, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-secondary)',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {raceLabel} / Sectors / Grid / Pit Lane
      </div>
    </div>
  );
}
