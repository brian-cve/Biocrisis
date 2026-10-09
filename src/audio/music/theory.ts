
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;

interface ScaleSpec {
  root: number;
  intervals: readonly number[];
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function scaleNote(s: ScaleSpec, degree: number): number {
  const n = s.intervals.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return s.root + oct * 12 + s.intervals[idx];
}

export function pitchClassInScale(s: ScaleSpec, midi: number): boolean {
  const pc = (((midi - s.root) % 12) + 12) % 12;
  return s.intervals.includes(pc);
}

export interface Chord {
  root: number;
  tones: readonly number[];
}

export const MENU_KEY: ScaleSpec = { root: 48, intervals: SCALES.minor };
export const MENU_PROGRESSION: readonly Chord[] = [
  { root: 0, tones: [0, 3, 7, 10] },
  { root: 8, tones: [0, 4, 7, 11] },
  { root: 5, tones: [0, 3, 7, 10] },
  { root: 7, tones: [0, 4, 7] },
];

export const EXPLORE_KEY: ScaleSpec = { root: 38, intervals: SCALES.phrygian };

export function chordMidi(key: ScaleSpec, c: Chord, octaveShift = 0): number[] {
  return c.tones.map((t) => key.root + c.root + t + octaveShift * 12);
}
