import React, { useState, useRef, useEffect } from 'react';

interface DraggableWidgetProps {
  id: string;
  title: string;
  defaultX: number;
  defaultY: number;
  width?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
}

const LAYOUT_VERSION = 'miami-live-telemetry-v3';

type WidgetLayout = {
  x: number;
  y: number;
  width: number;
  height?: number;
};

export default function DraggableWidget({
  id,
  title,
  defaultX,
  defaultY,
  width,
  defaultHeight,
  minWidth = 260,
  minHeight = 160,
  children,
}: DraggableWidgetProps) {
  const storageKey = `hud_widget_${LAYOUT_VERSION}_${id}`;
  const defaultWidth = width ?? 360;
  const [layout, setLayout] = useState<WidgetLayout>({ x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; initialWidth: number; initialHeight: number } | null>(null);
  const layoutRef = useRef(layout);
  const hasSavedPositionRef = useRef(false);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const frameId = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<WidgetLayout>;
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const widgetWidth = typeof parsed.width === 'number' ? parsed.width : defaultWidth;
            const boundedWidth = Math.max(minWidth, Math.min(widgetWidth, window.innerWidth - 32));
            const boundedHeight = typeof parsed.height === 'number'
              ? Math.max(minHeight, Math.min(parsed.height, window.innerHeight - 80))
              : defaultHeight;
            const boundedX = Math.max(16, Math.min(parsed.x, window.innerWidth - boundedWidth - 16));
            const boundedY = Math.max(16, Math.min(parsed.y, window.innerHeight - 120));
            hasSavedPositionRef.current = true;
            setLayout({ x: boundedX, y: boundedY, width: boundedWidth, height: boundedHeight });
            return;
          }
        } catch {
          // Ignore invalid saved positions and fall back to this layout version.
        }
      }

      hasSavedPositionRef.current = false;
      setLayout({ x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [defaultHeight, defaultWidth, defaultX, defaultY, minHeight, minWidth, storageKey]);

  useEffect(() => {
    if (hasSavedPositionRef.current) return;
    if (typeof window === 'undefined') return;
    const frameId = window.requestAnimationFrame(() => setLayout({ x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight }));
    return () => window.cancelAnimationFrame(frameId);
  }, [defaultHeight, defaultWidth, defaultX, defaultY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: layout.x,
      initialY: layout.y
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: layout.width,
      initialHeight: layout.height ?? minHeight,
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
      
      const widgetWidth = layoutRef.current.width;
      const boundedX = Math.max(16, Math.min(newX, window.innerWidth - widgetWidth - 16));
      const boundedY = Math.max(16, Math.min(newY, window.innerHeight - 120));
      
      setLayout((current) => ({ ...current, x: boundedX, y: boundedY }));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position when dragging ends
      if (typeof window !== 'undefined') {
        hasSavedPositionRef.current = true;
        window.localStorage.setItem(storageKey, JSON.stringify(layoutRef.current));
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
  }, [isDragging, storageKey]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      const maxWidth = window.innerWidth - layoutRef.current.x - 16;
      const maxHeight = window.innerHeight - layoutRef.current.y - 80;
      const nextWidth = Math.round((resizeRef.current.initialWidth + dx) / 20) * 20;
      const nextHeight = Math.round((resizeRef.current.initialHeight + dy) / 20) * 20;

      setLayout((current) => ({
        ...current,
        width: Math.max(minWidth, Math.min(nextWidth, maxWidth)),
        height: Math.max(minHeight, Math.min(nextHeight, maxHeight)),
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (typeof window !== 'undefined') {
        hasSavedPositionRef.current = true;
        window.localStorage.setItem(storageKey, JSON.stringify(layoutRef.current));
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minHeight, minWidth, storageKey]);

  return (
    <div
      className={`hud-widget ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{ left: layout.x, top: layout.y, width: layout.width, height: layout.height }}
    >
      <div className="hud-widget-header" onMouseDown={handleMouseDown}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', userSelect: 'none' }}>{title}</span>
      </div>
      <div className="hud-widget-content" style={{ padding: '12px' }}>
        {children}
      </div>
      <button
        type="button"
        className="hud-widget-resize"
        aria-label={`Resize ${title}`}
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}
