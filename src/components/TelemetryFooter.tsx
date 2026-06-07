"use client";

import type { DashboardSession } from '../types/f1';

interface TelemetryFooterProps {
  session: DashboardSession | null;
  isLive: boolean;
  isPulsing: boolean;
}

export default function TelemetryFooter({ session, isLive, isPulsing }: TelemetryFooterProps) {
  return (
    <footer className="telemetry-footer">
      <div className="telemetry-status">
        <div className="status-item">
          <div className={`status-indicator ${isPulsing ? 'pulse' : ''}`} />
          <span>{session?.session_name ?? 'INITIALIZING...'}</span>
        </div>
        <div className="status-item">
          <span>{isLive ? `LAP ${session?.current_lap ?? '--'}/71` : 'NO LIVE LAPS'}</span>
        </div>
        <div className="status-item">
          <span>LOC: {session?.location ?? 'TRACKSIDE'}</span>
        </div>
        <div className="status-item">
          <span style={{ color: isLive ? 'var(--accent-success)' : 'var(--accent-f1)' }}>
            {isLive ? 'LIVE' : 'TRACK CLEAR'}
          </span>
        </div>
      </div>
      <div className="pipeline-info" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <span>EXPORT TELEMETRY</span>
      </div>
    </footer>
  );
}
