import { describe, expect, it } from 'vitest';
import { circleHitsWall, moveWithCollision } from '../src/game/collision';
import { parseMap } from '../src/game/map';

const map = parseMap(['11111', '10001', '10001', '10001', '11111']);

describe('colisiones círculo vs grilla', () => {
  it('no atraviesa paredes', () => {
    const p = { x: 3.5, y: 2.5 };
    moveWithCollision(map, p, 5, 0, 0.25);
    expect(p.x).toBeLessThan(4);
    expect(circleHitsWall(map, p.x, p.y, 0.25)).toBe(false);
  });

  it('desliza a lo largo de la pared', () => {
    const p = { x: 3.7, y: 2.0 };
    moveWithCollision(map, p, 0.5, 0.4, 0.25);
    expect(p.x).toBeCloseTo(3.7, 5);
    expect(p.y).toBeCloseTo(2.4, 5);
  });

  it('no atraviesa esquinas en diagonal', () => {
    const m = parseMap(['11111', '10001', '10101', '10001', '11111']);
    const p = { x: 1.6, y: 1.6 };
    for (let i = 0; i < 100; i++) moveWithCollision(m, p, 0.05, 0.05, 0.25);
    expect(circleHitsWall(m, p.x, p.y, 0.25)).toBe(false);
  });
});
