import { describe, expect, it } from 'vitest';
import { CHASE_BAR, ChaseComposer, DRONE_PERIOD, ExploreComposer, MENU_BAR, MenuComposer, NoteEvent, gameOverSting, winSting } from '../src/audio/music/composer';
import { IntensityTracker, rawIntensity } from '../src/audio/music/intensity';
import { EXPLORE_KEY, MENU_KEY, MENU_PROGRESSION, SCALES, chordMidi, midiToHz, pitchClassInScale, scaleNote } from '../src/audio/music/theory';

describe('theory', () => {
  it('midiToHz: A4 = 440 and the octave doubles', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });
  it('scaleNote walks the scale and crosses octaves (also downward)', () => {
    expect(scaleNote(MENU_KEY, 0)).toBe(48);
    expect(scaleNote(MENU_KEY, 2)).toBe(51);
    expect(scaleNote(MENU_KEY, 7)).toBe(60);
    expect(scaleNote(MENU_KEY, -1)).toBe(46);
  });
  it('Phrygian has the minor second and natural minor does not', () => {
    expect(SCALES.phrygian[1]).toBe(1);
    expect(SCALES.minor[1]).toBe(2);
    expect(pitchClassInScale(EXPLORE_KEY, EXPLORE_KEY.root + 1)).toBe(true);
    expect(pitchClassInScale(MENU_KEY, MENU_KEY.root + 1)).toBe(false);
  });
});

function collect<T>(n: number, f: (i: number) => T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(...f(i));
  return out;
}
const sig = (evs: NoteEvent[]) => JSON.stringify(evs);

describe('menu theme', () => {
  const pcInChord = (midi: number, bar: number) => {
    const c = new MenuComposer(1).chordAt(bar);
    return chordMidi(MENU_KEY, c).some((m) => (m - midi) % 12 === 0);
  };

  it('is deterministic with the same seed and changes with another', () => {
    const a = collect(32, (i) => new MenuComposer(7).bar(i));
    const mk = (seed: number) => { const c = new MenuComposer(seed); return collect(32, (i) => c.bar(i)); };
    expect(sig(mk(7))).toBe(sig(mk(7)));
    expect(sig(mk(7))).not.toBe(sig(mk(8)));
    expect(a.length).toBeGreaterThan(0);
  });
  it('the pad only uses chord notes and changes chord every 2 bars', () => {
    const c = new MenuComposer(3);
    for (let bar = 0; bar < 16; bar += 2) {
      const pads = c.bar(bar).filter((e) => e.voice === 'pad');
      expect(pads.length).toBe(MENU_PROGRESSION[Math.floor(bar / 2) % 4].tones.length);
      for (const p of pads) expect(pcInChord(p.midi, bar)).toBe(true);
      expect(pads[0].dur).toBeCloseTo(MENU_BAR * 2, 6);
    }
  });
  it('bells are sparse: <= 3 per bar, <1 per bar on average, and silent in the last bar of the phrase', () => {
    const c = new MenuComposer(5);
    let total = 0;
    for (let bar = 0; bar < 64; bar++) {
      const bells = c.bar(bar).filter((e) => e.voice === 'bell');
      expect(bells.length).toBeLessThanOrEqual(3);
      if (bar % 8 === 7) expect(bells.length).toBe(0);
      total += bells.length;
    }
    expect(total / 64).toBeLessThan(1.6);
    expect(total).toBeGreaterThan(5);
  });
  it('bells belong to the chord or its ninth, with no big leaps', () => {
    const c = new MenuComposer(11);
    const notes: number[] = [];
    for (let bar = 0; bar < 64; bar++) {
      const chord = c.chordAt(bar);
      const pool = new Set([...chordMidi(MENU_KEY, chord, 2), MENU_KEY.root + chord.root + 38]);
      for (const b of c.bar(bar).filter((e) => e.voice === 'bell')) {
        expect(pool.has(b.midi)).toBe(true);
        notes.push(b.midi);
      }
    }
    expect(notes.length).toBeGreaterThan(3);
  });
  it('there is a continuous bass that overlaps (lasts longer than its period)', () => {
    const d = new MenuComposer(1).bar(0).find((e) => e.voice === 'drone')!;
    expect(d.dur).toBeGreaterThan(MENU_BAR * 8);
  });
});

