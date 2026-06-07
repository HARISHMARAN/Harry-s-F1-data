"use client";

import { Calendar } from 'lucide-react';
import type { WeekendSession } from '../types/f1';

interface WeekendScheduleProps {
  sessions: WeekendSession[];
  compact?: boolean;
}

const SESSION_TYPE_COLOURS: Record<string, string> = {
  Practice: 'var(--text-secondary)',
  Qualifying: '#facc15',
  Race: 'var(--accent-f1)',
  Sprint: '#f97316',
};

function sessionColour(type: string): string {
  return SESSION_TYPE_COLOURS[type] ?? 'var(--accent-cyan)';
}

function formatSessionDate(iso: string): { day: string; time: string } {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
    return { day, time };
  } catch {
    return { day: '—', time: '—' };
  }
}

function isSessionLive(session: WeekendSession, now: Date): boolean {
  const start = Date.parse(session.date_start);
  const end = session.date_end
    ? Date.parse(session.date_end)
    : start + 2 * 60 * 60 * 1000;
  const ts = now.getTime();
  return start <= ts && ts <= end + 30 * 60 * 1000;
}

function isSessionPast(session: WeekendSession, now: Date): boolean {
  const end = session.date_end
    ? Date.parse(session.date_end)
    : Date.parse(session.date_start) + 2 * 60 * 60 * 1000;
  return end < now.getTime();
}

export default function WeekendSchedule({ sessions, compact = false }: WeekendScheduleProps) {
  if (!sessions.length) return null;

  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <Calendar size={13} color="var(--accent-cyan)" />
        <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
          Race Weekend
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          F1 only · F2/F3 not in OpenF1
        </span>
      </div>

      {sessions.map((session) => {
        const live = isSessionLive(session, now);
        const past = !live && isSessionPast(session, now);
        const colour = sessionColour(session.session_type);
        const { day, time } = formatSessionDate(session.date_start);

        return (
          <div
            key={session.session_key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: compact ? '0.3rem 0' : '0.4rem 0.5rem',
              borderRadius: '4px',
              background: live ? 'rgba(234, 51, 35, 0.08)' : 'transparent',
              borderLeft: live ? `3px solid ${colour}` : '3px solid transparent',
              opacity: past ? 0.45 : 1,
            }}
          >
            {/* Session type colour dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: colour,
              flexShrink: 0,
              boxShadow: live ? `0 0 6px ${colour}` : 'none',
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: live ? 800 : 600,
                  color: live ? colour : past ? 'var(--text-muted)' : 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}>
                  {session.session_name}
                </span>
                {live && (
                  <span style={{
                    fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.1em',
                    color: colour, background: `${colour}22`,
                    padding: '0.1rem 0.35rem', borderRadius: 999,
                  }}>
                    LIVE
                  </span>
                )}
              </div>
              {!compact && (
                <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {day} · {time}
                </div>
              )}
            </div>

            {compact && (
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                {formatSessionDate(session.date_start).time}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
