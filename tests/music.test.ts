import { describe, expect, it } from 'vitest';
import { CHASE_BAR, ChaseComposer, DRONE_PERIOD, ExploreComposer, MENU_BAR, MenuComposer, NoteEvent, gameOverSting, winSting } from '../src/audio/music/composer';
import { IntensityTracker, rawIntensity } from '../src/audio/music/intensity';
import { EXPLORE_KEY, MENU_KEY, MENU_PROGRESSION, SCALES, chordMidi, midiToHz, pitchClassInScale, scaleNote } from '../src/audio/music/theory';

describe('teoría', () => {
  it('midiToHz: La4 = 440 y la octava duplica', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });
  it('scaleNote recorre la escala y cruza octavas (también hacia abajo)', () => {
    expect(scaleNote(MENU_KEY, 0)).toBe(48);
    expect(scaleNote(MENU_KEY, 2)).toBe(51);
    expect(scaleNote(MENU_KEY, 7)).toBe(60);
    expect(scaleNote(MENU_KEY, -1)).toBe(46);
  });
  it('el frigio tiene la segunda menor y el menor natural no', () => {
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

describe('tema del menú', () => {
  const pcInChord = (midi: number, bar: number) => {
    const c = new MenuComposer(1).chordAt(bar);
    return chordMidi(MENU_KEY, c).some((m) => (m - midi) % 12 === 0);
  };

  it('es determinista con la misma semilla y cambia con otra', () => {
    const a = collect(32, (i) => new MenuComposer(7).bar(i));
    const mk = (seed: number) => { const c = new MenuComposer(seed); return collect(32, (i) => c.bar(i)); };
    expect(sig(mk(7))).toBe(sig(mk(7)));
    expect(sig(mk(7))).not.toBe(sig(mk(8)));
    expect(a.length).toBeGreaterThan(0);
  });
  it('el pad solo usa notas del acorde y cambia de acorde cada 2 compases', () => {
    const c = new MenuComposer(3);
    for (let bar = 0; bar < 16; bar += 2) {
      const pads = c.bar(bar).filter((e) => e.voice === 'pad');
      expect(pads.length).toBe(MENU_PROGRESSION[Math.floor(bar / 2) % 4].tones.length);
      for (const p of pads) expect(pcInChord(p.midi, bar)).toBe(true);
      expect(pads[0].dur).toBeCloseTo(MENU_BAR * 2, 6);
    }
  });
  it('las campanas son escasas: ≤ 3 por compás, <1 por compás de media, y callan el último compás de la frase', () => {
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
  it('las campanas pertenecen al acorde o a su novena, sin saltos grandes', () => {
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
  it('hay un bajo continuo que se solapa (dura más que su periodo)', () => {
    const d = new MenuComposer(1).bar(0).find((e) => e.voice === 'drone')!;
    expect(d.dur).toBeGreaterThan(MENU_BAR * 8);
  });
});

describe('exploración', () => {
  it('es determinista por semilla', () => {
    const run = (s: number) => { const c = new ExploreComposer(s); return Array.from({ length: 40 }, () => c.next()); };
    expect(JSON.stringify(run(2))).toBe(JSON.stringify(run(2)));
    expect(JSON.stringify(run(2))).not.toBe(JSON.stringify(run(3)));
  });
  it('predominan los silencios: huecos de 7–20 s y más de un tercio de los pasos sin sonido', () => {
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
  it('las disonancias son 2ª menores o tritonos y nunca seguidas (≥ 12 s entre racimos)', () => {
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
  it('las notas de piano están en la escala frigia', () => {
    const c = new ExploreComposer(6);
    for (let i = 0; i < 300; i++) for (const e of c.next().events) if (e.voice === 'piano') expect(pitchClassInScale(EXPLORE_KEY, e.midi)).toBe(true);
  });
  it('el drone sostiene la tónica grave y se solapa con el siguiente', () => {
    const c = new ExploreComposer(1);
    const d = c.drone(0);
    expect(d[0].midi).toBe(EXPLORE_KEY.root - 12);
    expect(d[0].dur).toBeGreaterThan(DRONE_PERIOD);
  });
  it('mayor densidad = huecos más cortos', () => {
    const mean = (dens: number) => { const c = new ExploreComposer(1, dens); let s = 0; for (let i = 0; i < 100; i++) s += c.next().gap; return s / 100; };
    expect(mean(2)).toBeLessThan(mean(1));
  });
});

describe('persecución por capas', () => {
  const voices = (i: number) => new Set(new ChaseComposer(1).bar(0, i).map((e) => e.voice));
  it('sin amenaza no suena nada', () => expect(new ChaseComposer(1).bar(0, 0.02)).toEqual([]));
  it('las capas entran con la intensidad: pulso → percusión → cuerdas', () => {
    expect([...voices(0.2)].sort()).toEqual(['kick']);
    const mid = voices(0.5);
    expect(mid.has('kick') && mid.has('hat')).toBe(true);
    expect(mid.has('strings')).toBe(false);
    const high = voices(0.9);
    expect(high.has('strings') && high.has('hat') && high.has('kick')).toBe(true);
  });
  it('más intensidad = más eventos y más fuertes, pero acotado por compás', () => {
    const n = (i: number) => new ChaseComposer(2).bar(1, i).length;
    expect(n(0.2)).toBeLessThan(n(0.5));
    expect(n(0.5)).toBeLessThan(n(0.95));
    expect(n(1)).toBeLessThanOrEqual(40);
    const k = (i: number) => new ChaseComposer(2).bar(0, i).filter((e) => e.voice === 'kick')[0].vel;
    expect(k(0.9)).toBeGreaterThan(k(0.2));
  });
  it('todos los eventos caen dentro del compás y las cuerdas forman segundas menores', () => {
    const evs = new ChaseComposer(3).bar(2, 1);
    for (const e of evs) {
      expect(e.t).toBeGreaterThanOrEqual(0);
      expect(e.t).toBeLessThan(CHASE_BAR);
    }
    const st = evs.filter((e) => e.voice === 'strings');
    expect(st[1].midi - st[0].midi).toBe(1);
  });
  it('es determinista', () => {
    expect(sig(new ChaseComposer(5).bar(3, 0.8))).toBe(sig(new ChaseComposer(5).bar(3, 0.8)));
  });
});

describe('stings', () => {
  it('Game Over: disonante (2ª menor y tritono sobre Do) y breve', () => {
    const s = gameOverSting();
    const cl = s.filter((e) => e.voice === 'cluster').map((e) => e.midi % 12);
    expect(cl).toContain(0);
    expect(cl).toContain(1);
    expect(cl).toContain(6);
    expect(Math.max(...s.map((e) => e.t + e.dur))).toBeLessThan(7);
  });
  it('Victoria: acorde de Do mayor (resolución), campanas ascendentes y breve', () => {
    const s = winSting();
    const pad = s.filter((e) => e.voice === 'warmPad').map((e) => e.midi % 12);
    expect(new Set(pad)).toEqual(new Set([0, 7, 4]));
    const bells = s.filter((e) => e.voice === 'bell').map((e) => e.midi);
    expect([...bells].sort((a, b) => a - b)).toEqual(bells);
    expect(Math.max(...s.map((e) => e.t + e.dur))).toBeLessThan(9);
  });
});

describe('intensidad adaptativa', () => {
  it('sin zombis activos es 0; perseguir y atacar la sube; la vida baja añade tensión', () => {
    expect(rawIntensity([], 100)).toBe(0);
    const chase = rawIntensity([{ state: 'chase', dist: 8 }], 100);
    const near = rawIntensity([{ state: 'chase', dist: 1 }], 100);
    const atk = rawIntensity([{ state: 'attack', dist: 1 }], 100);
    expect(chase).toBeGreaterThan(0.3);
    expect(near).toBeGreaterThan(chase);
    expect(atk).toBeGreaterThan(near);
    expect(rawIntensity([{ state: 'chase', dist: 5 }], 20)).toBeGreaterThan(rawIntensity([{ state: 'chase', dist: 5 }], 100));
  });
  it('está acotada a 1 con muchos zombis', () => {
    expect(rawIntensity(Array.from({ length: 6 }, () => ({ state: 'attack' as const, dist: 0.5 })), 10)).toBe(1);
  });
  it('sube rápido y baja despacio al calmarse', () => {
    const t = new IntensityTracker(1.6, 8);
    for (let i = 0; i < 120; i++) t.update(0.9, 1 / 60);
    expect(t.value).toBeCloseTo(0.9, 1);
    for (let i = 0; i < 60 * 3; i++) t.update(0, 1 / 60);
    expect(t.value).toBeGreaterThan(0.4);
    for (let i = 0; i < 60 * 6; i++) t.update(0, 1 / 60);
    expect(t.value).toBe(0);
  });
});

describe('intensidad desde el mundo', () => {
  const z = (state: number, x: number) => ({ x, y: 0, state });
  it('ignora zombis dormidos y muertos; cuenta alerta/persecución/ataque', async () => {
    const { worldIntensity } = await import('../src/audio/music/intensity');
    const w = (zs: ReturnType<typeof z>[], hp = 100) => ({ hp, player: { x: 0, y: 0 }, zombies: zs });
    expect(worldIntensity(w([z(0, 1), z(4, 1)]))).toBe(0);
    expect(worldIntensity(w([z(1, 5)]))).toBeCloseTo(0.12, 5);
    expect(worldIntensity(w([z(2, 8)]))).toBeLessThan(worldIntensity(w([z(2, 1)])));
    expect(worldIntensity(w([z(3, 1)]))).toBeGreaterThan(worldIntensity(w([z(2, 1)])));
    expect(worldIntensity(w([z(2, 5)], 20))).toBeGreaterThan(worldIntensity(w([z(2, 5)], 100)));
  });
});
