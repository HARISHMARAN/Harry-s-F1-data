"use client";

import { useState } from 'react';
import { Flag, Trophy, BarChart3, Calendar, MessageCircle, TrendingUp, Clock } from 'lucide-react';
import RaceHubDashboard from './RaceHubDashboard';
import PredictionStudio from './PredictionStudio';
import ChatView from './chat/ChatView';
import NewsView from './NewsView';
import LiveTiming from './LiveTiming';
import WeekendSchedule from './WeekendSchedule';
import type { DashboardSession, DriverPosition, WeekendSession } from '../types/f1';
import type { ClientDriverStanding, ClientConstructorStanding } from '../services/standings';

type ViewType = 'home' | 'predictions' | 'chat' | 'news' | 'timing';

interface HomePageProps {
  session: DashboardSession | null;
  leaderboard: DriverPosition[] | null;
  championships: {
    drivers: ClientDriverStanding[];
    constructors: ClientConstructorStanding[];
    season: string;
    round: string;
  } | null;
  championshipsLoading: boolean;
  weekendSchedule: WeekendSession[];
  nextSession: DashboardSession | null;
  liveStatus: string;
  loading: boolean;
}

const navItems = [
  { id: 'home' as ViewType, label: 'Dashboard', icon: Flag },
  { id: 'predictions' as ViewType, label: 'Predictions', icon: TrendingUp },
  { id: 'timing' as ViewType, label: 'Live Timing', icon: Clock },
  { id: 'chat' as ViewType, label: 'AI Assistant', icon: MessageCircle },
  { id: 'news' as ViewType, label: 'News', icon: BarChart3 },
];

export default function HomePage({
  session,
  leaderboard,
  championships,
  championshipsLoading,
  weekendSchedule,
  nextSession,
  liveStatus,
  loading,
}: HomePageProps) {
  const [view, setView] = useState<ViewType>('home');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, rgba(7, 10, 14, 0.98), rgba(12, 17, 24, 0.94) 46%, rgba(5, 8, 12, 0.98))' }}>
      {/* Top Navigation Bar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(8, 12, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Flag size={24} color="var(--accent-f1)" strokeWidth={2.5} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            F1 PITWALL
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: 8,
                border: view === id ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                background: view === id ? 'rgba(21, 209, 204, 0.12)' : 'transparent',
                color: view === id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {liveStatus === 'LIVE' && (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8002D', boxShadow: '0 0 8px #E8002D', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-f1)', letterSpacing: '0.08em' }}>LIVE SESSION</span>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '1.5rem', maxWidth: 1600, margin: '0 auto' }}>
        {view === 'home' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Race Hub Dashboard - 3 columns */}
            <RaceHubDashboard
              drivers={championships?.drivers ?? []}
              constructors={championships?.constructors ?? []}
              season={championships?.season ?? new Date().getFullYear().toString()}
              round={championships?.round ?? '0'}
              standingsLoading={championshipsLoading}
            />

            {/* Quick Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {weekendSchedule.length > 0 && (
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Calendar size={16} color="var(--accent-cyan)" />
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Weekend Schedule</h3>
                  </div>
                  <WeekendSchedule sessions={weekendSchedule.slice(0, 4)} compact />
                </div>
              )}

              {leaderboard && leaderboard.length > 0 && (
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Trophy size={16} color="var(--accent-f1)" />
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-f1)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Latest Results</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {leaderboard.slice(0, 5).map((driver, idx) => (
                      <div key={driver.driver_number} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: idx === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', minWidth: 20 }}>{driver.position}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{driver.name_acronym}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flex: 1 }}>{driver.team_name}</span>
                        {driver.gap_to_leader && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>+{driver.gap_to_leader}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'predictions' && <PredictionStudio />}
        {view === 'chat' && <ChatView />}
        {view === 'news' && <NewsView />}
        
        {view === 'timing' && (
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {leaderboard ? (
              <LiveTiming
                data={leaderboard}
                title="Live Timing & Intervals"
                liveStatus={liveStatus === 'LIVE' ? 'LIVE' : 'NO_RACE'}
                raceName={session?.session_name ?? null}
                nextSession={nextSession}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>No live timing data available</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Data will appear when a session is live</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
