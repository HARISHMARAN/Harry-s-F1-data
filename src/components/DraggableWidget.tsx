import React, { useState, useRef, useEffect } from 'react';

interface DraggableWidgetProps {
  id: string;
  title: string;
  defaultX: number;
  defaultY: number;
  children: React.ReactNode;
}

export default function DraggableWidget({ id, title, defaultX, defaultY, children }: DraggableWidgetProps) {
  // Load saved position from localStorage, or use default
  const getInitialPosition = () => {
    const saved = localStorage.getItem(`hud_widget_${id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: defaultX, y: defaultY };
      }
    }
    return { x: defaultX, y: defaultY };
  };

  const [position, setPosition] = useState(getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

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
      
      const boundedX = Math.max(0, Math.min(newX, window.innerWidth - 100));
      const boundedY = Math.max(0, Math.min(newY, window.innerHeight - 100));
      
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position when dragging ends
      localStorage.setItem(`hud_widget_${id}`, JSON.stringify(position));
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id, position]);

  return (
    <div
      className={`hud-widget ${isDragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
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
