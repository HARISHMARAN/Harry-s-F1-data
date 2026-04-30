import type { DashboardSession } from '../types/f1';
import { buildTrackPath, generateTrackPoints, normalizeTrack } from '../services/trackLayout';
import { getTrackSvgForCircuit } from '../services/trackLibrary';

interface TrackBackdropProps {
  session: DashboardSession | null;
}

function removeSmallSvgMarkerPaths(svg: string) {
  return svg.replace(/<path\b[^>]*\bd="([^"]*)"[^>]*\/?>/g, (pathMarkup, pathData: string) => {
    const compactPathLength = pathData.replace(/\s+/g, '').length;
    return compactPathLength < 240 ? '' : pathMarkup;
  });
}

function sanitizeTrackSvg(svg: string) {
  return removeSmallSvgMarkerPaths(svg)
    .replace(/<metadata\b[\s\S]*?<\/metadata>/gi, '')
    .replace(/<defs\b[\s\S]*?<\/defs>/gi, '')
    .replace(/<g\b[^>]*\baria-label="[^"]*"[^>]*>[\s\S]*?<\/g>/gi, '')
    .replace(/<circle\b[^>]*\/?>/gi, '')
    .replace(/<text\b[\s\S]*?<\/text>/gi, '')
    .replace(/<rect\b[^>]*\/?>/gi, '');
}

function styleTrackSvg(svg: string) {
  const sanitizedSvg = sanitizeTrackSvg(svg);
  const styledSvg = sanitizedSvg.replace(
    '<svg ',
    '<svg class="track-asset-svg" preserveAspectRatio="xMidYMid meet" ',
  );

  return `
    <style>
      .track-asset-shell {
        width: 100%;
        height: 100%;
        display: block;
      }
      .track-asset-svg {
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
      }
      .track-asset-svg path {
        fill: none !important;
        stroke: rgba(21, 209, 204, 0.9) !important;
        stroke-width: 3.4 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        stroke-dasharray: none !important;
        vector-effect: non-scaling-stroke;
      }
      .track-asset-svg path:first-of-type {
        stroke: rgba(255, 255, 255, 0.2) !important;
        stroke-width: 18 !important;
      }
      .track-asset-svg path:nth-of-type(2) {
        stroke: rgba(234, 51, 35, 0.65) !important;
        stroke-width: 7 !important;
      }
      .track-asset-svg rect,
      .track-asset-svg circle,
      .track-asset-svg text,
      .track-asset-svg [aria-label],
      .track-asset-svg metadata,
      .track-asset-svg pattern,
      .track-asset-svg clipPath,
      .track-asset-svg defs {
        display: none !important;
      }
    </style>
    <div class="track-asset-shell">${styledSvg}</div>
  `;
}

export default function TrackBackdrop({ session }: TrackBackdropProps) {
  const seed = `${session?.circuit_short_name ?? session?.location ?? 'circuit'}-${session?.session_key ?? ''}`;
  const points = normalizeTrack(generateTrackPoints(seed));
  const trackPath = buildTrackPath(points);
  const circuitLabel = session?.circuit_short_name ?? session?.location ?? 'Circuit Layout';
  const raceLabel = session?.session_name ?? 'Race Context';
  const startPoint = points[0] ?? { x: 0, y: 0 };
  const trackSvg = getTrackSvgForCircuit(`${session?.circuit_short_name ?? ''} ${session?.location ?? ''} ${session?.country_name ?? ''}`);
  const trackSvgMarkup = trackSvg ? styleTrackSvg(trackSvg) : null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        opacity: 0.92,
        background:
          'radial-gradient(circle at 22% 16%, rgba(21, 209, 204, 0.18), transparent 30%), radial-gradient(circle at 78% 12%, rgba(234, 51, 35, 0.12), transparent 22%), linear-gradient(135deg, rgba(7, 10, 14, 0.98), rgba(12, 17, 24, 0.94) 46%, rgba(5, 8, 12, 0.98))',
      }}
    >
      {trackSvgMarkup ? (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(21, 209, 204, 0.055) 48%, transparent 100%)',
              maskImage: 'linear-gradient(180deg, transparent 0%, black 22%, black 74%, transparent 100%)',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '5vh 4vw 6vh',
              opacity: 0.78,
              filter: 'drop-shadow(0 0 24px rgba(21, 209, 204, 0.7)) drop-shadow(0 0 80px rgba(0, 147, 204, 0.3))',
              mixBlendMode: 'screen',
            }}
            dangerouslySetInnerHTML={{ __html: trackSvgMarkup }}
          />
        </>
      ) : (
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
        </svg>
      )}
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
        {raceLabel} / {trackSvgMarkup ? 'Circuit Asset' : 'Generated Layout'} / Sectors / Grid / Pit Lane
      </div>
    </div>
  );
}
