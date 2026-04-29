import { Sparkles, Activity, Clock } from 'lucide-react';

interface HeaderProps {
  sessionName?: string;
  isLive?: boolean;
}

export default function Header({ sessionName = "Latest Session", isLive = false }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-title-wrapper">
        <div className="f1-badge">
          <span>F1</span>
        </div>
        <div className="header-copy">
          <span className="header-eyebrow">Pit Wall Command Center</span>
          <h1 className="header-main-title">{sessionName} Dashboard</h1>
          <p className="header-subtitle">Race telemetry, strategy signals, and live command flow</p>
        </div>
      </div>
      <div className="header-right">
        {isLive && (
          <div className="live-indicator">
            <div className="pulsing-dot" />
            LIVE
          </div>
        )}
        <div className="header-metrics">
          <span className="metric-pill">
            <Activity size={15} className="metric-icon" />
            Race Ops
          </span>
          <span className="metric-pill">
            <Clock size={15} className="metric-icon" />
            Real-time
          </span>
          <span className="metric-pill">
            <Sparkles size={15} className="metric-icon" />
            Strategy Layer
          </span>
        </div>
      </div>
    </div>
  );
}
