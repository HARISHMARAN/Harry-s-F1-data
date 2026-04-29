"use client";

import { useEffect } from 'react';
import { useState } from 'react';

import Header from './components/Header';
import LiveTiming from './components/LiveTiming';
import SessionInfo from './components/SessionInfo';
import MaxTracker from './components/MaxTracker';
import AddonLibrary from './components/AddonLibrary';
import PredictionStudio from './components/PredictionStudio';
import TelemetryRibbon from './components/TelemetryRibbon';
import TrackBackdrop from './components/TrackBackdrop';
import DraggableWidget from './components/DraggableWidget';
import NextRaceIntelligence from './components/NextRaceIntelligence';
import LiveRaceTelemetryPanel from './components/LiveRaceTelemetryPanel';
import ChatView from './components/chat/ChatView';
import { AlertCircle } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { DASHBOARD_TITLE } from './constants';
import { LeaderboardSkeleton } from './components/Skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchHistoricalData } from './services/jolpica';
import type { DashboardSession } from './types/f1';

const BACKDROP_REFRESH_MS = 30 * 60 * 1000;

const FALLBACK_BACKDROP_SESSION: DashboardSession = {
  session_key: 'miami-gp-fallback',
  session_name: 'Miami Grand Prix',
  session_type: 'Race',
  country_name: 'United States',
  location: 'Miami Gardens',
  circuit_short_name: 'Miami',
  date_start: '2026-05-03T20:00:00Z',
  current_lap: 'SCHEDULED',
};

