/** Teoría musical mínima: escalas, notas MIDI y acordes (todo parametrizado y puro, para poder probarlo). */

export const SCALES = {
  /** Menor natural (Do menor). */
  minor: [0, 2, 3, 5, 7, 8, 10],
  /** Frigio: la segunda menor da el color oscuro (Re frigio). */
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;

export interface ScaleSpec {
  /** Nota MIDI de la tónica (en cualquier octava). */
  root: number;
  intervals: readonly number[];
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Nota MIDI del grado `degree` (puede ser negativo o > longitud: sube/baja de octava) sobre la tónica `root`. */
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
  /** Semitonos de la fundamental sobre la tónica de la tonalidad. */
  root: number;
  /** Semitonos de cada nota sobre la fundamental. */
  tones: readonly number[];
}

/** Do menor oscuro: Cm7 – Abmaj7 – Fm7 – G (dominante mayor, tensión que no resuelve del todo). */
export const MENU_KEY: ScaleSpec = { root: 48, intervals: SCALES.minor }; // Do3
export const MENU_PROGRESSION: readonly Chord[] = [
  { root: 0, tones: [0, 3, 7, 10] },
  { root: 8, tones: [0, 4, 7, 11] },
  { root: 5, tones: [0, 3, 7, 10] },
  { root: 7, tones: [0, 4, 7] },
];

/** Exploración: Re frigio. La tónica grave sostiene el ambiente; el tritono (Sol#) es el intervalo "malo". */
export const EXPLORE_KEY: ScaleSpec = { root: 38, intervals: SCALES.phrygian }; // Re2

/** Notas del acorde como MIDI absolutos sobre `key.root` (más una octava de base opcional). */
export function chordMidi(key: ScaleSpec, c: Chord, octaveShift = 0): number[] {
  return c.tones.map((t) => key.root + c.root + t + octaveShift * 12);
}
