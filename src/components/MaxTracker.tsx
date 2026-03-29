import { Target, Flag, Clock, Gauge, History } from 'lucide-react';
import type { MaxStats } from '../types/f1';

interface MaxTrackerProps {
  currentPos: number | null;
  gap: string | null;
  stats: MaxStats | null;
}

export default function MaxTracker({ currentPos, gap, stats }: MaxTrackerProps) {
  return (
    <div className="glass-panel" style={{ overflow: 'hidden', borderTop: '4px solid #3671C6' }}>
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Target size={20} color="#3671C6" />
          <h2 className="panel-title" style={{ color: '#ffffff' }}>VERSTAPPEN TRACKER</h2>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
          33
        </div>
      </div>
      
      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Current Status Block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2', background: 'rgba(54, 113, 198, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(54, 113, 198, 0.2)' }}>
          <div style={{ fontSize: '0.75rem', color: '#8c8c94', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Live Track Position
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              P{currentPos || '--'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#3671C6', fontFamily: 'monospace' }}>
              {gap || 'NO DATA'}
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="info-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8c8c94' }}>
            <Flag size={14} />
            <span className="info-label">Grid Start</span>
          </div>
          <span className="info-value" style={{ color: '#ffffff' }}>
            {stats?.started || 'P4'}
          </span>
        </div>

        <div className="info-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8c8c94' }}>
            <History size={14} />
            <span className="info-label">Pit Stops</span>
          </div>
          <span className="info-value" style={{ color: '#ffffff', fontSize: '0.9rem' }}>
            {stats?.tyres || 'RESTRICTED API'}
          </span>
        </div>

        <div className="info-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8c8c94' }}>
            <Clock size={14} />
            <span className="info-label">Best Lap</span>
          </div>
          <span className="info-value" style={{ color: '#00d2be', fontFamily: 'monospace' }}>
            {stats && stats.best_lap !== '0.00' ? stats.best_lap : '--:--.---'}
          </span>
        </div>

        <div className="info-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8c8c94' }}>
            <Gauge size={14} />
            <span className="info-label">Top Speed (ST)</span>
          </div>
          <span className="info-value" style={{ color: '#ffffff', fontFamily: 'monospace' }}>
            {stats && stats.top_speed !== '0' ? `${stats.top_speed} km/h` : '---'}
          </span>
        </div>

      </div>
    </div>
  );
}
