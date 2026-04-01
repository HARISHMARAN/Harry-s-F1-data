import Header from './components/Header';
import LiveTiming from './components/LiveTiming';
import SessionInfo from './components/SessionInfo';
import MaxTracker from './components/MaxTracker';
import AddonLibrary from './components/AddonLibrary';
import RaceReplay from './components/RaceReplay';
import { AlertCircle } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { DASHBOARD_TITLE } from './constants';
import { LeaderboardSkeleton } from './components/Skeleton';
import './index.css';

function App() {
  const { state, dispatch } = useDashboardData();
  const { viewMode, session, leaderboard, maxStats, loading, errorMsg, selectedYear, selectedRound, seasonRaces } = state;

  return (
    <div className="app-container">
      <Header 
        sessionName={DASHBOARD_TITLE} 
        isLive={viewMode === 'LIVE'} 
      />
      
      {/* Mode Toggle Switch */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
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
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'REPLAY' })}
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

      {viewMode === 'ADDONS' ? (
        <AddonLibrary onOpenReplay={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'REPLAY' })} />
      ) : viewMode === 'REPLAY' ? (
        <RaceReplay />
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
        <main className="dashboard-grid">
          {/* COLUMN 1: LEADERBOARD */}
          <div className="dashboard-column">
            {leaderboard && (
              <LiveTiming 
                data={leaderboard} 
                title={viewMode === 'LIVE' ? 'LIVE TIMING & INTERVALS' : 'RACE CLASSIFICATION'} 
              />
            )}
          </div>

          {/* COLUMN 2: TRACK MAP / FOCUS */}
          <div className="dashboard-column center-column">
             <div className="glass-panel" style={{ height: '100%', minHeight: '600px', position: 'relative' }}>
                <RaceReplay isEmbedded={true} />
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', pointerEvents: 'none' }}>
                   <div className="live-indicator" style={{ backdropFilter: 'blur(8px)' }}>
                      <div className="pulsing-dot" />
                      <span className="live-text">SIGNAL: NOMINAL</span>
                   </div>
                </div>
             </div>
          </div>
          
          {/* COLUMN 3: STATS & DRIVER FOCUS */}
          <div className="dashboard-column right-sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* MAX VERSTAPPEN DEDICATED TRACKER */}
              {session && (
                <MaxTracker 
                  currentPos={leaderboard.find(d => d.name_acronym === 'VER')?.position || null}
                  gap={leaderboard.find(d => d.name_acronym === 'VER')?.date || null}
                  stats={maxStats}
                />
              )}
              
              {session && <SessionInfo session={session} />}

              {/* LIVE SYNC STATUS CARD (CLEANED UP STITCH ELEMENT) */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                 <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1.5px' }}>Data Pipeline</h4>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                      {viewMode === 'LIVE' ? 'SYNCHRONIZED' : 'ARCHIVED'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      LATENCY: 42MS
                    </span>
                 </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STICKY BOTTOM TELEMETRY BAR */}
      <footer className="telemetry-footer">
         <div className="telemetry-status">
            <div className="status-item">
               <div className={`status-indicator ${viewMode === 'LIVE' ? 'pulse' : ''}`} />
               <span>{session?.session_name || 'INITIALIZING...'}</span>
            </div>
            <div className="status-item">
               <span>LAP {session?.current_lap || '--'}/71</span>
            </div>
            <div className="status-item">
               <span>LOC: {session?.location || 'TRACKSIDE'}</span>
            </div>
            <div className="status-item">
               <span style={{ color: 'var(--accent-success)' }}>TRACK CLEAR</span>
            </div>
         </div>
         <div className="pipeline-info" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span>EXPORT TELEMETRY</span>
         </div>
      </footer>
    </div>
  );
}

export default App;

