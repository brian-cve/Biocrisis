import { describe, expect, it } from 'vitest';
import { CELL_EXIT, castRay, isDoorCell, makeRayHit } from '../src/engine/raycast';
import { Doors } from '../src/game/doors';
import { HOUSE_ROWS, START, createHouse } from '../src/game/map';
import { circleHitsWall } from '../src/game/collision';

describe('la casa', () => {
  const map = createHouse();

  it('mide 20x20 y tiene borde sólido', () => {
    expect(map.width).toBe(20);
    expect(map.height).toBe(20);
    for (let i = 0; i < 20; i++) {
      for (const [x, y] of [[i, 0], [i, 19], [0, i], [19, i]]) expect(map.cells[y * 20 + x]).not.toBe(0);
    }
  });

  it('todas las celdas de pared usan ids válidos (1-5)', () => {
    for (const r of HOUSE_ROWS) for (const ch of r) expect(Number(ch)).toBeLessThanOrEqual(5);
  });

  it('el inicio está libre y la puerta de salida se ve desde él', () => {
    expect(circleHitsWall(map, START.x, START.y, 0.25)).toBe(false);
    const h = castRay(map, START.x, START.y, Math.cos(START.angle), Math.sin(START.angle), makeRayHit());
    expect(h.cell).toBe(CELL_EXIT);
  });

  it('todo el interior es alcanzable desde el inicio (BFS, puertas pasables)', () => {
    const seen = new Set<number>();
    const q = [[Math.floor(START.x), Math.floor(START.y)]];
    seen.add(q[0][1] * 20 + q[0][0]);
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= 20 || ny >= 20) continue;
        const c = map.cells[ny * 20 + nx];
        if ((c !== 0 && !isDoorCell(c)) || seen.has(ny * 20 + nx)) continue;
        seen.add(ny * 20 + nx);
        if (c !== CELL_EXIT) q.push([nx, ny]);
      }
    }
    for (let y = 1; y < 19; y++) {
      for (let x = 1; x < 19; x++) {
        const c = map.cells[y * 20 + x];
        if (c === 0) expect(seen.has(y * 20 + x), `celda libre inalcanzable (${x},${y})`).toBe(true);
      }
    }
  });
});

describe('puertas', () => {
  it('se abren con animación y dejan pasar al jugador', () => {
    const map = createHouse();
    const doors = new Doors(map);
    expect(circleHitsWall(map, 8.5, 15.5, 0.25)).toBe(true);
    expect(doors.use(8, 15)).toBe('opened');
    for (let i = 0; i < 90; i++) doors.update(1 / 60);
    expect(map.doorOpen![15 * 20 + 8]).toBe(1);
    expect(circleHitsWall(map, 8.5, 15.5, 0.25)).toBe(false);
  });

  it('un rayo cruza el hueco de una puerta abierta pero no la cerrada', () => {
    const map = createHouse();
    const doors = new Doors(map);
    const closed = castRay(map, 6.5, 15.5, 1, 0, makeRayHit());
    expect(closed.cell).toBe(4);
    doors.use(8, 15);
    for (let i = 0; i < 90; i++) doors.update(1 / 60);
    const open = castRay(map, 6.5, 15.5, 1, 0, makeRayHit());
    expect(open.mapX).toBeGreaterThan(8);
  });

  it('la puerta de salida sigue cerrada (con llave)', () => {
    const doors = new Doors(createHouse());
    expect(doors.use(0, 15)).toBe('locked');
    doors.unlock(0, 15);
    expect(doors.use(0, 15)).toBe('opened');
  });

  it('no se cierra si hay alguien en la celda', () => {
    const doors = new Doors(createHouse());
    doors.use(8, 15);
    expect(doors.use(8, 15, () => true)).toBe('blocked');
  });
});
