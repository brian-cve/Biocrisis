import { describe, expect, it } from 'vitest';
import { spatialParams } from '../src/audio/spatial';

const L = { x: 10, y: 10, angle: 0 };

describe('audio espacial', () => {
  it('una fuente delante está centrada; a la derecha panea +; a la izquierda panea −', () => {
    expect(spatialParams(L, 14, 10).pan).toBeCloseTo(0, 5);
    expect(spatialParams(L, 10, 14).pan).toBeCloseTo(1, 5);
    expect(spatialParams(L, 10, 6).pan).toBeCloseTo(-1, 5);
  });
  it('el paneo sigue la orientación del jugador', () => {
    const turned = { ...L, angle: Math.PI / 2 };
    expect(spatialParams(turned, 10, 14).pan).toBeCloseTo(0, 5);
    expect(spatialParams(turned, 6, 10).pan).toBeCloseTo(1, 5);
  });
  it('atenúa con la distancia hasta el silencio', () => {
    const near = spatialParams(L, 11, 10).gain;
    const mid = spatialParams(L, 17, 10).gain;
    const far = spatialParams(L, 30, 10).gain;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBe(0);
  });
  it('a quemarropa no panea bruscamente', () => {
    expect(spatialParams(L, 10.05, 10.05).pan).toBe(0);
  });
});
