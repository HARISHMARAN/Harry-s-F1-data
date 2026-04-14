import { Sparkles, Activity, Clock } from 'lucide-react';

interface HeaderProps {
  sessionName?: string;
  isLive?: boolean;
}

export default function Header({ sessionName = "Latest Session", isLive = false }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-title-wrapper">
        <div className="f1-badge">F1</div>
        <div style={{ display: 'grid', gap: '0.15rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
            Pit Wall Command Center
          </span>
          <h1>{sessionName} Dashboard</h1>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isLive && (
          <div className="live-indicator">
            <div className="pulsing-dot" />
            LIVE
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Race Ops
          </span>
          <Activity size={18} />
          <Clock size={18} />
          <Sparkles size={18} />
        </div>
      </div>
    </div>
  );
}
