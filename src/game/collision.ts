import { GridMap, cellAt, isDoorCell } from '../engine/raycast';

export type SolidFn = (map: GridMap, cx: number, cy: number) => boolean;

/** Las puertas dejan de ser sólidas cuando están casi abiertas. */
export const DOOR_PASSABLE = 0.8;

export const defaultSolid: SolidFn = (map, cx, cy) => {
  const c = cellAt(map, cx, cy);
  if (c === 0) return false;
  if (map.doorOpen !== undefined && isDoorCell(c)) return map.doorOpen[cy * map.width + cx] < DOOR_PASSABLE;
  return true;
};

/** ¿Un círculo (x,y,r) toca alguna celda sólida? Distancia al punto más cercano de cada celda. */
export function circleHitsWall(map: GridMap, x: number, y: number, r: number, solid: SolidFn = defaultSolid): boolean {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r);
  const y1 = Math.floor(y + r);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (!solid(map, cx, cy)) continue;
      const nx = x < cx ? cx : x > cx + 1 ? cx + 1 : x;
      const ny = y < cy ? cy : y > cy + 1 ? cy + 1 : y;
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

export interface Pos {
  x: number;
  y: number;
}

/** Mueve `pos` por (dx,dy) deslizando por paredes (ejes separados). Muta `pos`. */
export function moveWithCollision(map: GridMap, pos: Pos, dx: number, dy: number, r: number, solid: SolidFn = defaultSolid): void {
  if (!circleHitsWall(map, pos.x + dx, pos.y, r, solid)) pos.x += dx;
  if (!circleHitsWall(map, pos.x, pos.y + dy, r, solid)) pos.y += dy;
}
