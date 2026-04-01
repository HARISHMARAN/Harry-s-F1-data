import { User, Flag, Clock, Gauge, Target } from 'lucide-react';
import type { MaxStats } from '../types/f1';

interface MaxTrackerProps {
  currentPos: number | null;
  gap: string | null;
  stats: MaxStats | null;
}

export default function MaxTracker({ currentPos, gap, stats }: MaxTrackerProps) {
  return (
    <div className="glass-panel" style={{ borderLeft: '4px solid #3671C6' }}>
      <div className="panel-header" style={{ justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <User size={16} color="var(--text-secondary)" />
          <h2 className="panel-title" style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>DRIVER FOCUS</h2>
        </div>
        <div style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
          MAX VERSTAPPEN
        </div>
      </div>
      
      <div style={{ padding: '1.25rem' }}>
        {/* BIG STATUS READOUT */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.25rem' }}>TRACK POSITION</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1 }}>P{currentPos || '--'}</div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.25rem' }}>INTERVAL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>{gap || 'NO DATA'}</div>
           </div>
        </div>

        {/* METRICS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="info-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <Flag size={12} />
              <span className="info-label">START</span>
            </div>
            <span className="info-value" style={{ fontSize: '1rem' }}>{stats?.started || 'P4'}</span>
          </div>

          <div className="info-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <Target size={12} />
              <span className="info-label">STOPS</span>
            </div>
            <span className="info-value" style={{ fontSize: '1rem' }}>{stats?.tyres || '--'}</span>
          </div>

          <div className="info-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <Clock size={12} />
              <span className="info-label">BEST</span>
            </div>
            <span className="info-value" style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
              {stats && stats.best_lap !== '0.00' ? stats.best_lap : '--:--.---'}
            </span>
          </div>

          <div className="info-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <Gauge size={12} />
              <span className="info-label">TOP</span>
            </div>
            <span className="info-value" style={{ fontFamily: 'monospace' }}>
              {stats && stats.top_speed !== '0' ? `${stats.top_speed}` : '---'}<span style={{ fontSize: '0.6rem', marginLeft: '2px' }}>KM/H</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
