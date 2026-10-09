import { describe, expect, it } from 'vitest';
import { castRay, makeRayHit } from '../src/engine/raycast';
import { parseMap } from '../src/game/map';

const room = parseMap(['11111', '10001', '10001', '10001', '11111']);

describe('castRay (DDA)', () => {
  it('mide la distancia a una pared frontal', () => {
    const h = castRay(room, 1.5, 2.5, 1, 0, makeRayHit());
    expect(h.dist).toBeCloseTo(2.5, 5);
    expect(h.side).toBe(0);
    expect(h.mapX).toBe(4);
  });

  it('detecta caras N/S como side 1', () => {
    const h = castRay(room, 2.5, 2.5, 0, -1, makeRayHit());
    expect(h.side).toBe(1);
    expect(h.dist).toBeCloseTo(1.5, 5);
  });

  it('usa distancia perpendicular: sin ojo de pez en rayos oblicuos', () => {
    const a = castRay(room, 1.5, 2.5, 1, 0, makeRayHit()).dist;
    const b = castRay(room, 1.5, 2.5, 1, 0.5, makeRayHit()).dist;
    expect(b).toBeCloseTo(a, 5);
  });

  it('wallX está en [0,1)', () => {
    const h = castRay(room, 1.5, 2.2, 1, 0, makeRayHit());
    expect(h.wallX).toBeCloseTo(0.2, 5);
  });

  it('trata el exterior del mapa como sólido', () => {
    const open = parseMap(['000', '000', '000']);
    const h = castRay(open, 1.5, 1.5, 1, 0, makeRayHit());
    expect(h.cell).toBe(1);
    expect(h.dist).toBeCloseTo(1.5, 5);
  });
});
