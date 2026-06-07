"use client";

interface HeaderProps {
  sessionName?: string;
  isLive?: boolean;
}

export default function Header({ sessionName = "PITWALL", isLive = false }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-title-wrapper">
        <div className="f1-badge">
          <span>F1</span>
        </div>
        <div className="header-copy">
          <span className="header-eyebrow">Harry's Pit Wall</span>
          <h1 className="header-main-title">{sessionName}</h1>
          <p className="header-subtitle">Race Telemetry Command Centre</p>
        </div>
      </div>

      <div className="header-right">
        {isLive ? (
          <div className="live-indicator">
            <div className="pulsing-dot" />
            <span className="live-text">LIVE</span>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.75rem',
            borderRadius: 999,
            border: '1px solid rgba(78, 98, 120, 0.4)',
            background: 'rgba(78, 98, 120, 0.08)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em' }}>
              TRACK CLEAR
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
