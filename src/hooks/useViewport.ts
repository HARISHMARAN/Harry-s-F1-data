"use client";

import { useEffect, useState } from 'react';

const NARROW_BREAKPOINT = 1100;

export function useViewport() {
  const [viewportWidth, setViewportWidth] = useState(1440);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    viewportWidth,
    isNarrowViewport: viewportWidth < NARROW_BREAKPOINT,
    rightRailX: Math.max(20, viewportWidth - 380),
  };
}
