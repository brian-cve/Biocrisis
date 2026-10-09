import { PlayOpts, audio } from './engine';
import { Spatial } from './spatial';

const zombie = (ids: number[]): string[] => ids.map((i) => `sfx/zombie_${i}.wav`);
const sample = (names: string[]): string[] => names.map((n) => `sfx/${n}`);

/** Sound banks: a call picks one file at random. Zombie ids are sorted by length (short = hits and bites). */
const BANK = {
  pistol: ['sfx/pistol.wav'],
  shotgun: ['sfx/shotgun.wav'],
  rack: ['sfx/shotgun_rack.wav'],
  shell: ['sfx/shotgun_shell1.wav', 'sfx/shotgun_shell2.wav'],
  reload: ['sfx/reload.wav'],
  click: sample(['switch_01.ogg', 'switch_02.ogg']),
  step: sample(['footstep_01.ogg', 'footstep_02.ogg', 'footstep_wood_01.ogg', 'footstep_wood_02.ogg', 'footstep_wet_01.ogg']),
  door: sample(['door_01.ogg', 'door_02.ogg', 'door_03.ogg']),
  lock: sample(['lock_open_01.ogg']),
  thud: sample(['hit_01.ogg']),
  item: sample(['items_01.ogg']),
  itemKey: sample(['items_02.ogg']),
  thunder: sample(['thunder_01.ogg']),
  beatSlow: ['sfx/heartbeat_slow.wav'],
  beatFast: ['sfx/heartbeat_fast.wav'],
  groan: zombie([2, 4, 12, 23, 8, 1, 15, 9]),
  groanRunner: zombie([22, 10, 20, 19]),
  groanBoss: zombie([16, 17, 18, 21]),
  bite: zombie([13, 3, 7, 14]),
  hurt: zombie([24, 11, 5, 6]),
};

const FILES = [...new Set([...Object.values(BANK).flat()])];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = (bank: string[]): string => bank[(Math.random() * bank.length) | 0];
const play = (bank: string[], o: PlayOpts = {}): void => audio.play(pick(bank), o);
/** Volume and stereo position of a sound that comes from the world. */
const at = (sp: Spatial, floor: number, gain: number, o: PlayOpts = {}): PlayOpts => ({ ...o, pan: sp.pan, gain: gain * Math.max(floor, sp.gain) });

export const sfx = {
  /** Starts fetching every sample so they are ready by the first shot. */
  preload(): void {
    for (const f of FILES) void audio.load(f);
  },
  pistol: () => play(BANK.pistol, { gain: 0.9, rate: rnd(0.97, 1.03) }),
  smg: () => play(BANK.pistol, { gain: 0.55, rate: rnd(1.2, 1.35), dur: 0.2 }),
  shotgun: () => play(BANK.shotgun, { gain: 1 }),
  pump: (delay = 0) => play(BANK.rack, { gain: 0.7, delay }),
  dry: () => play(BANK.click, { gain: 0.5, rate: 1.5 }),
  reload: () => play(BANK.reload, { gain: 0.8 }),
  shell: () => play(BANK.shell, { gain: 0.7 }),
  switchWeapon: () => play(BANK.click, { gain: 0.45, rate: 0.8 }),
  step: () => play(BANK.step, { gain: rnd(0.3, 0.45), rate: rnd(0.9, 1.1) }),
  groan(sp: Spatial, runner = false, boss = false): void {
    const g = (boss ? 0.9 : 0.6) * sp.gain;
    if (g < 0.01) return;
    if (boss) play(BANK.groanBoss, { pan: sp.pan, gain: g, rate: rnd(0.55, 0.65) });
    else if (runner) play(BANK.groanRunner, { pan: sp.pan, gain: g, rate: rnd(1.1, 1.25) });
    else play(BANK.groan, { pan: sp.pan, gain: g, rate: rnd(0.85, 1.05) });
  },
  bossRoar: (sp: Spatial) => play(BANK.groanBoss, at(sp, 0.5, 1, { rate: 0.5 })),
  bossDie(sp: Spatial): void {
    play(BANK.groanBoss, at(sp, 0.5, 1, { rate: 0.4 }));
    play(BANK.thunder, { gain: 0.6, delay: 1.2, bus: 'ambient' });
  },
  zombieHit: (sp: Spatial) => play(BANK.hurt, at(sp, 0.3, 0.8, { rate: rnd(0.9, 1.1) })),
  zombieDie: (sp: Spatial) => play(BANK.groanRunner, at(sp, 0.3, 0.9, { rate: rnd(0.65, 0.8) })),
  zombieAttack: (sp: Spatial) => play(BANK.bite, at(sp, 0.3, 0.9, { rate: rnd(0.9, 1.1) })),
  playerHurt: () => play(BANK.thud, { gain: 0.9, rate: 0.7 }),
  playerDead(): void {
    play(BANK.thud, { gain: 1, rate: 0.5 });
    play(BANK.beatSlow, { gain: 0.6, delay: 0.3 });
  },
  door: (sp: Spatial, opening = true) => play(BANK.door, at(sp, 0.15, 0.9, { rate: opening ? 1 : 0.85 })),
  locked: () => play(BANK.lock, { gain: 0.6, rate: 1.3 }),
  pickup: () => play(BANK.item, { gain: 0.6 }),
  keyPickup: () => play(BANK.itemKey, { gain: 0.7 }),
  healStart: () => play(BANK.click, { gain: 0.4, rate: 0.6 }),
  heal(): void {
    play(BANK.item, { gain: 0.5, rate: 1.3 });
    play(BANK.itemKey, { gain: 0.4, rate: 1.3, delay: 0.15 });
  },
  heartbeat: (strength = 1) => play(strength > 0.7 ? BANK.beatFast : BANK.beatSlow, { gain: 0.9 * strength, dur: 0.6 }),
  thunder: () => play(BANK.thunder, { gain: 0.8, rate: rnd(0.85, 1.1), bus: 'ambient' }),
  alarm: () => play(BANK.thunder, { gain: 0.7, rate: 0.5, bus: 'ambient' }),
  gameOver: () => play(BANK.thunder, { gain: 0.7, rate: 0.45, bus: 'ambient' }),
  victory(): void {
    play(BANK.itemKey, { gain: 0.7, rate: 0.9 });
    play(BANK.item, { gain: 0.6, rate: 0.9, delay: 0.2 });
  },
  menuMove: () => play(BANK.click, { gain: 0.3, rate: 1.6 }),
  menuAccept: () => play(BANK.click, { gain: 0.5, rate: 1.1 }),
  menuBack: () => play(BANK.click, { gain: 0.35, rate: 0.8 }),
};
