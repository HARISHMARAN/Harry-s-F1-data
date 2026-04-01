import { useEffect, useState } from 'react';
import Header from './components/Header';
import LiveTiming from './components/LiveTiming';
import SessionInfo from './components/SessionInfo';
import MaxTracker from './components/MaxTracker';
import AddonLibrary from './components/AddonLibrary';
import RaceReplay from './components/RaceReplay';
import { fetchLiveDashboardData } from './services/openf1';
import { fetchHistoricalData, fetchSeasonRaces } from './services/jolpica';
import { AlertCircle } from 'lucide-react';
import type { DashboardData, DashboardSession, DriverPosition, MaxStats, SeasonRace } from './types/f1';
import './index.css';

type ViewMode = 'LIVE' | 'HISTORICAL' | 'REPLAY' | 'ADDONS';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('LIVE');
  const [session, setSession] = useState<DashboardSession | null>(null);
  const [leaderboard, setLeaderboard] = useState<DriverPosition[]>([]);
  const [maxStats, setMaxStats] = useState<MaxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Historical selection states
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [seasonRaces, setSeasonRaces] = useState<SeasonRace[]>([]);

  // Effect to load calendar whenever the year changes
  useEffect(() => {
    if (viewMode === 'HISTORICAL') {
      const fetchCalendar = async () => {
        const races = await fetchSeasonRaces(selectedYear);
        setSeasonRaces(races);
        // Default to the first race or clear round to fetch 'last' if default
        if (selectedYear === new Date().getFullYear().toString()) {
            setSelectedRound(null); // 'last' completed
        } else if (races.length > 0) {
            setSelectedRound(races[0].round);
        }
      };
      fetchCalendar();
    }
  }, [selectedYear, viewMode]);

  // Unified data loader depending on mode and selections
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (viewMode !== 'LIVE' && viewMode !== 'HISTORICAL') {
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const loadData = async () => {
      try {
        setErrorMsg(null);
        let data: DashboardData;
        
        if (viewMode === 'LIVE') {
          data = await fetchLiveDashboardData();
        } else {
          // If selectedRound is null, it naturally falls back to the backend default
          data = await fetchHistoricalData(selectedYear, selectedRound || undefined);
        }

        if (data) {
          setSession(data.session);
          setLeaderboard(data.leaderboard);
          setMaxStats(data.max_stats);
        }
      } catch (err: unknown) {
        console.error("Dashboard failed to load data:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to load OpenF1 data.");
        setSession(null);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    // Don't fetch if we're in historical mode but haven't resolved the calendar yet (unless we're fetching default)
    if (viewMode === 'HISTORICAL' && !selectedRound && selectedYear !== new Date().getFullYear().toString() && seasonRaces.length === 0) {
      // WAIT FOR CALENDAR
    } else {
      loadData();
    }

    // Only set up a polling interval for live data
    if (viewMode === 'LIVE') {
      intervalId = setInterval(loadData, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [viewMode, selectedYear, selectedRound, seasonRaces.length]);

  return (
    <div className="app-container">
      <Header 
        sessionName={"HARRY'S PITWALL"} 
        isLive={viewMode === 'LIVE'} 
      />
      
      {/* Mode Toggle Switch */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="mode-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'LIVE' ? 'active' : ''}`}
            onClick={() => setViewMode('LIVE')}
          >
            ● LIVE TELEMETRY
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'HISTORICAL' ? 'active-hist' : ''}`}
            onClick={() => setViewMode('HISTORICAL')}
          >
            HISTORICAL ARCHIVE
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'REPLAY' ? 'active' : ''}`}
            style={{ backgroundColor: viewMode === 'REPLAY' ? 'rgba(0, 147, 204, 0.16)' : 'transparent', boxShadow: viewMode === 'REPLAY' ? '0 0 10px rgba(0, 147, 204, 0.25)' : 'none' }}
            onClick={() => setViewMode('REPLAY')}
          >
            RACE REPLAY
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'ADDONS' ? 'active' : ''}`}
            style={{ backgroundColor: viewMode === 'ADDONS' ? 'var(--text-muted)' : 'transparent', boxShadow: viewMode === 'ADDONS' ? '0 0 10px rgba(140, 140, 148, 0.3)' : 'none' }}
            onClick={() => setViewMode('ADDONS')}
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
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2026">2026 Season</option>
            <option value="2025">2025 Season</option>
            <option value="2024">2024 Season</option>
          </select>

          {seasonRaces.length > 0 && (
            <select 
              className="race-selector"
              value={selectedRound || ""}
              onChange={(e) => setSelectedRound(e.target.value)}
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
        <AddonLibrary onOpenReplay={() => setViewMode('REPLAY')} />
      ) : viewMode === 'REPLAY' ? (
        <RaceReplay />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="pulsing-dot" style={{ width: 24, height: 24 }} />
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
              {session && <MaxTracker 
                currentPos={leaderboard.find(d => d.name_acronym === 'VER')?.position || null}
                gap={leaderboard.find(d => d.name_acronym === 'VER')?.date || null}
                stats={maxStats}
              />}
              
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
