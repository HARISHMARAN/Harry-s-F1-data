import { Trophy } from 'lucide-react';
import type { DriverPosition } from '../types/f1';

interface LiveTimingProps {
  data: DriverPosition[];
  title?: string;
}

export default function LiveTiming({ data, title = "Live Timing & Intervals" }: LiveTimingProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel col-span-8">
        <div className="panel-header">
          <Trophy size={18} color="var(--accent-f1)" />
          <h2 className="panel-title">{title}</h2>
        </div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          NO TIMING DATA AVAILABLE FOR THIS SESSION.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ height: '100%' }}>
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Trophy size={16} color="var(--accent-f1)" />
          <h2 className="panel-title">{title}</h2>
        </div>
        <div className="live-indicator" style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', background: 'rgba(21, 209, 204, 0.1)', borderColor: 'rgba(21, 209, 204, 0.2)' }}>
           <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '1px' }}>INTERVALS</span>
        </div>
      </div>
      
      <div className="timing-table-wrapper">
        <table className="timing-table">
          <thead>
            <tr>
              <th style={{ width: '50px', paddingLeft: '1.25rem' }}>P</th>
              <th>DRIVER / PERFORMANCE</th>
              <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>GAP/INT</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name_acronym} className="timing-row">
                <td className="pos-column" style={{ paddingLeft: '1.25rem' }}>{row.position}</td>
                <td>
                  <div className="driver-info">
                    <div 
                      className="color-bar" 
                      style={{ backgroundColor: row.team_colour, width: '3px', height: '32px' }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span className="driver-name" style={{ fontSize: '0.9rem' }}>{row.name_acronym}</span>
                        <span className="team-name" style={{ fontSize: '0.7rem', opacity: 0.6 }}>{row.team_name}</span>
                      </div>
                      {/* Real Performance Track Integration */}
                      <div className="perf-track">
                         <div className="perf-fill" style={{ width: `${100 - (row.position * 2)}%` }} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`time-column ${row.date === 'LEADER' ? 'time-leader' : 'gap-cyan'}`} style={{ paddingRight: '1.25rem' }}>
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
