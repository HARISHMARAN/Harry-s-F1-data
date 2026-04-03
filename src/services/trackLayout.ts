import type { ReplayTrackPoint } from '../types/f1';

const TRACK_WIDTH = 860;
const TRACK_HEIGHT = 560;
const TRACK_PADDING = 56;

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function generateTrackPoints(seed: string, pointCount = 140): ReplayTrackPoint[] {
  const rand = mulberry32(hashString(seed || 'default-track'));
  const rawPoints: ReplayTrackPoint[] = [];

  const width = 100;
  const height = 70;
  const cx = width / 2;
  const cy = height / 2;
  const w = width * (0.7 + rand() * 0.25);
  const h = height * (0.55 + rand() * 0.3);
  const wiggle = 6 + rand() * 6;

  const base = [
    { x: cx - w / 2, y: cy - h / 2 + rand() * wiggle },
    { x: cx - w / 4, y: cy - h / 2 - rand() * wiggle },
    { x: cx + w / 6, y: cy - h / 2 + rand() * wiggle },
    { x: cx + w / 2, y: cy - h / 2 + rand() * wiggle },
    { x: cx + w / 2 - rand() * wiggle, y: cy - h / 6 },
    { x: cx + w / 2 - rand() * wiggle, y: cy + h / 5 },
    { x: cx + w / 2 - rand() * wiggle, y: cy + h / 2 },
    { x: cx + w / 6, y: cy + h / 2 - rand() * wiggle },
    { x: cx - w / 4, y: cy + h / 2 + rand() * wiggle },
    { x: cx - w / 2, y: cy + h / 2 - rand() * wiggle },
    { x: cx - w / 2 + rand() * wiggle, y: cy + h / 6 },
    { x: cx - w / 2 + rand() * wiggle, y: cy - h / 6 },
  ];

  const segments = base.length;
  const stepsPerSegment = Math.max(Math.floor(pointCount / segments), 6);

  for (let i = 0; i < segments; i += 1) {
    const start = base[i];
    const end = base[(i + 1) % segments];
    for (let step = 0; step < stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      rawPoints.push({
        x: lerp(start.x, end.x, t),
        y: lerp(start.y, end.y, t),
      });
    }
  }

  return rawPoints;
}

export function normalizeTrack(points: ReplayTrackPoint[]) {
  if (points.length === 0) {
    return [];
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (TRACK_WIDTH - TRACK_PADDING * 2) / width,
    (TRACK_HEIGHT - TRACK_PADDING * 2) / height,
  );

  return points.map((point) => ({
    x: TRACK_PADDING + (point.x - minX) * scale,
    y: TRACK_HEIGHT - TRACK_PADDING - (point.y - minY) * scale,
  }));
}

export function buildTrackPath(points: ReplayTrackPoint[]) {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}
