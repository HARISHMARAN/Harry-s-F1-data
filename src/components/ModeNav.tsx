"use client";

import { useRouter } from 'next/navigation';
import type { ViewMode } from '../hooks/useDashboardData';

interface ModeNavProps {
  viewMode: ViewMode;
  onSetMode: (mode: ViewMode) => void;
}

export default function ModeNav({ viewMode, onSetMode }: ModeNavProps) {
  const router = useRouter();

  return (
    <div className="top-placeholder">
      <div className="mode-toggle">
        <button
          className={`toggle-btn ${viewMode === 'LIVE' ? 'active' : ''}`}
          onClick={() => onSetMode('LIVE')}
        >
          Live Telemetry
        </button>
        <button
          className={`toggle-btn ${viewMode === 'HISTORICAL' ? 'active-hist' : ''}`}
          onClick={() => onSetMode('HISTORICAL')}
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
          className={`toggle-btn ${viewMode === 'CHAT' ? 'active' : ''}`}
          onClick={() => onSetMode('CHAT')}
        >
          Chatbot
        </button>
        <button
          className={`toggle-btn ${viewMode === 'PREDICTIONS' ? 'active-hist' : ''}`}
          onClick={() => onSetMode('PREDICTIONS')}
        >
          Predictions
        </button>
        <button
          className={`toggle-btn ${viewMode === 'NEWS' ? 'active-hist' : ''}`}
          onClick={() => onSetMode('NEWS')}
        >
          News
        </button>
      </div>
    </div>
  );
}
