import type { DashboardSession } from '../types/f1';
import { buildTrackPath, getTrackPointsForCircuit, normalizeTrack } from '../services/trackLayout';

interface TrackBackdropProps {
  session: DashboardSession | null;
}

export default function TrackBackdrop({ session }: TrackBackdropProps) {
  const seed = `${session?.circuit_short_name ?? session?.location ?? 'circuit'}-${session?.session_key ?? ''}`;
  const points = normalizeTrack(getTrackPointsForCircuit(seed));
  const trackPath = buildTrackPath(points);
  const sectors = points.length >= 3
    ? [points.slice(0, Math.floor(points.length / 3)), points.slice(Math.floor(points.length / 3), Math.floor((points.length * 2) / 3)), points.slice(Math.floor((points.length * 2) / 3))]
    : [];
  const startPoint = points[0] ?? { x: 0, y: 0 };

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
        <g opacity="0.35">
          {sectors.map((sector, index) => {
            const point = sector[Math.floor(sector.length / 2)] ?? points[0];
            const colors = ['rgba(234,51,35,0.2)', 'rgba(21,209,204,0.16)', 'rgba(0,210,190,0.16)'];
            return point ? (
              <g key={index}>
                <circle cx={point.x} cy={point.y} r="46" fill={colors[index] ?? 'rgba(255,255,255,0.06)'} />
                <text x={point.x} y={point.y + 4} textAnchor="middle" fill="rgba(255,255,255,0.65)" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em' }}>
                  S{index + 1}
                </text>
              </g>
            ) : null;
          })}
        </g>
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="26" />
        <path d={trackPath} fill="none" stroke="url(#trackBackdropGlow)" strokeWidth="6" strokeLinecap="round" />
        <line x1={startPoint.x - 16} y1={startPoint.y - 16} x2={startPoint.x + 16} y2={startPoint.y + 16} stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
        <line x1={startPoint.x + 16} y1={startPoint.y - 16} x2={startPoint.x - 16} y2={startPoint.y + 16} stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
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
        Sectors / Grid / Pit Lane
      </div>
    </div>
  );
}
