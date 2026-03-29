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
      <div className="glass-panel col-span-8">
        <div className="panel-header">
          <Trophy size={18} color="var(--accent-f1)" />
          <h2 className="panel-title">Live Timing & Intervals</h2>
        </div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
          NO TIMING DATA AVAILABLE FOR THIS SESSION.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel col-span-8">
      <div className="panel-header">
        <Trophy size={18} color="var(--accent-f1)" />
        <h2 className="panel-title">Live Timing & Intervals</h2>
      </div>
      
      <div className="timing-table-wrapper">
        <table className="timing-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>POS</th>
              <th>DRIVER</th>
              <th>TEAM</th>
              <th style={{ textAlign: 'right' }}>INTERVAL</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name_acronym} className="timing-row">
                <td className="pos-column">{row.position}</td>
                <td>
                  <div className="driver-info">
                    <div 
                      className="color-bar" 
                      style={{ backgroundColor: row.team_colour }} 
                    />
                    <span className="driver-no">{row.driver_number}</span>
                    <span className="driver-name">{row.full_name}</span>
                  </div>
                </td>
                <td>
                  <span className="team-name">{row.team_name}</span>
                </td>
                <td className={`time-column ${row.date === 'LEADER' ? 'time-leader' : 'time-val'}`}>
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
