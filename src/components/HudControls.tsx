"use client";

import { HUD_WIDGET_OPTIONS, type HudVisibility, type HudWidgetId } from '../hooks/useHudLayout';

interface HudControlsProps {
  visible: HudVisibility;
  isNarrowViewport: boolean;
  onToggle: (id: HudWidgetId, checked: boolean) => void;
  onReset: () => void;
}

export default function HudControls({ visible, isNarrowViewport, onToggle, onReset }: HudControlsProps) {
  return (
    <div
      className="glass-panel"
      style={{
        position: isNarrowViewport ? 'relative' : 'fixed',
        top: isNarrowViewport ? undefined : '18.25rem',
        left: isNarrowViewport ? undefined : '1.5rem',
        zIndex: 90,
        width: isNarrowViewport ? '100%' : 300,
        padding: '0.8rem',
        pointerEvents: 'auto',
        display: 'grid',
        gap: '0.65rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <strong style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          HUD Controls
        </strong>
        <button
          type="button"
          onClick={onReset}
          style={{
            border: '1px solid var(--border-light)',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-secondary)',
            padding: '0.25rem 0.55rem',
            fontSize: '0.7rem',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrowViewport ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '0.45rem' }}>
        {HUD_WIDGET_OPTIONS.map((option) => (
          <label
            key={option.id}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.25 }}
          >
            <input
              type="checkbox"
              checked={visible[option.id]}
              onChange={(e) => onToggle(option.id, e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
