"use client";

import { useEffect, useRef, useState } from "react";

export function useReplay(speed = 1) {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const lastFrame = useRef<number | null>(null);

  useEffect(() => {
    let frame: number;

    function loop(now: number) {
      if (lastFrame.current === null) {
        lastFrame.current = now;
      }

      if (isPlaying) {
        const delta = (now - lastFrame.current) / 1000;
        setTime((prev) => prev + delta * speed);
      }

      lastFrame.current = now;
      frame = requestAnimationFrame(loop);
    }

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, speed]);

  return { time, isPlaying, setIsPlaying };
}
