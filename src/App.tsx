"use client";

import { useEffect } from 'react';

import Header from './components/Header';
import LiveTiming from './components/LiveTiming';
import SessionInfo from './components/SessionInfo';
import MaxTracker from './components/MaxTracker';
import AddonLibrary from './components/AddonLibrary';
import TrackBackdrop from './components/TrackBackdrop';
import DraggableWidget from './components/DraggableWidget';
import ChatView from './components/chat/ChatView';
import { AlertCircle } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { DASHBOARD_TITLE } from './constants';
import { LeaderboardSkeleton } from './components/Skeleton';
import { useRouter, useSearchParams } from 'next/navigation';

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
    selectedYear,
    selectedRound,
    seasonRaces,
    liveStatus,
    nextSession,
  } = state;
  const isLive = liveStatus === 'LIVE';
  const nextSchedule = nextSession ?? (session?.status === 'NO_RACE' ? session : null);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (!mode) return;
    if (mode === 'live') dispatch({ type: 'SET_VIEW_MODE', payload: 'LIVE' });
    if (mode === 'historical') dispatch({ type: 'SET_VIEW_MODE', payload: 'HISTORICAL' });
    if (mode === 'addons') dispatch({ type: 'SET_VIEW_MODE', payload: 'ADDONS' });
    if (mode === 'chat') dispatch({ type: 'SET_VIEW_MODE', payload: 'CHAT' });
  }, [searchParams, dispatch]);

  return (
    <div className="app-container" style={{ position: 'relative', minHeight: '100vh' }}>
      
      {/* BACKGROUND LAYER: TRACK MAP (FIXED) - Only show when NOT in ADDONS or separate REPLAY mode */}
      {(viewMode === 'LIVE' || viewMode === 'HISTORICAL') && !loading && !errorMsg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
          <TrackBackdrop session={session} />
        </div>
      )}

      {/* FOREGROUND CONTENT */}
      <div style={{ position: 'relative', zIndex: 100, pointerEvents: 'none', width: '100%' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <Header 
            sessionName={DASHBOARD_TITLE} 
            isLive={viewMode === 'LIVE' && isLive} 
          />
          
          {/* Mode Toggle Switch */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="mode-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'LIVE' ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'LIVE' })}
              >
                ● LIVE TELEMETRY
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'HISTORICAL' ? 'active-hist' : ''}`}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'HISTORICAL' })}
              >
                HISTORICAL ARCHIVE
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'REPLAY' ? 'active' : ''}`}
                style={{ backgroundColor: viewMode === 'REPLAY' ? 'rgba(0, 147, 204, 0.16)' : 'transparent', boxShadow: viewMode === 'REPLAY' ? '0 0 10px rgba(0, 147, 204, 0.25)' : 'none' }}
                onClick={() => router.push('/replay')}
              >
                RACE REPLAY
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'ADDONS' ? 'active' : ''}`}
                style={{ backgroundColor: viewMode === 'ADDONS' ? 'var(--text-muted)' : 'transparent', boxShadow: viewMode === 'ADDONS' ? '0 0 10px rgba(140, 140, 148, 0.3)' : 'none' }}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'ADDONS' })}
              >
                ADD-ON LIBRARY
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'CHAT' ? 'active' : ''}`}
                style={{ backgroundColor: viewMode === 'CHAT' ? 'rgba(234, 51, 35, 0.12)' : 'transparent', boxShadow: viewMode === 'CHAT' ? '0 0 10px rgba(234, 51, 35, 0.3)' : 'none' }}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'CHAT' })}
              >
                CHATBOT
              </button>
            </div>
          </div>

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
        ) : errorMsg ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--accent-f1)' }}>
            <AlertCircle size={48} color="var(--accent-f1)" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>DATA UNAVAILABLE</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              {errorMsg}
            </p>
          </div>
        ) : (
          <main style={{ position: 'relative', width: '100%', minHeight: '100vh', pointerEvents: 'none' }}>
            {/* HUD WIDGETS LAYER */}
            <div style={{ pointerEvents: 'auto' }}>
              <div style={{ position: 'fixed', top: '1rem', right: '1rem', pointerEvents: 'none', zIndex: 50 }}>
                <div className="live-indicator" style={{ backdropFilter: 'blur(8px)' }}>
                  <div className="pulsing-dot" />
                  <span className="live-text">SIGNAL: NOMINAL</span>
                </div>
              </div>

              <DraggableWidget id="leaderboard" title={viewMode === 'LIVE' ? 'LIVE TIMING & INTERVALS' : 'RACE CLASSIFICATION'} defaultX={20} defaultY={80}>
                {leaderboard && (
                  <LiveTiming
                    data={leaderboard}
                    title=""
                    liveStatus={viewMode === 'LIVE' ? liveStatus : 'LIVE'}
                    nextSession={viewMode === 'LIVE' ? nextSchedule : null}
                  />
                )}
              </DraggableWidget>

              <DraggableWidget id="focused_driver" title="DRIVER FOCUS" defaultX={window.innerWidth - 380} defaultY={80}>
                {session && (
                  <MaxTracker 
                    currentPos={leaderboard?.find(d => d.name_acronym === 'VER')?.position || null}
                    gap={leaderboard?.find(d => d.name_acronym === 'VER')?.date || null}
                    stats={maxStats}
                  />
                )}
              </DraggableWidget>

              <DraggableWidget id="session_info" title="SESSION" defaultX={window.innerWidth - 380} defaultY={320}>
                {session && <SessionInfo session={session} />}
              </DraggableWidget>

              {/* LIVE SYNC STATUS CARD */}
              <DraggableWidget id="data_pipeline" title="PIPELINE" defaultX={window.innerWidth - 380} defaultY={480}>
                <div style={{ width: '320px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                    {viewMode === 'LIVE' ? 'SYNCHRONIZED' : 'ARCHIVED'}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    LATENCY: 42MS
                  </span>
                </div>
              </DraggableWidget>
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
