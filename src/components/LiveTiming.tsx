"use client";

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { DriverPosition, SectorDetail } from '../types/f1';
import { formatSessionSchedule } from '../utils/dateFormat';

interface LiveTimingProps {
  data: DriverPosition[];
  title?: string;
  liveStatus?: 'LIVE' | 'NO_RACE';
  raceName?: string | null;
  nextSession?: {
    session_name: string;
    location: string;
    country_name: string;
    date_start: string;
  } | null;
}

type PositionChange = 'up' | 'down' | 'same' | 'new';

function compoundColour(tyre: string | null | undefined): string {
  if (!tyre) return 'var(--text-muted)';
  const t = tyre.toUpperCase();
  if (t.includes('SOFT')) return '#ef4444';
  if (t.includes('MED')) return '#facc15';
  if (t.includes('HARD')) return '#f8fafc';
  if (t.includes('INTER')) return '#22c55e';
  if (t.includes('WET')) return '#38bdf8';
  return 'var(--text-muted)';
}

function compoundLabel(tyre: string | null | undefined): string {
  if (!tyre) return '--';
  const t = tyre.toUpperCase();
  if (t.includes('SOFT')) return 'S';
  if (t.includes('MED')) return 'M';
  if (t.includes('HARD')) return 'H';
  if (t.includes('INTER')) return 'I';
  if (t.includes('WET')) return 'W';
  return tyre.charAt(0).toUpperCase();
}

function PositionBadge({ change }: { change: PositionChange }) {
  if (change === 'up') {
    return (
      <span style={{ color: '#22c55e', fontSize: '0.65rem', fontWeight: 900, marginLeft: 2 }}>▲</span>
    );
  }
  if (change === 'down') {
    return (
      <span style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 900, marginLeft: 2 }}>▼</span>
    );
  }
  return null;
}

