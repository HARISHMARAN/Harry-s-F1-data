import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import LiveTiming from './components/LiveTiming';
import SessionInfo from './components/SessionInfo';
import { fetchLiveDashboardData } from './services/openf1';
import { AlertCircle } from 'lucide-react';
import './index.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll for data every 30 seconds
  useEffect(() => {
    let intervalId: any;

    const loadData = async () => {
      try {
        setErrorMsg(null);
        const data = await fetchLiveDashboardData();
        if (data) {
          setSession(data.session);
          setLeaderboard(data.leaderboard);
        }
      } catch (err: any) {
        console.error("Dashboard failed to load live data:", err);
        setErrorMsg(err.message || "Failed to load OpenF1 data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    intervalId = setInterval(loadData, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="app-container">
      <Header 
        sessionName={"HARRY'S PITDECK"} 
        isLive={true} 
      />
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <div className="pulsing-dot" style={{ width: 24, height: 24 }} />
        </div>
      ) : errorMsg ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--accent-f1)' }}>
          <AlertCircle size={48} color="var(--accent-f1)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>API Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            {errorMsg}
          </p>
        </div>
      ) : (
        <main className="dashboard-grid">
          {leaderboard && <LiveTiming data={leaderboard} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* NEW LIVE LAP TRACKER BOX */}
            {session && (
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Race Status
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                      LAP {session.current_lap || 'WAITING'}
                    </span>
                    <span style={{ color: 'var(--accent-f1)', fontSize: '1rem', fontWeight: 'bold' }}>
                      ● LIVE INFLUX PIPELINE
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
