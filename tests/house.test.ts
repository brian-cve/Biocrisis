import { describe, expect, it } from 'vitest';
import { CELL_BOSS_DOOR, CELL_EXIT, castRay, isDoorCell, makeRayHit } from '../src/engine/raycast';
import { Doors } from '../src/game/doors';
import { HOUSE_ROWS, START, createHouse } from '../src/game/map';
import { circleHitsWall } from '../src/game/collision';

describe('the house', () => {
  const map = createHouse();

  it('is 20x35 (house + boss arena) and has a solid border', () => {
    expect(map.width).toBe(20);
    expect(map.height).toBe(35);
    for (let x = 0; x < 20; x++) for (const y of [0, 34]) expect(map.cells[y * 20 + x]).not.toBe(0);
    for (let y = 0; y < 35; y++) for (const x of [0, 19]) expect(map.cells[y * 20 + x]).not.toBe(0);
  });

  it('all wall cells use valid ids (1-6)', () => {
    for (const r of HOUSE_ROWS) for (const ch of r) expect(Number(ch)).toBeLessThanOrEqual(6);
  });

  it('the start is free and the arena door is visible from it', () => {
    expect(circleHitsWall(map, START.x, START.y, 0.25)).toBe(false);
    const h = castRay(map, START.x, START.y, Math.cos(START.angle), Math.sin(START.angle), makeRayHit());
    expect(h.cell).toBe(CELL_BOSS_DOOR);
  });

  it('the whole interior is reachable from the start (BFS, passable doors)', () => {
    const seen = new Set<number>();
    const q = [[Math.floor(START.x), Math.floor(START.y)]];
    seen.add(q[0][1] * 20 + q[0][0]);
    const H = map.height;
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= 20 || ny >= H) continue;
        const c = map.cells[ny * 20 + nx];
        if ((c !== 0 && !isDoorCell(c)) || seen.has(ny * 20 + nx)) continue;
        seen.add(ny * 20 + nx);
        if (c !== CELL_EXIT) q.push([nx, ny]);
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < 19; x++) {
        const c = map.cells[y * 20 + x];
        if (c === 0) expect(seen.has(y * 20 + x), `celda libre inalcanzable (${x},${y})`).toBe(true);
      }
    }
  });
});

describe('doors', () => {
  it('open with animation and let the player through', () => {
    const map = createHouse();
    const doors = new Doors(map);
    expect(circleHitsWall(map, 8.5, 15.5, 0.25)).toBe(true);
    expect(doors.use(8, 15)).toBe('opened');
    for (let i = 0; i < 90; i++) doors.update(1 / 60);
    expect(map.doorOpen![15 * 20 + 8]).toBe(1);
    expect(circleHitsWall(map, 8.5, 15.5, 0.25)).toBe(false);
  });

  it('a ray crosses the gap of an open door but not a closed one', () => {
    const map = createHouse();
    const doors = new Doors(map);
    const closed = castRay(map, 6.5, 15.5, 1, 0, makeRayHit());
    expect(closed.cell).toBe(4);
    doors.use(8, 15);
    for (let i = 0; i < 90; i++) doors.update(1 / 60);
    const open = castRay(map, 6.5, 15.5, 1, 0, makeRayHit());
    expect(open.mapX).toBeGreaterThan(8);
  });

  it('the arena door and the real exit start locked', () => {
    const doors = new Doors(createHouse());
    expect(doors.use(3, 19)).toBe('locked');
    expect(doors.use(9, 34)).toBe('locked');
    doors.unlock(3, 19);
    expect(doors.use(3, 19)).toBe('opened');
    expect(doors.at(3, 19)!.boss).toBe(true);
    expect(doors.at(9, 34)!.exit).toBe(true);
  });

  it('does not close if someone is in the cell', () => {
    const doors = new Doors(createHouse());
    doors.use(8, 15);
    expect(doors.use(8, 15, () => true)).toBe('blocked');
  });
});
