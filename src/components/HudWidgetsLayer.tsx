"use client";

import LiveTiming from './LiveTiming';
import LiveRaceTelemetryPanel from './LiveRaceTelemetryPanel';
import NextRaceIntelligence from './NextRaceIntelligence';
import MaxTracker from './MaxTracker';
import SessionInfo from './SessionInfo';
import DraggableWidget from './DraggableWidget';
import HudControls from './HudControls';
import type { DriverPosition, DashboardSession, MaxStats } from '../types/f1';
import type { HudVisibility, HudWidgetId } from '../hooks/useHudLayout';
import type { ViewMode } from '../hooks/useDashboardData';

interface HudWidgetsLayerProps {
  viewMode: ViewMode;
  liveStatus: 'LIVE' | 'NO_RACE';
  dataState: 'loading' | 'healthy' | 'degraded' | 'offline';
  warnings: string[];
  session: DashboardSession | null;
  leaderboard: DriverPosition[];
  maxStats: MaxStats | null;
  nextSchedule: DashboardSession | null;
  nextRaceSchedule: DashboardSession;
  visible: HudVisibility;
  layoutResetKey: number;
  isNarrowViewport: boolean;
  rightRailX: number;
  trackedDriver: string;
  lastFetchDurationMs: number | null;
  onToggleWidget: (id: HudWidgetId, checked: boolean) => void;
  onResetLayout: () => void;
  onDriverChange: (acronym: string) => void;
}

