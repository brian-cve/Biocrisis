import { describe, expect, it } from 'vitest';
import { IntensityTracker, rawIntensity } from '../src/audio/music/intensity';

describe('adaptive intensity', () => {
  it('0 with no active zombies; chasing and attacking raise it; low health adds tension', () => {
    expect(rawIntensity([], 100)).toBe(0);
    const chase = rawIntensity([{ state: 'chase', dist: 8 }], 100);
    const near = rawIntensity([{ state: 'chase', dist: 1 }], 100);
    const atk = rawIntensity([{ state: 'attack', dist: 1 }], 100);
    expect(chase).toBeGreaterThan(0.3);
    expect(near).toBeGreaterThan(chase);
    expect(atk).toBeGreaterThan(near);
    expect(rawIntensity([{ state: 'chase', dist: 5 }], 20)).toBeGreaterThan(rawIntensity([{ state: 'chase', dist: 5 }], 100));
  });
  it('is capped at 1 with many zombies', () => {
    expect(rawIntensity(Array.from({ length: 6 }, () => ({ state: 'attack' as const, dist: 0.5 })), 10)).toBe(1);
  });
  it('rises fast and falls slowly as things calm down', () => {
    const t = new IntensityTracker(1.6, 8);
    for (let i = 0; i < 120; i++) t.update(0.9, 1 / 60);
    expect(t.value).toBeCloseTo(0.9, 1);
    for (let i = 0; i < 60 * 3; i++) t.update(0, 1 / 60);
    expect(t.value).toBeGreaterThan(0.4);
    for (let i = 0; i < 60 * 6; i++) t.update(0, 1 / 60);
    expect(t.value).toBe(0);
  });
});

describe('intensity from the world', () => {
  const z = (state: number, x: number) => ({ x, y: 0, state });
  it('ignores sleeping and dead zombies; counts alert/chase/attack', async () => {
    const { worldIntensity } = await import('../src/audio/music/intensity');
    const w = (zs: ReturnType<typeof z>[], hp = 100) => ({ hp, player: { x: 0, y: 0 }, zombies: zs });
    expect(worldIntensity(w([z(0, 1), z(4, 1)]))).toBe(0);
    expect(worldIntensity(w([z(1, 5)]))).toBeCloseTo(0.12, 5);
    expect(worldIntensity(w([z(2, 8)]))).toBeLessThan(worldIntensity(w([z(2, 1)])));
    expect(worldIntensity(w([z(3, 1)]))).toBeGreaterThan(worldIntensity(w([z(2, 1)])));
    expect(worldIntensity(w([z(2, 5)], 20))).toBeGreaterThan(worldIntensity(w([z(2, 5)], 100)));
  });
});
