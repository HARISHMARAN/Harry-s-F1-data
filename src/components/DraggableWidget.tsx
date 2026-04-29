import React, { useState, useRef, useEffect } from 'react';

interface DraggableWidgetProps {
  id: string;
  title: string;
  defaultX: number;
  defaultY: number;
  width?: number;
  children: React.ReactNode;
}

const LAYOUT_VERSION = 'miami-live-telemetry-v1';

export default function DraggableWidget({ id, title, defaultX, defaultY, width, children }: DraggableWidgetProps) {
  const storageKey = `hud_widget_${LAYOUT_VERSION}_${id}`;
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const positionRef = useRef(position);
  const hasSavedPositionRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const frameId = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { x?: number; y?: number };
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const widgetWidth = width ?? 360;
            const boundedX = Math.max(16, Math.min(parsed.x, window.innerWidth - widgetWidth - 16));
            const boundedY = Math.max(16, Math.min(parsed.y, window.innerHeight - 120));
            hasSavedPositionRef.current = true;
            setPosition({ x: boundedX, y: boundedY });
            return;
          }
        } catch {
          // Ignore invalid saved positions and fall back to this layout version.
        }
      }

      hasSavedPositionRef.current = false;
      setPosition({ x: defaultX, y: defaultY });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [defaultX, defaultY, storageKey, width]);

  useEffect(() => {
    if (hasSavedPositionRef.current) return;
    if (typeof window === 'undefined') return;
    const frameId = window.requestAnimationFrame(() => setPosition({ x: defaultX, y: defaultY }));
    return () => window.cancelAnimationFrame(frameId);
  }, [defaultX, defaultY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      // Snap to 20px grid
      const newX = Math.round((dragRef.current.initialX + dx) / 20) * 20;
      const newY = Math.round((dragRef.current.initialY + dy) / 20) * 20;
      
      const widgetWidth = width ?? 360;
      const boundedX = Math.max(16, Math.min(newX, window.innerWidth - widgetWidth - 16));
      const boundedY = Math.max(16, Math.min(newY, window.innerHeight - 120));
      
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position when dragging ends
      if (typeof window !== 'undefined') {
        hasSavedPositionRef.current = true;
        window.localStorage.setItem(storageKey, JSON.stringify(positionRef.current));
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, storageKey, width]);

  return (
    <div
      className={`hud-widget ${isDragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y, width }}
    >
      <div className="hud-widget-header" onMouseDown={handleMouseDown}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', userSelect: 'none' }}>{title}</span>
      </div>
      <div className="hud-widget-content" style={{ padding: '12px' }}>
        {children}
      </div>
    </div>
  );
}
