import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import LiveTiming from './components/LiveTiming';
import SessionInfo from './components/SessionInfo';
import MaxTracker from './components/MaxTracker';
import { fetchLiveDashboardData } from './services/openf1';
import { fetchHistoricalData, fetchSeasonRaces } from './services/jolpica';
import { AlertCircle } from 'lucide-react';
import './index.css';

interface SeasonRace {
  round: string;
  raceName: string;
}

function App() {
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORICAL'>('LIVE');
  const [session, setSession] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [maxStats, setMaxStats] = useState<any>(null);
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
    let intervalId: any;
    setLoading(true);

    const loadData = async () => {
      try {
        setErrorMsg(null);
        let data;
        
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
      } catch (err: any) {
        console.error("Dashboard failed to load data:", err);
        setErrorMsg(err.message || "Failed to load OpenF1 data.");
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
        sessionName={"HARRY'S PITDECK"} 
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

      {loading ? (
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
          {leaderboard && (
            <LiveTiming 
              data={leaderboard} 
              title={viewMode === 'LIVE' ? 'LIVE TIMING & INTERVALS' : 'RACE CLASSIFICATION'} 
            />
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* MAX VERSTAPPEN DEDICATED TRACKER */}
            {session && <MaxTracker 
              currentPos={leaderboard.find(d => d.name_acronym === 'VER')?.position || null}
              gap={leaderboard.find(d => d.name_acronym === 'VER')?.date || null}
              stats={maxStats}
            />}
            
            {/* NEW LIVE LAP TRACKER BOX - Optional hide on history */}
            {session && (
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Race Status
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {viewMode === 'LIVE' ? `LAP ${session.current_lap || 'WAITING'}` : 'FINISHED'}
                    </span>
                    <span style={{ color: viewMode === 'LIVE' ? 'var(--accent-f1)' : 'var(--accent-blue)', fontSize: '1rem', fontWeight: 'bold' }}>
                      {viewMode === 'LIVE' ? '● LIVE INFLUX PIPELINE' : 'JOLPICA DATABASE'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {session && <SessionInfo session={session} />}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
