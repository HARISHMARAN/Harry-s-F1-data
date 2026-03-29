import React from 'react';
import { Trophy } from 'lucide-react';

interface DriverPosition {
  position: number;
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  date: string;
}

interface LiveTimingProps {
  data: DriverPosition[];
}

export default function LiveTiming({ data }: LiveTimingProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-panel col-span-8 p-6" style={{ padding: '24px' }}>
        <h2 className="card-title">
          <Trophy size={20} />
          Live Timing & Positions
        </h2>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          No timing data available for this session.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel col-span-8" style={{ padding: '24px' }}>
      <h2 className="card-title">
        <Trophy size={20} />
        Live Timing & Positions
      </h2>
      
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th>TEAM</th>
              <th style={{ textAlign: 'right' }}>LAST UPDATE</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row) => (
              <tr key={row.driver_number}>
                <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {row.position}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '4px', 
                        height: '16px', 
                        backgroundColor: row.team_colour,
                        borderRadius: '2px'
                      }} 
                    />
                    <span className="driver-number">{row.driver_number}</span>
                    <span className="driver-name">{row.full_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      ({row.name_acronym})
                    </span>
                  </div>
                </td>
                <td>
                  <span className="driver-team">{row.team_name}</span>
                </td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {new Date(row.date).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
