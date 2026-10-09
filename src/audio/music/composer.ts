import { Rng } from '../../engine/rng';
import { Chord, EXPLORE_KEY, MENU_KEY, MENU_PROGRESSION, chordMidi, scaleNote } from './theory';

export type VoiceKind =
  | 'pad'
  | 'bell'
  | 'piano'
  | 'drone'
  | 'cluster'
  | 'creak'
  | 'kick'
  | 'hat'
  | 'tom'
  | 'strings'
  | 'hit'
  | 'fall'
  | 'warmPad';

export interface NoteEvent {
  t: number;
  voice: VoiceKind;
  midi: number;
  dur: number;
  vel: number;
  attack?: number;
  pan?: number;
}

export const MENU_BPM = 54;
export const MENU_BEAT = 60 / MENU_BPM;
export const MENU_BAR = MENU_BEAT * 4;

export class MenuComposer {
  private rng: Rng;
  private lastBell = 0;

  constructor(seed: number, private readonly progression: readonly Chord[] = MENU_PROGRESSION) {
    this.rng = new Rng(seed);
  }

  chordAt(bar: number): Chord {
    return this.progression[Math.floor(bar / 2) % this.progression.length];
  }

  bar(bar: number): NoteEvent[] {
    const out: NoteEvent[] = [];
    const chord = this.chordAt(bar);

    if (bar % 2 === 0) {
      const tones = chordMidi(MENU_KEY, chord);
      tones.forEach((m, i) => out.push({ t: i * 0.18, voice: 'pad', midi: m, dur: MENU_BAR * 2, vel: 0.55 - i * 0.04 }));
    }
    if (bar % 8 === 0) {
      out.push({ t: 0, voice: 'drone', midi: MENU_KEY.root - 12, dur: MENU_BAR * 10, vel: 0.7 });
    }
    if (bar % 4 === 0 && this.rng.next() < 0.45) {
      out.push({ t: MENU_BEAT * 0.5, voice: 'piano', midi: MENU_KEY.root + chord.root - 12 + (this.rng.next() < 0.3 ? 7 : 0), dur: 4.5, vel: 0.5 });
    }

    const silent = bar % 8 === 7;
    if (!silent) {
      const pool = [...chordMidi(MENU_KEY, chord, 2), MENU_KEY.root + chord.root + 14 + 24];
      let count = 0;
      for (let beat = 0; beat < 4 && count < 3; beat++) {
        if (this.rng.next() > 0.27) continue;
        const near = pool.filter((m) => Math.abs(m - this.lastBell) <= 7 || this.lastBell === 0);
        const cands = near.length ? near : pool;
        const m = cands[this.rng.int(0, cands.length)];
        out.push({ t: beat * MENU_BEAT + this.rng.range(0, 0.25), voice: 'bell', midi: m, dur: 3.2, vel: this.rng.range(0.28, 0.5), pan: this.rng.range(-0.5, 0.5) });
        this.lastBell = m;
        count++;
      }
    }
    return out;
  }
}

export const DRONE_PERIOD = 24;

export interface TimedEvents {
  gap: number;
  events: NoteEvent[];
}

export class ExploreComposer {
  private rng: Rng;
  private sinceCluster = 99;

  constructor(seed: number, private readonly density = 1) {
    this.rng = new Rng(seed);
  }

  drone(n: number): NoteEvent[] {
    const out: NoteEvent[] = [{ t: 0, voice: 'drone', midi: EXPLORE_KEY.root - 12, dur: DRONE_PERIOD * 1.5, vel: 0.65 }];
    if (this.rng.next() < 0.5) {
      const tri = EXPLORE_KEY.root - 12 + (n % 2 === 0 ? 6 : 7);
      out.push({ t: this.rng.range(2, 8), voice: 'drone', midi: tri, dur: DRONE_PERIOD, vel: 0.28 });
    }
    return out;
  }

  next(): TimedEvents {
    const gap = this.rng.range(7, 20) / this.density;
    this.sinceCluster += gap;
    const r = this.rng.next();
    const events: NoteEvent[] = [];
    if (r < 0.28) {
      if (this.sinceCluster < 12) return { gap, events };
      const base = scaleNote(EXPLORE_KEY, this.rng.int(2, 9)) + 24;
      const interval = this.rng.next() < 0.7 ? 1 : 6;
      const dur = this.rng.range(6, 9);
      events.push({ t: 0, voice: 'cluster', midi: base, dur, vel: 0.35, attack: dur * 0.4, pan: this.rng.range(-0.7, 0.7) });
      events.push({ t: this.rng.range(0.3, 1.2), voice: 'cluster', midi: base + interval, dur: dur - 0.5, vel: 0.3, attack: dur * 0.4, pan: this.rng.range(-0.7, 0.7) });
      this.sinceCluster = 0;
    } else if (r < 0.52) {
      events.push({ t: 0, voice: 'piano', midi: scaleNote(EXPLORE_KEY, this.rng.int(0, 5)) + 12 * this.rng.int(0, 2), dur: 4.5, vel: this.rng.range(0.25, 0.45), pan: this.rng.range(-0.4, 0.4) });
    } else if (r < 0.64) {
      events.push({ t: 0, voice: 'creak', midi: 60, dur: this.rng.range(1.2, 2.2), vel: this.rng.range(0.2, 0.4), pan: this.rng.range(-0.9, 0.9) });
    }
    return { gap, events };
  }
}