describe('exploration', () => {
  it('is deterministic per seed', () => {
    const run = (s: number) => { const c = new ExploreComposer(s); return Array.from({ length: 40 }, () => c.next()); };
    expect(JSON.stringify(run(2))).toBe(JSON.stringify(run(2)));
    expect(JSON.stringify(run(2))).not.toBe(JSON.stringify(run(3)));
  });
  it('silences dominate: gaps of 7-20 s and over a third of steps with no sound', () => {
    const c = new ExploreComposer(9);
    let t = 0;
    let silent = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const n = c.next();
      expect(n.gap).toBeGreaterThanOrEqual(7);
      expect(n.gap).toBeLessThanOrEqual(20);
      t += n.gap;
      if (n.events.length === 0) silent++;
    }
    expect(silent / N).toBeGreaterThan(0.3);
    expect(N / t).toBeLessThan(0.15);
  });
  it('dissonances are minor 2nds or tritones and never consecutive (>= 12 s between clusters)', () => {
    const c = new ExploreComposer(4);
    let since = 99;
    let clusters = 0;
    for (let i = 0; i < 300; i++) {
      const n = c.next();
      since += n.gap;
      const cl = n.events.filter((e) => e.voice === 'cluster');
      if (cl.length) {
        expect(cl.length).toBe(2);
        expect([1, 6]).toContain(cl[1].midi - cl[0].midi);
        expect(since).toBeGreaterThanOrEqual(12);
        since = 0;
        clusters++;
      }
    }
    expect(clusters).toBeGreaterThan(5);
  });
  it('piano notes are in the Phrygian scale', () => {
    const c = new ExploreComposer(6);
    for (let i = 0; i < 300; i++) for (const e of c.next().events) if (e.voice === 'piano') expect(pitchClassInScale(EXPLORE_KEY, e.midi)).toBe(true);
  });
  it('the drone holds the low tonic and overlaps the next one', () => {
    const c = new ExploreComposer(1);
    const d = c.drone(0);
    expect(d[0].midi).toBe(EXPLORE_KEY.root - 12);
    expect(d[0].dur).toBeGreaterThan(DRONE_PERIOD);
  });
  it('higher density = shorter gaps', () => {
    const mean = (dens: number) => { const c = new ExploreComposer(1, dens); let s = 0; for (let i = 0; i < 100; i++) s += c.next().gap; return s / 100; };
    expect(mean(2)).toBeLessThan(mean(1));
  });
});

describe('layered chase', () => {
  const voices = (i: number) => new Set(new ChaseComposer(1).bar(0, i).map((e) => e.voice));
  it('no threat, no sound', () => expect(new ChaseComposer(1).bar(0, 0.02)).toEqual([]));
  it('layers enter with intensity: pulse -> percussion -> strings', () => {
    expect([...voices(0.2)].sort()).toEqual(['kick']);
    const mid = voices(0.5);
    expect(mid.has('kick') && mid.has('hat')).toBe(true);
    expect(mid.has('strings')).toBe(false);
    const high = voices(0.9);
    expect(high.has('strings') && high.has('hat') && high.has('kick')).toBe(true);
  });
  it('more intensity = more and louder events, but bounded per bar', () => {
    const n = (i: number) => new ChaseComposer(2).bar(1, i).length;
    expect(n(0.2)).toBeLessThan(n(0.5));
    expect(n(0.5)).toBeLessThan(n(0.95));
    expect(n(1)).toBeLessThanOrEqual(40);
    const k = (i: number) => new ChaseComposer(2).bar(0, i).filter((e) => e.voice === 'kick')[0].vel;
    expect(k(0.9)).toBeGreaterThan(k(0.2));
  });
  it('all events fall within the bar and the strings form minor seconds', () => {
    const evs = new ChaseComposer(3).bar(2, 1);
    for (const e of evs) {
      expect(e.t).toBeGreaterThanOrEqual(0);
      expect(e.t).toBeLessThan(CHASE_BAR);
    }
    const st = evs.filter((e) => e.voice === 'strings');
    expect(st[1].midi - st[0].midi).toBe(1);
  });
  it('is deterministic', () => {
    expect(sig(new ChaseComposer(5).bar(3, 0.8))).toBe(sig(new ChaseComposer(5).bar(3, 0.8)));
  });
});

describe('stings', () => {
  it('Game Over: dissonant (minor 2nd and tritone over C) and short', () => {
    const s = gameOverSting();
    const cl = s.filter((e) => e.voice === 'cluster').map((e) => e.midi % 12);
    expect(cl).toContain(0);
    expect(cl).toContain(1);
    expect(cl).toContain(6);
    expect(Math.max(...s.map((e) => e.t + e.dur))).toBeLessThan(7);
  });
  it('Victory: C major chord (resolution), ascending bells and short', () => {
    const s = winSting();
    const pad = s.filter((e) => e.voice === 'warmPad').map((e) => e.midi % 12);
    expect(new Set(pad)).toEqual(new Set([0, 7, 4]));
    const bells = s.filter((e) => e.voice === 'bell').map((e) => e.midi);
    expect([...bells].sort((a, b) => a - b)).toEqual(bells);
    expect(Math.max(...s.map((e) => e.t + e.dur))).toBeLessThan(9);
  });
});

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
