import { Calendar, MapPin, Activity } from 'lucide-react';
import type { DashboardSession } from '../types/f1';
import { formatSessionSchedule } from '../utils/dateFormat';

interface SessionInfoProps {
  session: DashboardSession;
}

export default function SessionInfo({ session }: SessionInfoProps) {
  if (!session) return null;

  const isNoRace = session.status === 'NO_RACE';
  
  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div className="panel-header" style={{ border: 'none', padding: '0 0 1rem 0' }}>
        <Activity size={16} color="var(--accent-f1)" />
        <h2 className="panel-title" style={{ fontSize: '0.8rem', letterSpacing: '2px' }}>
          {isNoRace ? 'NEXT SESSION' : 'SESSION SPECS'}
        </h2>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span className="speed-chip active" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>
          {isNoRace ? 'GRID PENDING' : 'SESSION ACTIVE'}
        </span>
        <span className="speed-chip" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>
          {session.session_type.toUpperCase()}
        </span>
        <span className="speed-chip" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>
          {session.status === 'NO_RACE' ? 'TRACK CLEAR' : 'LIVE FEED'}
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.15rem', textTransform: 'uppercase' }}>
            {session.circuit_short_name}
          </h3>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
            {isNoRace ? 'TRACK CLEAR' : session.session_name.toUpperCase()}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              <MapPin size={14} color="var(--text-secondary)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px' }}>LOCATION</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{session.location}, {session.country_name}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              <Calendar size={14} color="var(--text-secondary)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '1px' }}>SCHEDULED</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                {formatSessionSchedule(session.date_start, 'TBD')}
              </p>
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: '0.5rem', 
          padding: '0.75rem', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px dashed var(--border-light)',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>SOURCE:</span>{' '}
            {isNoRace ? 'OPENF1 SCHEDULE FEED' : 'OPENF1 LIVE TELEMETRY ENGINE'}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Race Phase</p>
            <strong style={{ display: 'block', marginTop: '0.2rem', color: 'var(--accent-cyan)' }}>{isNoRace ? 'Pre-race' : 'On Track'}</strong>
          </div>
          <div style={{ padding: '0.65rem', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Venue</p>
            <strong style={{ display: 'block', marginTop: '0.2rem', color: 'var(--text-primary)' }}>{session.circuit_short_name}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
