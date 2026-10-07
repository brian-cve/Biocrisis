import { GridMap, castRay, makeRayHit } from '../engine/raycast';

const hit = makeRayHit();

/** ¿Hay línea de visión libre entre dos puntos? Las puertas cerradas bloquean; las abiertas no. Sin asignaciones. */
export function hasLineOfSight(map: GridMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return true;
  castRay(map, x0, y0, dx / len, dy / len, hit);
  return hit.dist >= len - 0.001;
}
