import { Sparkles, Activity, Clock } from 'lucide-react';
import React from 'react';

interface HeaderProps {
  sessionName?: string;
  isLive?: boolean;
}

export default function Header({ sessionName = "Latest Session", isLive = false }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-title-wrapper">
        <div className="f1-badge">F1</div>
        <h1>{sessionName} Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        {isLive && (
          <div className="live-indicator">
            <div className="pulsing-dot" />
            LIVE
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Activity size={18} />
          <Clock size={18} />
          <Sparkles size={18} />
        </div>
      </div>
    </div>
  );
}
