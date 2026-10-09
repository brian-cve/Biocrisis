import { GridMap } from '../engine/raycast';
import { WeaponDef, falloff, findTarget } from './weapons';
import { Zombie } from './zombie';

interface Shooter {
  x: number;
  y: number;
  angle: number;
}

export interface ShotResult {
  // The last zombie that was hit, or null if every pellet missed.
  hit: Zombie | null;
  kills: number;
}

// Resolves one trigger pull: aim assist, then each pellet against the zombies, applying damage.
export function resolveShot(map: GridMap, zombies: readonly Zombie[], from: Shooter, def: WeaponDef, aimAssist: number, offsets: ArrayLike<number>): ShotResult {
  let aim = from.angle;
  const assist = aimAssist > 0 ? findTarget(map, zombies, from.x, from.y, from.angle, def.range, aimAssist) : null;
  if (assist) aim = Math.atan2(assist.target.y - from.y, assist.target.x - from.x);

  const tol = def.pellets > 1 ? 0 : assist ? 0.001 : aimAssist;
  const result: ShotResult = { hit: null, kills: 0 };
  for (let i = 0; i < def.pellets; i++) {
    const a = aim + offsets[i];
    const hit = findTarget(map, zombies, from.x, from.y, a, def.range, tol);
    if (!hit) continue;
    result.hit = hit.target;
    if (hit.target.hurt(def.damage * falloff(def, hit.dist), def.stagger, Math.cos(a), Math.sin(a), def.knock)) result.kills++;
  }
  return result;
}