export default function LiveTiming({
  data,
  title = 'Live Timing & Intervals',
  liveStatus = 'LIVE',
  raceName = null,
  nextSession = null,
}: LiveTimingProps) {
  // Derived-state-during-render pattern: when data changes we synchronously
  // update snapPrev (the previous snapshot) and positionChanges in the same
  // render pass. React re-renders once with the new state — no effect needed.
  const [snapPrev, setSnapPrev] = useState<DriverPosition[]>([]);
  const [positionChanges, setPositionChanges] = useState<Map<string, PositionChange>>(new Map());

  if (data !== snapPrev) {
    const prevMap = new Map(snapPrev.map((r) => [r.name_acronym, r.position]));
    const changes = new Map<string, PositionChange>();
    data.forEach((row) => {
      const prev = prevMap.get(row.name_acronym);
      if (prev === undefined) changes.set(row.name_acronym, 'new');
      else if (row.position < prev) changes.set(row.name_acronym, 'up');
      else if (row.position > prev) changes.set(row.name_acronym, 'down');
      else changes.set(row.name_acronym, 'same');
    });
    setSnapPrev(data);
    setPositionChanges(changes);
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-panel col-span-8">
        <div className="panel-header">
          <Trophy size={18} color="var(--accent-f1)" />
          <h2 className="panel-title">{title}</h2>
        </div>
        {liveStatus === 'NO_RACE' ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem 2rem', lineHeight: 1.6 }}>
            <div style={{ fontSize: '0.9rem', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
              TRACK CLEAR — NO LIVE SESSION
            </div>
            <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>
              {nextSession ? (
                <>
                  Next up: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{nextSession.session_name}</span>
                  <br />
                  {nextSession.location}, {nextSession.country_name} — {formatSessionSchedule(nextSession.date_start, 'TBD')}
                </>
              ) : (
                'Next race schedule is not available yet.'
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
            NO TIMING DATA AVAILABLE FOR THIS SESSION.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="panel-header" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Trophy size={16} color="var(--accent-f1)" />
          <h2 className="panel-title">{title}</h2>
        </div>
        <div style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', background: 'rgba(21, 209, 204, 0.1)', border: '1px solid rgba(21, 209, 204, 0.2)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '1px' }}>
            {raceName ?? 'LIVE TIMING'}
          </span>
        </div>
      </div>

      <div className="timing-table-wrapper" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <table className="timing-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <th style={{ width: '38px', paddingLeft: '1rem', textAlign: 'left', paddingBottom: '0.4rem' }}>P</th>
              <th style={{ textAlign: 'left', paddingBottom: '0.4rem' }}>DRIVER</th>
              <th style={{ width: '28px', textAlign: 'center', paddingBottom: '0.4rem' }}>TYR</th>
              <th style={{ width: '36px', textAlign: 'center', paddingBottom: '0.4rem' }}>AGE</th>
              <th style={{ width: '80px', textAlign: 'right', paddingBottom: '0.4rem' }}>LAST LAP</th>
              <th style={{ width: '52px', textAlign: 'right', paddingBottom: '0.4rem' }}>S1</th>
              <th style={{ width: '52px', textAlign: 'right', paddingBottom: '0.4rem' }}>S2</th>
              <th style={{ width: '52px', textAlign: 'right', paddingBottom: '0.4rem' }}>S3</th>
              <th style={{ width: '72px', textAlign: 'right', paddingBottom: '0.4rem' }}>GAP</th>
              <th style={{ width: '72px', textAlign: 'right', paddingBottom: '0.4rem' }}>INT</th>
              <th style={{ width: '40px', textAlign: 'right', paddingRight: '1rem', paddingBottom: '0.4rem' }}>PIT</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const change = positionChanges.get(row.name_acronym) ?? 'same';
              const isLeader = row.gap_to_leader === 'LEADER';
              const teamColour = row.team_colour
                ? (row.team_colour.startsWith('#') ? row.team_colour : `#${row.team_colour}`)
                : 'var(--text-muted)';
              const isRetired = row.driver_status === 'RETIRED' || row.driver_status === 'STOPPED';
              const stintTitle = row.stints?.map((s, i) => `Stint ${i + 1}: ${s.compound ?? '?'} × ${s.laps ?? '?'}L${s.new === false ? ' (used)' : ''}`).join('\n')
                ?? row.tyre_stints?.map((s, i) => `Stint ${i + 1}: ${s.compound} × ${s.laps}L`).join(' → ')
                ?? row.tyre;

              return (
                <tr
                  key={row.name_acronym}
                  className="timing-row"
                  style={{
                    borderLeft: change === 'up' ? '2px solid #22c55e' : change === 'down' ? '2px solid #ef4444' : '2px solid transparent',
                    transition: 'border-color 1.5s ease',
                    opacity: isRetired ? 0.45 : 1,
                  }}
                >
                  {/* Position */}
                  <td style={{ paddingLeft: '1rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: isLeader ? 'var(--accent-f1)' : 'var(--text-primary)' }}>
                      {isRetired ? 'OUT' : row.position}
                    </span>
                    <PositionBadge change={change} />
                  </td>

                  {/* Driver */}
                  <td style={{ paddingTop: '0.55rem', paddingBottom: '0.55rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div style={{ width: '3px', height: '28px', borderRadius: '2px', backgroundColor: teamColour, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                          {row.name_acronym}
                          {row.in_pit && <span style={{ marginLeft: 4, fontSize: '0.55rem', color: '#facc15', fontWeight: 900 }}>PIT</span>}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
                          {row.team_name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tyre */}
                  <td style={{ textAlign: 'center', paddingTop: '0.55rem', paddingBottom: '0.55rem' }}>
                    {row.tyre ? (
                      <span
                        title={stintTitle ?? row.tyre}
                        style={{
                          display: 'inline-block',
                          width: '20px',
                          height: '20px',
                          lineHeight: '20px',
                          borderRadius: '50%',
                          background: `${compoundColour(row.tyre)}22`,
                          border: `1.5px solid ${compoundColour(row.tyre)}`,
                          color: compoundColour(row.tyre),
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          textAlign: 'center',
                          cursor: stintTitle ? 'help' : 'default',
                        }}>
                        {compoundLabel(row.tyre)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                    )}
                  </td>

                  {/* Tyre age */}
                  <td style={{ textAlign: 'center', paddingTop: '0.55rem', paddingBottom: '0.55rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {row.tyre_age != null ? `${row.tyre_age}L` : '—'}
                    </span>
                  </td>

                  {/* Last Lap */}
                  <td style={{ textAlign: 'right', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {row.last_lap ?? '--:--.---'}
                    </span>
                  </td>

                  {/* Sectors S1 / S2 / S3 */}
                  {([0, 1, 2] as const).map((sIdx) => {
                    const sec = row.sector_details?.[sIdx] as SectorDetail | null | undefined;
                    const secColor = sec?.overall_fastest ? '#c084fc' : sec?.personal_fastest ? '#22c55e' : 'var(--text-muted)';
                    return (
                      <td key={sIdx} style={{ textAlign: 'right', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontSize: '0.68rem', color: secColor, fontFamily: 'monospace' }}>
                          {sec?.time ?? '—'}
                        </span>
                      </td>
                    );
                  })}

                  {/* Gap to leader */}
                  <td style={{ textAlign: 'right', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: isLeader ? 900 : 600,
                      color: isLeader ? 'var(--accent-f1)' : 'var(--accent-cyan)',
                      fontFamily: 'monospace',
                    }}>
                      {row.gap_to_leader}
                    </span>
                  </td>

                  {/* Interval (gap to car ahead) */}
                  <td style={{ textAlign: 'right', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: isLeader ? 'var(--text-muted)' : 'var(--text-secondary)',
                      fontFamily: 'monospace',
                    }}>
                      {isLeader ? '---' : (row.interval ?? '--')}
                    </span>
                  </td>

                  {/* Pit stops */}
                  <td style={{ textAlign: 'right', paddingRight: '1rem', paddingTop: '0.55rem', paddingBottom: '0.55rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {row.pit_stops != null ? row.pit_stops : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', flexShrink: 0 }}>
        {[
          { label: 'S', color: '#ef4444', name: 'SOFT' },
          { label: 'M', color: '#facc15', name: 'MEDIUM' },
          { label: 'H', color: '#f8fafc', name: 'HARD' },
          { label: 'I', color: '#22c55e', name: 'INTER' },
          { label: 'W', color: '#38bdf8', name: 'WET' },
        ].map(({ label, color, name }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: `1.5px solid ${color}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 900, fontSize: '0.55rem' }}>{label}</span>
            <span>{name}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#c084fc' }}>■ FASTEST</span>
          <span style={{ color: '#22c55e' }}>■ PB</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#22c55e' }}>▲ GAIN</span>
          <span style={{ color: '#ef4444' }}>▼ LOSS</span>
        </div>
      </div>
    </div>
  );
}