export default function HudWidgetsLayer({
  viewMode,
  liveStatus,
  dataState,
  warnings,
  session,
  leaderboard,
  maxStats,
  nextSchedule,
  nextRaceSchedule,
  visible,
  layoutResetKey,
  isNarrowViewport,
  rightRailX,
  trackedDriver,
  lastFetchDurationMs,
  onToggleWidget,
  onResetLayout,
  onDriverChange,
}: HudWidgetsLayerProps) {
  const availableDrivers = leaderboard.map((d) => ({
    acronym: d.name_acronym,
    fullName: d.full_name,
    teamColour: d.team_colour,
  }));

  const tracked = leaderboard.find((d) => d.name_acronym === trackedDriver) ?? leaderboard[0];

  const latencyLabel = lastFetchDurationMs !== null
    ? `${lastFetchDurationMs}MS`
    : viewMode === 'LIVE' ? 'MEASURING...' : 'N/A';

  const hudControls = (
    <HudControls
      visible={visible}
      isNarrowViewport={isNarrowViewport}
      onToggle={onToggleWidget}
      onReset={onResetLayout}
    />
  );

  return (
    <div style={{ pointerEvents: 'auto' }}>
      {!isNarrowViewport && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', pointerEvents: 'none', zIndex: 50 }}>
          <div className="live-indicator" style={{ backdropFilter: 'blur(8px)' }}>
            <div className="pulsing-dot" />
            <span className="live-text">SIGNAL: NOMINAL</span>
          </div>
        </div>
      )}

      {(dataState === 'degraded' || dataState === 'offline') && (
        <div style={{ pointerEvents: 'auto', padding: '0 1rem' }}>
          <div className="glass-panel" style={{ borderColor: 'rgba(244, 180, 0, 0.45)', marginBottom: '1rem', padding: '0.85rem 1rem' }}>
            <strong style={{ color: '#f4b400', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
              DATA MODE: {dataState.toUpperCase()}
            </strong>
            {warnings.length > 0 && (
              <p style={{ marginTop: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {warnings[0]}
              </p>
            )}
          </div>
        </div>
      )}

      {isNarrowViewport ? (
        <div className="mobile-hud-stack">
          {hudControls}

          {visible.leaderboard && (
            <div className="glass-panel" style={{ padding: '0.9rem' }}>
              <LiveTiming
                data={leaderboard}
                title=""
                liveStatus={viewMode === 'LIVE' ? liveStatus : 'LIVE'}
                nextSession={viewMode === 'LIVE' ? nextSchedule : null}
              />
            </div>
          )}

          {visible.next_race_intelligence && (
            <div className="glass-panel" style={{ padding: '0.9rem' }}>
              <NextRaceIntelligence nextSession={nextRaceSchedule} compact />
            </div>
          )}

          {visible.live_race_telemetry && (
            <div className="glass-panel" style={{ padding: '0.9rem' }}>
              <LiveRaceTelemetryPanel nextSession={nextSchedule} compact />
            </div>
          )}

          {visible.focused_driver && session && (
            <div className="glass-panel" style={{ padding: '0.9rem' }}>
              <MaxTracker
                currentPos={leaderboard?.find((d) => d.name_acronym === 'VER')?.position || null}
                gap={leaderboard?.find((d) => d.name_acronym === 'VER')?.gap_to_leader || null}
                stats={maxStats}
              />
            </div>
          )}

          {visible.session_info && session && (
            <div className="glass-panel" style={{ padding: '0.9rem' }}>
              <SessionInfo session={session} />
            </div>
          )}

          {visible.data_pipeline && (
            <div className="glass-panel" style={{ padding: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  {viewMode === 'LIVE' ? 'SYNCHRONIZED' : 'ARCHIVED'}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  LATENCY: {latencyLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {hudControls}

          {visible.leaderboard && (
            <DraggableWidget
              key={`leaderboard-${layoutResetKey}`}
              id="leaderboard"
              title={viewMode === 'LIVE' ? 'LIVE TIMING & INTERVALS' : 'RACE CLASSIFICATION'}
              defaultX={340} defaultY={80} width={400} defaultHeight={620} minHeight={300}
              onClose={() => onToggleWidget('leaderboard', false)}
            >
              <LiveTiming
                data={leaderboard}
                title=""
                liveStatus={viewMode === 'LIVE' ? liveStatus : 'LIVE'}
                nextSession={viewMode === 'LIVE' ? nextSchedule : null}
              />
            </DraggableWidget>
          )}

          {visible.live_race_telemetry && (
            <DraggableWidget
              key={`live_race_telemetry-${layoutResetKey}`}
              id="live_race_telemetry"
              title="LIVE RACE TELEMETRY"
              defaultX={760} defaultY={80} width={560} defaultHeight={620} minWidth={400} minHeight={360}
              onClose={() => onToggleWidget('live_race_telemetry', false)}
            >
              <LiveRaceTelemetryPanel nextSession={nextSchedule} />
            </DraggableWidget>
          )}

          {visible.next_race_intelligence && (
            <DraggableWidget
              key={`next_race_intelligence-${layoutResetKey}`}
              id="next_race_intelligence"
              title="NEXT RACE INTELLIGENCE"
              defaultX={760} defaultY={720} width={560} defaultHeight={480} minWidth={400} minHeight={320}
              onClose={() => onToggleWidget('next_race_intelligence', false)}
            >
              <NextRaceIntelligence nextSession={nextRaceSchedule} />
            </DraggableWidget>
          )}

          {visible.focused_driver && (
            <DraggableWidget
              key={`focused_driver-${layoutResetKey}`}
              id="focused_driver"
              title="DRIVER FOCUS"
              defaultX={rightRailX} defaultY={80} width={340} defaultHeight={360} minHeight={270}
              onClose={() => onToggleWidget('focused_driver', false)}
            >
              {session && (
                <MaxTracker
                  currentPos={leaderboard?.find((d) => d.name_acronym === 'VER')?.position || null}
                  gap={leaderboard?.find((d) => d.name_acronym === 'VER')?.gap_to_leader || null}
                  stats={maxStats}
                />
              )}
            </DraggableWidget>
          )}

          {visible.session_info && (
            <DraggableWidget
              key={`session_info-${layoutResetKey}`}
              id="session_info"
              title="SESSION"
              defaultX={rightRailX} defaultY={460} width={340} defaultHeight={260} minHeight={220}
              onClose={() => onToggleWidget('session_info', false)}
            >
              {session && <SessionInfo session={session} />}
            </DraggableWidget>
          )}

          {visible.data_pipeline && (
            <DraggableWidget
              key={`data_pipeline-${layoutResetKey}`}
              id="data_pipeline"
              title="PIPELINE"
              defaultX={rightRailX} defaultY={740} width={340} defaultHeight={120} minHeight={100}
              onClose={() => onToggleWidget('data_pipeline', false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                  {viewMode === 'LIVE' ? 'SYNCHRONIZED' : 'ARCHIVED'}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  LATENCY: {latencyLabel}
                </span>
              </div>
            </DraggableWidget>
          )}
        </>
      )}
    </div>
  );
}
