import { GridMap } from '../engine/raycast';
import { hasLineOfSight } from './los';

type AmmoType = 'bullets' | 'shells';

export interface AmmoPool {
  bullets: number;
  shells: number;
}

export type WeaponId = 'pistol' | 'shotgun' | 'smg';

interface WeaponDef {
  id: WeaponId;
  name: string;
  ammo: AmmoType;
  magSize: number;
  damage: number;
  cooldown: number;
  reloadTime: number;
  range: number;
  stagger: number;
  noise: number;
  pellets: number;
  spread: number;
  knock: number;
  perShell: boolean;
  interruptReload: boolean;
  auto: boolean;
}

export function falloff(def: WeaponDef, dist: number): number {
  if (def.pellets === 1) return 1;
  return Math.min(1, Math.max(0.12, 1.4 - dist * 0.18));
}

export const PISTOL: WeaponDef = {
  id: 'pistol',
  name: 'Pistol',
  ammo: 'bullets',
  magSize: 12,
  damage: 10,
  cooldown: 0.32,
  reloadTime: 1.3,
  range: 20,
  stagger: 0.25,
  noise: 9,
  pellets: 1,
  spread: 0,
  knock: 1.2,
  perShell: false,
  interruptReload: false,
  auto: false,
};

export const SHOTGUN: WeaponDef = {
  id: 'shotgun',
  name: 'Shotgun',
  ammo: 'shells',
  magSize: 4,
  damage: 7,
  cooldown: 1.0,
  reloadTime: 0.55,
  range: 12,
  stagger: 0.8,
  noise: 12,
  pellets: 7,
  spread: 0.14,
  knock: 3.5,
  perShell: true,
  interruptReload: true,
  auto: false,
};

export const SMG: WeaponDef = {
  id: 'smg',
  name: 'Submachine gun',
  ammo: 'bullets',
  magSize: 30,
  damage: 9,
  cooldown: 0.085,
  reloadTime: 1.6,
  range: 18,
  stagger: 0.05,
  noise: 11,
  pellets: 1,
  spread: 0,
  knock: 0.25,
  perShell: false,
  interruptReload: false,
  auto: true,
};

export function spreadAngles(n: number, spread: number, rand: () => number, out: Float64Array | number[] = []): Float64Array | number[] {
  for (let i = 0; i < n; i++) {
    const base = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    out[i] = (base * 0.8 + (rand() * 2 - 1) * 0.2) * spread;
  }
  return out;
}

type WeaponEvent = 'none' | 'fired' | 'dry' | 'reloadStart' | 'reloaded' | 'shell';

export class Weapon {
  mag: number;
  cooldown = 0;
  reload = 0;
  kick = 0;

  constructor(readonly def: WeaponDef, mag = def.magSize) {
    this.mag = mag;
  }

  get reloading(): boolean {
    return this.reload > 0;
  }

  canFire(): boolean {
    return this.cooldown <= 0 && this.reload <= 0 && this.mag > 0;
  }

  fire(): WeaponEvent {
    if (this.reload > 0 && this.def.interruptReload && this.mag > 0) this.reload = 0;
    if (this.reload > 0 || this.cooldown > 0) return 'none';
    if (this.mag <= 0) return 'dry';
    this.mag--;
    this.cooldown = this.def.cooldown;
    this.kick = 1;
    return 'fired';
  }

  startReload(pool: AmmoPool): WeaponEvent {
    if (this.reload > 0 || this.mag >= this.def.magSize || pool[this.def.ammo] <= 0) return 'none';
    this.reload = this.def.reloadTime;
    return 'reloadStart';
  }

  cancelReload(): void {
    this.reload = 0;
  }

  update(dt: number, pool: AmmoPool): WeaponEvent {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.kick > 0) this.kick = Math.max(0, this.kick - dt * 5);
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) {
        this.reload = 0;
        if (this.def.perShell) {
          if (pool[this.def.ammo] > 0 && this.mag < this.def.magSize) {
            this.mag++;
            pool[this.def.ammo]--;
          }
          if (this.mag < this.def.magSize && pool[this.def.ammo] > 0) {
            this.reload = this.def.reloadTime;
            return 'shell';
          }
          return 'reloaded';
        }
        const need = this.def.magSize - this.mag;
        const take = Math.min(need, pool[this.def.ammo]);
        this.mag += take;
        pool[this.def.ammo] -= take;
        return 'reloaded';
      }
    }
    return 'none';
  }
}

interface Target {
  x: number;
  y: number;
  radius: number;
  dead: boolean;
}

interface ShotHit<T extends Target> {
  target: T;
  dist: number;
}

export function findTarget<T extends Target>(
  map: GridMap,
  targets: readonly T[],
  ox: number,
  oy: number,
  angle: number,
  range: number,
  tol: number,
): ShotHit<T> | null {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best: ShotHit<T> | null = null;
  for (const t of targets) {
    if (t.dead) continue;
    const vx = t.x - ox;
    const vy = t.y - oy;
    const along = vx * dx + vy * dy;
    if (along < 0.1 || along > range) continue;
    const perp = Math.abs(vx * dy - vy * dx);
    if (perp > t.radius + along * Math.tan(tol)) continue;
    if (best !== null && along >= best.dist) continue;
    if (!hasLineOfSight(map, ox, oy, t.x, t.y)) continue;
    best = { target: t, dist: along };
  }
  return best;
}