export const CHASE_BPM = 108;
export const CHASE_BEAT = 60 / CHASE_BPM;
export const CHASE_BAR = CHASE_BEAT * 4;
const S16 = CHASE_BEAT / 4;

export class ChaseComposer {
  private rng: Rng;

  constructor(seed: number) {
    this.rng = new Rng(seed);
  }

  bar(bar: number, intensity: number): NoteEvent[] {
    const out: NoteEvent[] = [];
    const i = Math.max(0, Math.min(1, intensity));
    if (i < 0.08) return out;

    for (let b = 0; b < 4; b++) out.push({ t: b * CHASE_BEAT, voice: 'kick', midi: 40, dur: 0.22, vel: 0.5 + 0.5 * i });
    if (i > 0.7) out.push({ t: 3.5 * CHASE_BEAT, voice: 'kick', midi: 40, dur: 0.2, vel: 0.5 });

    if (i > 0.35) {
      const sixteenths = i > 0.6;
      for (let s = 0; s < 16; s++) {
        if (!sixteenths && s % 2 === 1) continue;
        if (sixteenths && s % 2 === 1 && this.rng.next() < 0.4) continue;
        out.push({ t: s * S16, voice: 'hat', midi: 100, dur: 0.05, vel: (s % 4 === 2 ? 0.5 : 0.28) * (0.6 + 0.4 * i) });
      }
    }
    if (i > 0.45) {
      const steps = [3, 6, 11, 14];
      const picks = steps.filter(() => this.rng.next() < 0.55);
      for (const s of picks) out.push({ t: s * S16, voice: 'tom', midi: this.rng.next() < 0.5 ? 50 : 45, dur: 0.28, vel: 0.5 + 0.3 * i });
    }

    if (i > 0.55) {
      const pairs: [number, number][] = [[76, 77], [75, 76], [79, 80], [77, 78]];
      const [a, b] = pairs[(bar + this.rng.int(0, 2)) % pairs.length];
      const dur = i > 0.8 ? CHASE_BAR / 2 : CHASE_BAR;
      out.push({ t: 0, voice: 'strings', midi: a, dur, vel: 0.3 + 0.2 * i });
      out.push({ t: 0.05, voice: 'strings', midi: b, dur, vel: 0.26 + 0.2 * i });
      if (i > 0.8) {
        out.push({ t: CHASE_BAR / 2, voice: 'strings', midi: a + 2, dur: CHASE_BAR / 2, vel: 0.4 });
        out.push({ t: CHASE_BAR / 2 + 0.05, voice: 'strings', midi: b + 2, dur: CHASE_BAR / 2, vel: 0.36 });
      }
    }
    return out;
  }
}

export function gameOverSting(): NoteEvent[] {
  return [
    { t: 0, voice: 'hit', midi: 36, dur: 1.2, vel: 1 },
    { t: 0.05, voice: 'cluster', midi: 36, dur: 5, vel: 0.5, attack: 0.15 },
    { t: 0.05, voice: 'cluster', midi: 37, dur: 5, vel: 0.45, attack: 0.15 },
    { t: 0.1, voice: 'cluster', midi: 42, dur: 4.5, vel: 0.4, attack: 0.2 },
    { t: 0.2, voice: 'fall', midi: 48, dur: 3.8, vel: 0.6 },
  ];
}

export function winSting(): NoteEvent[] {
  const out: NoteEvent[] = [];
  [48, 55, 60, 64, 67].forEach((m, i) => out.push({ t: i * 0.12, voice: 'warmPad', midi: m, dur: 7, vel: 0.5 - i * 0.03, attack: 1.2 }));
  [60, 64, 67, 72, 76, 79].forEach((m, i) => out.push({ t: 0.3 + i * 0.28, voice: 'bell', midi: m, dur: 4, vel: 0.5 - i * 0.04, pan: (i % 2 ? 1 : -1) * 0.3 }));
  return out;
}