function App() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, dispatch } = useDashboardData();
  const {
    viewMode,
    session,
    leaderboard,
    maxStats,
    loading,
    errorMsg,
    dataState,
    warnings,
    selectedYear,
    selectedRound,
    seasonRaces,
    liveStatus,
    nextSession,
  } = state;
  const isLive = liveStatus === 'LIVE';
  const [latestCompletedSession, setLatestCompletedSession] = useState<DashboardSession | null>(null);
  const nextSchedule = nextSession ?? (session?.status === 'NO_RACE' ? session : null);
  const nextRaceSchedule = nextSchedule?.session_type === 'Race' ? nextSchedule : FALLBACK_BACKDROP_SESSION;
  const backdropSession = nextSchedule ?? session ?? latestCompletedSession ?? FALLBACK_BACKDROP_SESSION;
  const [viewportWidth, setViewportWidth] = useState(1440);
  const rightRailX = Math.max(20, viewportWidth - 380);
  const isNarrowViewport = viewportWidth < 1100;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (!mode) return;
    if (mode === 'live') dispatch({ type: 'SET_VIEW_MODE', payload: 'LIVE' });
    if (mode === 'historical') dispatch({ type: 'SET_VIEW_MODE', payload: 'HISTORICAL' });
    if (mode === 'addons') dispatch({ type: 'SET_VIEW_MODE', payload: 'ADDONS' });
    if (mode === 'chat') dispatch({ type: 'SET_VIEW_MODE', payload: 'CHAT' });
    if (mode === 'predictions') dispatch({ type: 'SET_VIEW_MODE', payload: 'PREDICTIONS' });
  }, [searchParams, dispatch]);

  useEffect(() => {
    let ignore = false;

    const loadLatestRaceForBackdrop = async () => {
      try {
        const latestRace = await fetchHistoricalData();
        if (!ignore && latestRace?.session) {
          setLatestCompletedSession(latestRace.session);
        }
      } catch {
        if (!ignore) {
          setLatestCompletedSession((current) => current ?? FALLBACK_BACKDROP_SESSION);
        }
      }
    };

    loadLatestRaceForBackdrop();
    const intervalId = window.setInterval(loadLatestRaceForBackdrop, BACKDROP_REFRESH_MS);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="app-container" style={{ position: 'relative', minHeight: '100vh' }}>
      
      {/* BACKGROUND LAYER: TRACK MAP (FIXED) - Always latest completed race */}
      {backdropSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
          <TrackBackdrop session={backdropSession} />
        </div>
      )}

      {/* FOREGROUND CONTENT */}
      <div style={{ position: 'relative', zIndex: 100, pointerEvents: 'none', width: '100%' }}>
        <div style={{ pointerEvents: 'auto' }}>
          {/* Top Placeholder: Primary Mode Switch */}
          <div className="top-placeholder">
            <div className="mode-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'LIVE' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'LIVE' })}
              >
                Live Telemetry
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'HISTORICAL' ? 'active-hist' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'HISTORICAL' })}
              >
                Historical Archive
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'REPLAY' ? 'active-hist' : ''}`}
                onClick={() => router.push('/replay')}
              >
                Race Replay
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'ADDONS' ? 'active-hist' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'ADDONS' })}
              >
                Add-on Library
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'CHAT' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'CHAT' })}
              >
                Chatbot
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'PREDICTIONS' ? 'active-hist' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'PREDICTIONS' })}
              >
                Predictions
              </button>
            </div>
          </div>

          <Header
            sessionName={DASHBOARD_TITLE}
            isLive={viewMode === 'LIVE' && isLive}
          />
          <TelemetryRibbon session={session} viewMode={viewMode} live={viewMode === 'LIVE' && isLive} signalLabel={viewMode === 'LIVE' ? 'SIGNAL: LIVE PACKET' : 'SIGNAL: STABLE'} />

          {/* Historical Race Selectors */}
          {viewMode === 'HISTORICAL' && (
            <div className="historical-controls">
              <select 
                className="race-selector"
                value={selectedYear}
                onChange={(e) => dispatch({ type: 'SET_YEAR', payload: e.target.value })}
              >
                <option value="2026">2026 Season</option>
                <option value="2025">2025 Season</option>
                <option value="2024">2024 Season</option>
              </select>

              {seasonRaces.length > 0 && (
                <select 
                  className="race-selector"
                  value={selectedRound || ""}
                  onChange={(e) => dispatch({ type: 'SET_ROUND', payload: e.target.value })}
                >
                  {selectedYear === new Date().getFullYear().toString() && (
                    <option value="">Latest Completed Race</option>
                  )}
                  {seasonRaces.map((race) => (
                    <option key={race.round} value={race.round}>
                      R{race.round} - {race.raceName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 101, width: '100%' }}>
        {viewMode === 'ADDONS' ? (
          <AddonLibrary 
            onOpenReplay={() => router.push('/replay')}
            onOpenChat={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'CHAT' })}
          />
        ) : viewMode === 'CHAT' ? (
          <ChatView />
        ) : viewMode === 'PREDICTIONS' ? (
          <PredictionStudio />
        ) : loading ? (
          <div className="dashboard-grid">
            <div className="dashboard-column">
                <LeaderboardSkeleton />
            </div>
            <div className="dashboard-column center-column" style={{ opacity: 0.3 }}>
                <div className="glass-panel" style={{ height: '600px' }} />
            </div>
            <div className="dashboard-column right-sidebar" style={{ opacity: 0.3 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-panel" style={{ height: '240px' }} />
                  <div className="glass-panel" style={{ height: '180px' }} />
                </div>
            </div>
          </div>
        ) : dataState === 'offline' && !session ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--accent-f1)' }}>
            <AlertCircle size={48} color="var(--accent-f1)" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>DATA UNAVAILABLE</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              {errorMsg ?? 'Telemetry backend is offline. Showing limited UI until recovery.'}
            </p>
          </div>
        ) : (
          <main style={{ position: 'relative', width: '100%', minHeight: '100vh', pointerEvents: 'none' }}>
            {(dataState === 'degraded' || dataState === 'offline') && (
              <div style={{ pointerEvents: 'auto', padding: '0 1rem' }}>
                <div className="glass-panel" style={{ borderColor: 'rgba(244, 180, 0, 0.45)', marginBottom: '1rem', padding: '0.85rem 1rem' }}>
                  <strong style={{ color: '#f4b400', fontSize: '0.85rem', letterSpacing: '0.08em' }}>DATA MODE: {dataState.toUpperCase()}</strong>
                  {warnings.length > 0 && (
                    <p style={{ marginTop: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {warnings[0]}
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* HUD WIDGETS LAYER */}
            <div style={{ pointerEvents: 'auto' }}>
              {!isNarrowViewport && (
                <div style={{ position: 'fixed', top: '1rem', right: '1rem', pointerEvents: 'none', zIndex: 50 }}>
                  <div className="live-indicator" style={{ backdropFilter: 'blur(8px)' }}>
                    <div className="pulsing-dot" />
                    <span className="live-text">SIGNAL: NOMINAL</span>
                  </div>
                </div>
              )}

              {isNarrowViewport ? (
                <div className="mobile-hud-stack">
                  <div className="glass-panel" style={{ padding: '0.9rem' }}>
                    {leaderboard && (
                      <LiveTiming
                        data={leaderboard}
                        title=""
                        liveStatus={viewMode === 'LIVE' ? liveStatus : 'LIVE'}
                        nextSession={viewMode === 'LIVE' ? nextSchedule : null}
                      />
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '0.9rem' }}>
                    <NextRaceIntelligence nextSession={nextRaceSchedule} compact />
                  </div>

                  <div className="glass-panel" style={{ padding: '0.9rem' }}>
                    <LiveRaceTelemetryPanel nextSession={nextSchedule} compact />
                  </div>

                  <div className="glass-panel" style={{ padding: '0.9rem' }}>
                    {session && (
                      <MaxTracker
                        currentPos={leaderboard?.find((d) => d.name_acronym === 'VER')?.position || null}
                        gap={leaderboard?.find((d) => d.name_acronym === 'VER')?.date || null}
                        stats={maxStats}
                      />
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '0.9rem' }}>
                    {session && <SessionInfo session={session} />}
                  </div>

                  <div className="glass-panel" style={{ padding: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                        {viewMode === 'LIVE' ? 'SYNCHRONIZED' : 'ARCHIVED'}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>LATENCY: 42MS</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <DraggableWidget id="leaderboard" title={viewMode === 'LIVE' ? 'LIVE TIMING & INTERVALS' : 'RACE CLASSIFICATION'} defaultX={20} defaultY={80} width={350}>
                    {leaderboard && (
                      <LiveTiming
                        data={leaderboard}
                        title=""
                        liveStatus={viewMode === 'LIVE' ? liveStatus : 'LIVE'}
                        nextSession={viewMode === 'LIVE' ? nextSchedule : null}
                      />
                    )}
                  </DraggableWidget>

                  <DraggableWidget id="live_race_telemetry" title="MIAMI LIVE RACE TELEMETRY" defaultX={390} defaultY={80} width={620}>
                    <LiveRaceTelemetryPanel nextSession={nextSchedule} />
                  </DraggableWidget>

                  <DraggableWidget id="next_race_intelligence" title="NEXT RACE INTELLIGENCE" defaultX={390} defaultY={700} width={620}>
                    <NextRaceIntelligence nextSession={nextRaceSchedule} />
                  </DraggableWidget>

                  <DraggableWidget id="focused_driver" title="DRIVER FOCUS" defaultX={rightRailX} defaultY={80} width={340}>
                    {session && (
                      <MaxTracker
                        currentPos={leaderboard?.find((d) => d.name_acronym === 'VER')?.position || null}
                        gap={leaderboard?.find((d) => d.name_acronym === 'VER')?.date || null}
                        stats={maxStats}
                      />
                    )}
                  </DraggableWidget>

                  <DraggableWidget id="session_info" title="SESSION" defaultX={rightRailX} defaultY={470} width={340}>
                    {session && <SessionInfo session={session} />}
                  </DraggableWidget>

                  <DraggableWidget id="data_pipeline" title="PIPELINE" defaultX={rightRailX} defaultY={1000} width={340}>
                    <div style={{ width: '320px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                        {viewMode === 'LIVE' ? 'SYNCHRONIZED' : 'ARCHIVED'}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        LATENCY: 42MS
                      </span>
                    </div>
                  </DraggableWidget>
                </>
              )}
            </div>
          </main>
        )}
      </div>

      {/* STICKY BOTTOM TELEMETRY BAR */}
      {viewMode !== 'CHAT' && (
      <footer className="telemetry-footer">
         <div className="telemetry-status">
            <div className="status-item">
               <div className={`status-indicator ${viewMode === 'LIVE' ? 'pulse' : ''}`} />
               <span>{session?.session_name || 'INITIALIZING...'}</span>
            </div>
            <div className="status-item">
               <span>{isLive ? `LAP ${session?.current_lap || '--'}/71` : 'NO LIVE LAPS'}</span>
            </div>
            <div className="status-item">
               <span>LOC: {session?.location || 'TRACKSIDE'}</span>
            </div>
            <div className="status-item">
               <span style={{ color: isLive ? 'var(--accent-success)' : 'var(--accent-f1)' }}>
                {isLive ? 'LIVE' : 'TRACK CLEAR'}
               </span>
            </div>
         </div>
         <div className="pipeline-info" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span>EXPORT TELEMETRY</span>
         </div>
      </footer>
      )}
    </div>
  );
}

export default App;
