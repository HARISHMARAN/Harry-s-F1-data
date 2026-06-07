"use client";

import { useEffect, useState } from 'react';

export const HUD_WIDGET_OPTIONS = [
  { id: 'leaderboard', label: 'Live timing' },
  { id: 'live_race_telemetry', label: 'Live race telemetry' },
  { id: 'next_race_intelligence', label: 'Previous winners + prediction' },
  { id: 'focused_driver', label: 'Driver focus' },
  { id: 'session_info', label: 'Session info' },
  { id: 'data_pipeline', label: 'Pipeline' },
] as const;

export type HudWidgetId = typeof HUD_WIDGET_OPTIONS[number]['id'];
export type HudVisibility = Record<HudWidgetId, boolean>;

const VISIBILITY_KEY = 'hud_widget_visibility_f1-hud-v5';
const LAYOUT_PREFIX = 'hud_widget_f1-hud-v5_';
const TRACKED_DRIVER_KEY = 'hud_tracked_driver_f1-hud-v5';
const DEFAULT_TRACKED_DRIVER = 'VER';

export const DEFAULT_HUD_VISIBILITY: HudVisibility = {
  leaderboard: true,
  live_race_telemetry: true,
  next_race_intelligence: true,
  focused_driver: false,
  session_info: false,
  data_pipeline: false,
};

function readHudVisibility(): HudVisibility {
  if (typeof window === 'undefined') return DEFAULT_HUD_VISIBILITY;
  const saved = window.localStorage.getItem(VISIBILITY_KEY);
  if (!saved) return DEFAULT_HUD_VISIBILITY;
  try {
    const parsed = JSON.parse(saved) as Partial<Record<HudWidgetId, boolean>>;
    return HUD_WIDGET_OPTIONS.reduce((acc, option) => ({
      ...acc,
      [option.id]: typeof parsed[option.id] === 'boolean' ? parsed[option.id] : DEFAULT_HUD_VISIBILITY[option.id],
    }), DEFAULT_HUD_VISIBILITY);
  } catch {
    return DEFAULT_HUD_VISIBILITY;
  }
}

function readTrackedDriver(): string {
  if (typeof window === 'undefined') return DEFAULT_TRACKED_DRIVER;
  return window.localStorage.getItem(TRACKED_DRIVER_KEY) ?? DEFAULT_TRACKED_DRIVER;
}

export function useHudLayout() {
  const [visible, setVisible] = useState<HudVisibility>(DEFAULT_HUD_VISIBILITY);
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const [trackedDriver, setTrackedDriverState] = useState<string>(DEFAULT_TRACKED_DRIVER);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setVisible(readHudVisibility());
      setTrackedDriverState(readTrackedDriver());
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const updateVisibility = (id: HudWidgetId, checked: boolean) => {
    setVisible((current) => {
      const next = { ...current, [id]: checked };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(VISIBILITY_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const setTrackedDriver = (acronym: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TRACKED_DRIVER_KEY, acronym);
    }
    setTrackedDriverState(acronym);
  };

  const resetLayout = () => {
    if (typeof window !== 'undefined') {
      HUD_WIDGET_OPTIONS.forEach((option) =>
        window.localStorage.removeItem(`${LAYOUT_PREFIX}${option.id}`)
      );
      window.localStorage.setItem(VISIBILITY_KEY, JSON.stringify(DEFAULT_HUD_VISIBILITY));
      window.localStorage.removeItem(TRACKED_DRIVER_KEY);
    }
    setVisible(DEFAULT_HUD_VISIBILITY);
    setTrackedDriverState(DEFAULT_TRACKED_DRIVER);
    setLayoutResetKey((k) => k + 1);
  };

  return { visible, layoutResetKey, trackedDriver, updateVisibility, setTrackedDriver, resetLayout };
}
