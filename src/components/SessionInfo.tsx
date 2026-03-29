import { Calendar, MapPin, Flag } from 'lucide-react';
import type { DashboardSession } from '../types/f1';

interface SessionInfoProps {
  session: DashboardSession;
}

export default function SessionInfo({ session }: SessionInfoProps) {
  if (!session) return null;

  const startDate = new Date(session.date_start);
  
  return (
    <div className="glass-panel col-span-4" style={{ padding: '24px' }}>
      <h2 className="card-title">
        <Flag size={20} />
        Session Selection
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {session.session_name}
          </h3>
          <p style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>
            {session.session_type}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <MapPin size={18} color="var(--text-secondary)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>Circuit</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{session.circuit_short_name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{session.location}, {session.country_name}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <Calendar size={18} color="var(--text-secondary)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>Date</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {startDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Local Time
              </p>
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: 'auto', 
          padding: '16px', 
          background: 'rgba(225, 6, 0, 0.1)', 
          borderLeft: '4px solid var(--accent-f1)',
          borderRadius: '4px'
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            <strong>Note:</strong> Data is synchronized directly from the OpenF1 api.
          </p>
        </div>
      </div>
    </div>
  );
}
