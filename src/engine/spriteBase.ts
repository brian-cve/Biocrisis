import { Bmp } from './draw';

export const SPR_SIZE = 32;
export const TRANSPARENT = 255;

export const enum SpriteId {
  Key = 0,
  Tonic = 1,
  PistolAmmo = 2,
  ShotgunShells = 3,
  Shotgun = 4,
  Lamp = 5,
  Plant = 6,
  Barrel = 7,
  WalkerBase = 8,
  RunnerBase = 13,
  PistolIcon = 18,
  BossBase = 19,
  Smg = 24,
}
export const PISTOL_ICON = SpriteId.PistolIcon;
export const SPRITE_COUNT = 25;

export const enum ZPose {
  WalkA = 0,
  WalkB = 1,
  Attack = 2,
  Hurt = 3,
  Dead = 4,
}

export class Spr extends Bmp {
  constructor() {
    super(SPR_SIZE, SPR_SIZE);
  }
}
