export interface Listener {
  x: number;
  y: number;
  /** Ángulo de la mirada (rad); positivo = hacia la derecha (misma convención que Player). */
  angle: number;
}

export interface Spatial {
  /** -1 (izquierda) a 1 (derecha). */
  pan: number;
  /** 0..1 */
  gain: number;
}

/** Paneo por dirección y atenuación por distancia de una fuente respecto al jugador. Función pura. */
export function spatialParams(l: Listener, sx: number, sy: number, maxDist = 14): Spatial {
  const dx = sx - l.x;
  const dy = sy - l.y;
  const dist = Math.hypot(dx, dy);
  const rel = Math.atan2(dy, dx) - l.angle;
  const pan = dist < 0.3 ? 0 : Math.sin(rel);
  const t = Math.max(0, 1 - dist / maxDist);
  return { pan, gain: t * t };
}
