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
  smg(): void {
    audio.noise({ dur: 0.07, gain: 0.7, filter: { type: 'bandpass', f0: 2600, f1: 700, q: 0.9 } });
    audio.tone({ type: 'sine', f0: 190, f1: 70, dur: 0.07, gain: 0.55 });
    audio.noise({ dur: 0.03, gain: 0.35, filter: { type: 'highpass', f0: 5500 } });
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
  /** Gemido de zombi: "uuuhhhaaa" arrastrado con formantes, aliento ronco y gorgoteo húmedo. */
  groan(sp: Spatial, runner = false, boss = false): void {
    const g = (boss ? 0.8 : 0.5) * sp.gain;
    if (g < 0.01) return;
    const f = boss ? rnd(34, 46) : runner ? rnd(105, 145) : rnd(58, 88);
    const dur = boss ? rnd(1.8, 2.5) : runner ? rnd(0.7, 1.1) : rnd(1.2, 1.9);
    const pan = sp.pan;
    // cuerda vocal: diente de sierra que cae y se quiebra (vibrato irregular y profundo)
    audio.tone({ type: 'sawtooth', f0: f * 1.15, f1: f * 0.62, dur, gain: g, attack: 0.12, pan, filter: { type: 'lowpass', freq: 1400, q: 1 }, vibrato: { rate: rnd(5, 9), depth: f * 0.14 } });
    // formantes: la boca pasa de "u" cerrada a "a" abierta y se desploma
    audio.tone({ type: 'sawtooth', f0: f, f1: f * 0.66, dur, gain: g * 0.9, attack: 0.15, pan, filter: { type: 'bandpass', freq: 350, q: 6 }, vibrato: { rate: rnd(4, 7), depth: f * 0.1 } });
    audio.tone({ type: 'sawtooth', f0: f * 1.02, f1: f * 0.7, dur: dur * 0.85, gain: g * 0.7, attack: 0.3, delay: 0.1, pan, filter: { type: 'bandpass', freq: runner ? 1150 : 900, q: 5 }, vibrato: { rate: rnd(6, 10), depth: f * 0.18 } });
    // subarmónico que le da peso de pecho
    audio.tone({ type: 'square', f0: f * 0.5, f1: f * 0.33, dur, gain: g * 0.35, attack: 0.2, pan, filter: { type: 'lowpass', freq: 220 } });
    // aliento ronco y saliva
    audio.noise({ dur: dur * 0.9, gain: g * 0.55, attack: 0.18, pan, filter: { type: 'bandpass', f0: 700, f1: 380, q: 1.6 } });
    // gorgoteo: ráfagas cortas y graves, como sangre en la garganta
    const n = runner ? 3 : 4;
    for (let i = 0; i < n; i++) {
      audio.tone({ type: 'triangle', f0: rnd(150, 230), f1: rnd(60, 100), dur: rnd(0.05, 0.09), gain: g * 0.4, delay: dur * 0.35 + i * rnd(0.07, 0.12), pan, filter: { type: 'lowpass', freq: 500 } });
    }
  },
  /** Rugido del jefe al despertar: grave, largo, con temblor de suelo. */
  bossRoar(sp: Spatial): void {
    const g = Math.max(0.5, sp.gain);
    audio.tone({ type: 'sawtooth', f0: 70, f1: 38, dur: 2.4, gain: 0.7 * g, attack: 0.25, pan: sp.pan, filter: { type: 'bandpass', freq: 320, q: 3 }, vibrato: { rate: 11, depth: 14 } });
    audio.tone({ type: 'sawtooth', f0: 140, f1: 55, dur: 2, gain: 0.35 * g, attack: 0.3, pan: sp.pan, filter: { type: 'bandpass', freq: 800, q: 4 }, vibrato: { rate: 15, depth: 30 } });
    audio.noise({ dur: 2.2, gain: 0.5 * g, attack: 0.3, pan: sp.pan, filter: { type: 'bandpass', f0: 600, f1: 250, q: 1.2 } });
    audio.tone({ type: 'sine', f0: 40, f1: 26, dur: 2.6, gain: 0.8, attack: 0.2, bus: 'ambient' });
  },
  /** Muerte del jefe: rugido que se apaga y un estruendo sordo. */
  bossDie(sp: Spatial): void {
    const g = Math.max(0.5, sp.gain);
    audio.tone({ type: 'sawtooth', f0: 90, f1: 24, dur: 3, gain: 0.6 * g, attack: 0.05, pan: sp.pan, filter: { type: 'bandpass', freq: 300, q: 3 }, vibrato: { rate: 7, depth: 20 } });
    audio.noise({ dur: 2.2, gain: 0.45 * g, delay: 0.3, pan: sp.pan, filter: { type: 'bandpass', f0: 500, f1: 150, q: 1.4 } });
    audio.tone({ type: 'sine', f0: 52, f1: 22, dur: 1.4, gain: 0.9, delay: 1.6, bus: 'ambient' });
    audio.noise({ dur: 0.5, gain: 0.7, delay: 1.6, filter: { type: 'lowpass', f0: 500, f1: 80 } });
  },
  zombieHit(sp: Spatial): void {
    audio.noise({ dur: 0.12, gain: 0.6 * Math.max(0.3, sp.gain), pan: sp.pan, filter: { type: 'lowpass', f0: 1000, f1: 300 } });
    audio.tone({ type: 'sine', f0: 130, f1: 55, dur: 0.12, gain: 0.5 * Math.max(0.3, sp.gain), pan: sp.pan });
  },
  zombieDie(sp: Spatial): void {
    const g = Math.max(0.3, sp.gain);
    audio.tone({ type: 'sawtooth', f0: 140, f1: 38, dur: 1.5, gain: 0.45 * g, attack: 0.04, pan: sp.pan, filter: { type: 'bandpass', freq: 500, q: 4 }, vibrato: { rate: 8, depth: 22 } });
    audio.noise({ dur: 1.1, gain: 0.3 * g, delay: 0.2, pan: sp.pan, filter: { type: 'bandpass', f0: 600, f1: 200, q: 1.5 } }); // estertor
    audio.noise({ dur: 0.25, gain: 0.5 * g, delay: 0.9, pan: sp.pan, filter: { type: 'lowpass', f0: 600, f1: 150 } }); // cuerpo cae
  },
  zombieAttack(sp: Spatial): void {
    const g = Math.max(0.3, sp.gain);
    audio.tone({ type: 'sawtooth', f0: 190, f1: 70, dur: 0.45, gain: 0.45 * g, attack: 0.03, pan: sp.pan, filter: { type: 'bandpass', freq: 800, q: 3 }, vibrato: { rate: 14, depth: 30 } });
    audio.noise({ dur: 0.4, gain: 0.35 * g, pan: sp.pan, filter: { type: 'bandpass', f0: 1800, f1: 600, q: 1.2 } }); // rugido ronco
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
