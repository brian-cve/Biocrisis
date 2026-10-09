import { SpriteId } from '../engine/spriteBase';
import { InvItem } from './inventory';
import { ItemKind } from './map';
import { WeaponId } from './weapons';

export const PICKUP_RADIUS = 0.55;
export const BOX_BULLETS = 4;
export const BOX_SHELLS = 3;
export const SHOTGUN_START_MAG = 2;
export const SMG_START_MAG = 30;
export const CRATE_BULLETS = 40;
export const CRATE_SHELLS = 8;

export interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  taken: boolean;
}

export interface ItemDef {
  sprite: SpriteId;
  scale: number;
  message: string;
  // Inventory slot the item occupies; absent for ammo, which goes straight to the pool.
  slot?: InvItem;
  bullets?: number;
  shells?: number;
  // Magazine the weapon starts with when first picked up.
  mag?: { weapon: WeaponId; rounds: number };
}

const DEFAULT_SCALE = 0.32;

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  [ItemKind.Key]: { sprite: SpriteId.Key, scale: DEFAULT_SCALE, slot: InvItem.Key, message: 'You found the key... something stirs in the house' },
  [ItemKind.Tonic]: { sprite: SpriteId.Tonic, scale: DEFAULT_SCALE, slot: InvItem.Tonic, message: 'Tonic picked up' },
  [ItemKind.PistolAmmo]: { sprite: SpriteId.PistolAmmo, scale: DEFAULT_SCALE, bullets: BOX_BULLETS, message: 'Bullets picked up' },
  [ItemKind.ShotgunShells]: { sprite: SpriteId.ShotgunShells, scale: DEFAULT_SCALE, shells: BOX_SHELLS, message: 'Shells picked up' },
  [ItemKind.Shotgun]: {
    sprite: SpriteId.Shotgun,
    scale: DEFAULT_SCALE,
    slot: InvItem.Shotgun,
    mag: { weapon: 'shotgun', rounds: SHOTGUN_START_MAG },
    message: 'You found a shotgun',
  },
  [ItemKind.Smg]: {
    sprite: SpriteId.Smg,
    scale: 0.4,
    slot: InvItem.Smg,
    mag: { weapon: 'smg', rounds: SMG_START_MAG },
    message: 'Submachine gun. Hold fire for bursts',
  },
  [ItemKind.BulletCrate]: { sprite: SpriteId.PistolAmmo, scale: 0.46, bullets: CRATE_BULLETS, message: `Ammo crate: +${CRATE_BULLETS} bullets` },
  [ItemKind.ShellCrate]: { sprite: SpriteId.ShotgunShells, scale: 0.46, shells: CRATE_SHELLS, message: `Shell crate: +${CRATE_SHELLS}` },
};

export const WEAPON_ITEM: Record<WeaponId, InvItem> = { pistol: InvItem.Pistol, shotgun: InvItem.Shotgun, smg: InvItem.Smg };

export const WEAPON_MISSING: Record<WeaponId, string> = {
  pistol: 'You do not have that weapon',
  shotgun: 'You do not have the shotgun',
  smg: 'You do not have the submachine gun',
};
