export interface Listener {
  x: number;
  y: number;
  angle: number;
}

export interface Spatial {
  pan: number;
  gain: number;
}

export function spatialParams(l: Listener, sx: number, sy: number, maxDist = 14): Spatial {
  const dx = sx - l.x;
  const dy = sy - l.y;
  const dist = Math.hypot(dx, dy);
  const rel = Math.atan2(dy, dx) - l.angle;
  const pan = dist < 0.3 ? 0 : Math.sin(rel);
  const t = Math.max(0, 1 - dist / maxDist);
  return { pan, gain: t * t };
}
