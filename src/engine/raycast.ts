
export interface GridMap {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly doorOpen?: Float32Array;
  readonly floors?: Uint8Array;
}

const CELL_DOOR = 4;
export const CELL_EXIT = 5;
export const CELL_BOSS_DOOR = 6;

export function isDoorCell(cell: number): boolean {
  return cell === CELL_DOOR || cell === CELL_EXIT || cell === CELL_BOSS_DOOR;
}

export interface Camera {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
}

export interface RayHit {
  ox: number;
  oy: number;
  rdx: number;
  rdy: number;
  cell: number;
  mapX: number;
  mapY: number;
  side: 0 | 1;
  dist: number;
  wallX: number;
}

export function makeRayHit(): RayHit {
  return { ox: 0.5, oy: 0.5, rdx: 1.5, rdy: 0.5, cell: 0, mapX: 0, mapY: 0, side: 0, dist: Infinity, wallX: 0.5 };
}

export function cellAt(map: GridMap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 1;
  return map.cells[y * map.width + x];
}

const MAX_DIST = 64;

export function castRay(map: GridMap, ox: number, oy: number, rdx: number, rdy: number, out: RayHit): RayHit {
  out.ox = ox;
  out.oy = oy;
  out.rdx = rdx;
  out.rdy = rdy;
  return castHit(map, out);
}

export function castHit(map: GridMap, out: RayHit): RayHit {
  const ox = out.ox;
  const oy = out.oy;
  const rdx = out.rdx;
  const rdy = out.rdy;
  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);
  const dDistX = rdx === 0 ? Infinity : Math.abs(1 / rdx);
  const dDistY = rdy === 0 ? Infinity : Math.abs(1 / rdy);
  let stepX: number, stepY: number, sideX: number, sideY: number;
  if (rdx < 0) {
    stepX = -1;
    sideX = (ox - mapX) * dDistX;
  } else {
    stepX = 1;
    sideX = (mapX + 1 - ox) * dDistX;
  }
  if (rdy < 0) {
    stepY = -1;
    sideY = (oy - mapY) * dDistY;
  } else {
    stepY = 1;
    sideY = (mapY + 1 - oy) * dDistY;
  }
  let side: 0 | 1 = 0;
  let cell = 0;
  for (let i = 0; i < 256; i++) {
    if (sideX < sideY) {
      sideX += dDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += dDistY;
      mapY += stepY;
      side = 1;
    }
    cell = cellAt(map, mapX, mapY);
    if (cell === 0) continue;
    if (map.doorOpen !== undefined && isDoorCell(cell)) {
      const o = map.doorOpen[mapY * map.width + mapX];
      if (o > 0) {
        const d = side === 0 ? sideX - dDistX : sideY - dDistY;
        let wx = side === 0 ? oy + d * rdy : ox + d * rdx;
        wx -= Math.floor(wx);
        if (wx < o) {
          cell = 0;
          continue;
        }
      }
    }
    break;
  }
  const dist = side === 0 ? sideX - dDistX : sideY - dDistY;
  let wallX = side === 0 ? oy + dist * rdy : ox + dist * rdx;
  wallX -= Math.floor(wallX);
  out.cell = cell;
  out.mapX = mapX;
  out.mapY = mapY;
  out.side = side;
  out.dist = dist > MAX_DIST ? MAX_DIST : dist;
  out.wallX = wallX;
  return out;
}
