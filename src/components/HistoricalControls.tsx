"use client";

import type { SeasonRace } from '../types/f1';

interface HistoricalControlsProps {
  selectedYear: string;
  selectedRound: string | null;
  seasonRaces: SeasonRace[];
  onYearChange: (year: string) => void;
  onRoundChange: (round: string) => void;
}

export default function HistoricalControls({
  selectedYear,
  selectedRound,
  seasonRaces,
  onYearChange,
  onRoundChange,
}: HistoricalControlsProps) {
  const currentYear = new Date().getFullYear().toString();

  return (
    <div className="historical-controls">
      <select
        className="race-selector"
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
      >
        <option value="2026">2026 Season</option>
        <option value="2025">2025 Season</option>
        <option value="2024">2024 Season</option>
      </select>

      {seasonRaces.length > 0 && (
        <select
          className="race-selector"
          value={selectedRound ?? ''}
          onChange={(e) => onRoundChange(e.target.value)}
        >
          {selectedYear === currentYear && (
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
  );
}
