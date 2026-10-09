import { describe, expect, it } from 'vitest';
import { castRay, makeRayHit } from '../src/engine/raycast';
import { parseMap } from '../src/game/map';

const room = parseMap(['11111', '10001', '10001', '10001', '11111']);

describe('castRay (DDA)', () => {
  it('measures the distance to a front wall', () => {
    const h = castRay(room, 1.5, 2.5, 1, 0, makeRayHit());
    expect(h.dist).toBeCloseTo(2.5, 5);
    expect(h.side).toBe(0);
    expect(h.mapX).toBe(4);
  });

  it('detects N/S faces as side 1', () => {
    const h = castRay(room, 2.5, 2.5, 0, -1, makeRayHit());
    expect(h.side).toBe(1);
    expect(h.dist).toBeCloseTo(1.5, 5);
  });

  it('uses perpendicular distance: no fisheye on oblique rays', () => {
    const a = castRay(room, 1.5, 2.5, 1, 0, makeRayHit()).dist;
    const b = castRay(room, 1.5, 2.5, 1, 0.5, makeRayHit()).dist;
    expect(b).toBeCloseTo(a, 5);
  });

  it('wallX is in [0,1)', () => {
    const h = castRay(room, 1.5, 2.2, 1, 0, makeRayHit());
    expect(h.wallX).toBeCloseTo(0.2, 5);
  });

  it('treats the outside of the map as solid', () => {
    const open = parseMap(['000', '000', '000']);
    const h = castRay(open, 1.5, 1.5, 1, 0, makeRayHit());
    expect(h.cell).toBe(1);
    expect(h.dist).toBeCloseTo(1.5, 5);
  });
});
