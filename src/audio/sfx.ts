import { audio } from './engine';
import { Spatial } from './spatial';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Biblioteca de efectos procedurales. `sp` aplica paneo/atenuación espacial cuando la fuente está en el mundo. */
export const sfx = {
  pistol(): void {
    audio.noise({ dur: 0.13, gain: 0.9, filter: { type: 'bandpass', f0: 2200, f1: 500, q: 0.8 } });
    audio.tone({ type: 'sine', f0: 160, f1: 45, dur: 0.16, gain: 0.8 });
    audio.noise({ dur: 0.04, gain: 0.5, filter: { type: 'highpass', f0: 5000 } });
    audio.noise({ dur: 0.35, gain: 0.12, delay: 0.05, filter: { type: 'lowpass', f0: 900, f1: 250 } }); // eco corto
  },
  shotgun(): void {
    audio.noise({ dur: 0.38, gain: 1, filter: { type: 'lowpass', f0: 3500, f1: 250, q: 0.7 } });
    audio.tone({ type: 'sine', f0: 100, f1: 28, dur: 0.35, gain: 1 });
    audio.noise({ dur: 0.06, gain: 0.6, filter: { type: 'highpass', f0: 4500 } });
    audio.noise({ dur: 0.7, gain: 0.2, delay: 0.08, filter: { type: 'lowpass', f0: 700, f1: 160 } });
  },
  dry(): void {
    audio.noise({ dur: 0.03, gain: 0.35, filter: { type: 'highpass', f0: 4000 } });
    audio.tone({ type: 'square', f0: 1300, f1: 900, dur: 0.03, gain: 0.12 });
  },
  reload(): void {
    audio.noise({ dur: 0.05, gain: 0.5, filter: { type: 'bandpass', f0: 2600, q: 2 } }); // expulsa cargador
    audio.noise({ dur: 0.06, gain: 0.6, delay: 0.5, filter: { type: 'bandpass', f0: 1700, q: 2 } }); // inserta
    audio.tone({ type: 'square', f0: 700, f1: 400, dur: 0.05, gain: 0.12, delay: 0.5 });
    audio.noise({ dur: 0.07, gain: 0.55, delay: 0.85, filter: { type: 'bandpass', f0: 1200, q: 1.5 } }); // corredera
  },
  shell(): void {
    audio.noise({ dur: 0.04, gain: 0.5, filter: { type: 'bandpass', f0: 2000, q: 2 } });
    audio.tone({ type: 'triangle', f0: 900, f1: 600, dur: 0.05, gain: 0.15 });
  },
  pump(at = 0): void {
    audio.noise({ dur: 0.05, gain: 0.55, delay: at, filter: { type: 'bandpass', f0: 1400, q: 2 } });
    audio.tone({ type: 'square', f0: 500, f1: 280, dur: 0.06, gain: 0.14, delay: at });
    audio.noise({ dur: 0.06, gain: 0.6, delay: at + 0.16, filter: { type: 'bandpass', f0: 1000, q: 2 } });
    audio.tone({ type: 'square', f0: 380, f1: 200, dur: 0.07, gain: 0.14, delay: at + 0.16 });
  },
  switchWeapon(): void {
    audio.noise({ dur: 0.05, gain: 0.35, filter: { type: 'bandpass', f0: 1800, q: 1.5 } });
    audio.noise({ dur: 0.05, gain: 0.3, delay: 0.12, filter: { type: 'bandpass', f0: 900, q: 1.5 } });
  },
  step(): void {
    audio.noise({ dur: 0.09, gain: rnd(0.16, 0.24), filter: { type: 'lowpass', f0: rnd(350, 520), q: 0.7 } });
  },
  groan(sp: Spatial, runner = false): void {
    const g = 0.45 * sp.gain;
    if (g < 0.01) return;
    const f = (runner ? rnd(110, 150) : rnd(65, 95));
    audio.tone({ type: 'sawtooth', f0: f, f1: f * 0.7, dur: rnd(0.8, 1.3), gain: g, attack: 0.15, pan: sp.pan, filter: { type: 'bandpass', freq: runner ? 600 : 420, q: 3 }, vibrato: { rate: rnd(4, 7), depth: 6 } });
    audio.tone({ type: 'square', f0: f * 2.01, f1: f * 1.4, dur: 0.9, gain: g * 0.3, attack: 0.2, pan: sp.pan, filter: { type: 'lowpass', freq: 700 } });
  },
  zombieHit(sp: Spatial): void {
    audio.noise({ dur: 0.12, gain: 0.6 * Math.max(0.3, sp.gain), pan: sp.pan, filter: { type: 'lowpass', f0: 1000, f1: 300 } });
    audio.tone({ type: 'sine', f0: 130, f1: 55, dur: 0.12, gain: 0.5 * Math.max(0.3, sp.gain), pan: sp.pan });
  },
  zombieDie(sp: Spatial): void {
    audio.tone({ type: 'sawtooth', f0: 110, f1: 40, dur: 1.1, gain: 0.4 * Math.max(0.3, sp.gain), attack: 0.05, pan: sp.pan, filter: { type: 'lowpass', freq: 500 }, vibrato: { rate: 6, depth: 10 } });
    audio.noise({ dur: 0.25, gain: 0.5 * Math.max(0.3, sp.gain), delay: 0.5, pan: sp.pan, filter: { type: 'lowpass', f0: 600, f1: 150 } });
  },
  zombieAttack(sp: Spatial): void {
    audio.tone({ type: 'sawtooth', f0: 160, f1: 90, dur: 0.35, gain: 0.4 * Math.max(0.3, sp.gain), pan: sp.pan, filter: { type: 'bandpass', freq: 700, q: 2 } });
  },
  playerHurt(): void {
    audio.noise({ dur: 0.2, gain: 0.7, filter: { type: 'lowpass', f0: 1500, f1: 300 } });
    audio.tone({ type: 'sawtooth', f0: 210, f1: 110, dur: 0.3, gain: 0.35, filter: { type: 'lowpass', freq: 900 } });
  },
  playerDead(): void {
    audio.tone({ type: 'sawtooth', f0: 120, f1: 30, dur: 1.6, gain: 0.5, filter: { type: 'lowpass', freq: 500 } });
    audio.noise({ dur: 1.2, gain: 0.3, filter: { type: 'lowpass', f0: 800, f1: 80 } });
  },
  door(sp: Spatial, opening = true): void {
    const g = Math.max(0.15, sp.gain);
    audio.tone({ type: 'sawtooth', f0: opening ? 90 : 140, f1: opening ? 150 : 80, dur: 0.55, gain: 0.14 * g, pan: sp.pan, filter: { type: 'bandpass', freq: 500, q: 4 }, vibrato: { rate: 9, depth: 14 } });
    audio.noise({ dur: 0.5, gain: 0.1 * g, pan: sp.pan, filter: { type: 'bandpass', f0: 600, f1: 1200, q: 3 } });
    audio.tone({ type: 'sine', f0: 90, f1: 50, dur: 0.12, gain: 0.5 * g, delay: 0.5, pan: sp.pan });
  },
  locked(): void {
    audio.tone({ type: 'square', f0: 160, dur: 0.06, gain: 0.2 });
    audio.tone({ type: 'square', f0: 140, dur: 0.07, gain: 0.2, delay: 0.1 });
    audio.noise({ dur: 0.05, gain: 0.3, delay: 0.1, filter: { type: 'bandpass', f0: 2500, q: 3 } });
  },
  pickup(): void {
    audio.tone({ type: 'sine', f0: 660, dur: 0.14, gain: 0.25 });
    audio.tone({ type: 'sine', f0: 990, dur: 0.22, gain: 0.25, delay: 0.1 });
  },
  keyPickup(): void {
    for (let i = 0; i < 4; i++) audio.tone({ type: 'triangle', f0: 1400 + i * 260, dur: 0.18, gain: 0.18, delay: i * 0.06 });
  },
  healStart(): void {
    audio.noise({ dur: 0.3, gain: 0.25, filter: { type: 'bandpass', f0: 1200, f1: 2400, q: 2 } }); // destapar
  },
  heal(): void {
    [440, 554, 659, 880].forEach((f, i) => audio.tone({ type: 'sine', f0: f, dur: 0.5, gain: 0.16, delay: i * 0.09 }));
  },
  heartbeat(strength = 1): void {
    audio.tone({ type: 'sine', f0: 62, f1: 38, dur: 0.14, gain: 0.8 * strength });
    audio.tone({ type: 'sine', f0: 56, f1: 36, dur: 0.16, gain: 0.55 * strength, delay: 0.19 });
  },
  thunder(): void {
    audio.noise({ dur: 3.2, gain: 0.8, attack: 0.08, bus: 'ambient', filter: { type: 'lowpass', f0: 600, f1: 70, q: 0.6 } });
    audio.tone({ type: 'sine', f0: 48, f1: 28, dur: 2.4, gain: 0.7, attack: 0.15, bus: 'ambient' });
  },
  drip(sp: Spatial): void {
    audio.tone({ type: 'sine', f0: 1500, f1: 700, dur: 0.12, gain: 0.12 * Math.max(0.2, sp.gain), pan: sp.pan });
  },
  /** La casa despierta: un golpe grave que sube y un trueno lejano. */
  alarm(): void {
    audio.tone({ type: 'sine', f0: 48, f1: 96, dur: 3, gain: 0.55, attack: 1.2, bus: 'ambient' });
    audio.tone({ type: 'sawtooth', f0: 70, f1: 140, dur: 2.6, gain: 0.12, attack: 1.4, bus: 'ambient', filter: { type: 'lowpass', freq: 300 } });
    audio.noise({ dur: 2.4, gain: 0.5, delay: 0.6, bus: 'ambient', filter: { type: 'lowpass', f0: 500, f1: 80 } });
  },
  // interfaz
  menuMove(): void {
    audio.tone({ type: 'square', f0: 520, dur: 0.045, gain: 0.1 });
  },
  menuAccept(): void {
    audio.tone({ type: 'square', f0: 440, f1: 700, dur: 0.1, gain: 0.12 });
    audio.tone({ type: 'sine', f0: 220, dur: 0.14, gain: 0.2 });
  },
  menuBack(): void {
    audio.tone({ type: 'square', f0: 320, f1: 200, dur: 0.09, gain: 0.1 });
  },
};
