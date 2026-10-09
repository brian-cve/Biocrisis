import { GridMap } from '../engine/raycast';
import { Floor } from '../engine/textures';

export const HOUSE_ROWS: readonly string[] = [
  '33333333111111111111',
  '30222000301000000001',
  '30000000401000000001',
  '30002000304000002201',
  '30000000301000002201',
  '33343333301000000001',
  '10000000101111411111',
  '10000000102000000002',
  '10220000404000000002',
  '10000020102002200002',
  '10000000102000000002',
  '22242222202222222222',
  '20000000203000000003',
  '20020000203002200003',
  '20000000203000000003',
  '20000000404000000003',
  '20000000203000002203',
  '20020000203020000003',
  '20000000203000000003',
  '22262222111333333333',
  '30000000000000000003',
  '30000000000000000003',
  '30000000000000000003',
  '30000330000003300003',
  '30000000000000000003',
  '30000000000000000003',
  '30003000000000030003',
  '30000000000000000003',
  '30000000000000000003',
  '30000330000003300003',
  '30000000000000000003',
  '30000000000000000003',
  '30000000000000000003',
  '30000000000000000003',
  '33333333353333333333',
];

const FLOOR_RECTS: readonly (readonly [number, number, number, number, number])[] = [
  [1, 1, 7, 4, Floor.Tile],
  [1, 6, 7, 5, Floor.Carpet],
  [11, 1, 8, 5, Floor.Carpet],
  [11, 12, 8, 7, Floor.Stone],
  [9, 1, 1, 18, Floor.Stone],
  [1, 20, 18, 14, Floor.Stone],
];

export function parseMap(rows: readonly string[], floorRects: typeof FLOOR_RECTS = []): GridMap {
  const height = rows.length;
  const width = rows[0].length;
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    if (rows[y].length !== width) throw new Error(`Fila ${y} del mapa mide ${rows[y].length}, se esperaba ${width}`);
    for (let x = 0; x < width; x++) cells[y * width + x] = rows[y].charCodeAt(x) - 48;
  }
  const floors = new Uint8Array(width * height);
  for (const [rx, ry, rw, rh, type] of floorRects) {
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) floors[y * width + x] = type;
  }
  return { width, height, cells, doorOpen: new Float32Array(width * height), floors };
}

export function createHouse(): GridMap {
  return parseMap(HOUSE_ROWS, FLOOR_RECTS);
}

export const START = { x: 6.5, y: 15.5, angle: Math.atan2(4, -3) };

export const FINAL_EXIT = { x: 9, y: 34 };
export const BOSS_SPAWN = { x: 9.5, y: 30.5 };

export const enum ItemKind {
  Key = 0,
  Tonic = 1,
  PistolAmmo = 2,
  ShotgunShells = 3,
  Shotgun = 4,
  Smg = 5,
  BulletCrate = 6,
  ShellCrate = 7,
}

export interface ItemSpawn {
  kind: ItemKind;
  x: number;
  y: number;
}

export const ITEM_SPAWNS: readonly ItemSpawn[] = [
  { kind: ItemKind.Key, x: 17.5, y: 1.5 },
  { kind: ItemKind.Shotgun, x: 17.5, y: 10.5 },
  { kind: ItemKind.Tonic, x: 6.5, y: 3.5 },
  { kind: ItemKind.Tonic, x: 12.5, y: 18.5 },
  { kind: ItemKind.PistolAmmo, x: 2.5, y: 9.5 },
  { kind: ItemKind.PistolAmmo, x: 2.5, y: 12.5 },
  { kind: ItemKind.PistolAmmo, x: 12.5, y: 7.5 },
  { kind: ItemKind.ShotgunShells, x: 17.5, y: 13.5 },
  { kind: ItemKind.Smg, x: 3.5, y: 21.5 },
  { kind: ItemKind.BulletCrate, x: 2.5, y: 22.5 },
  { kind: ItemKind.BulletCrate, x: 16.5, y: 22.5 },
  { kind: ItemKind.BulletCrate, x: 2.5, y: 27.5 },
  { kind: ItemKind.BulletCrate, x: 16.5, y: 27.5 },
  { kind: ItemKind.BulletCrate, x: 6.5, y: 32.5 },
  { kind: ItemKind.BulletCrate, x: 12.5, y: 32.5 },
  { kind: ItemKind.ShellCrate, x: 9.5, y: 24.5 },
  { kind: ItemKind.ShellCrate, x: 9.5, y: 27.5 },
  { kind: ItemKind.Tonic, x: 1.5, y: 25.5 },
  { kind: ItemKind.Tonic, x: 17.5, y: 25.5 },
];

export interface DecorSpawn {
  x: number;
  y: number;
  tex: number;
  scale: number;
}

export const DECOR_SPAWNS: readonly DecorSpawn[] = [
  { x: 1.5, y: 6.5, tex: 5, scale: 0.75 },
  { x: 11.5, y: 1.5, tex: 5, scale: 0.75 },
  { x: 1.5, y: 17.5, tex: 6, scale: 0.6 },
  { x: 11.5, y: 10.5, tex: 6, scale: 0.6 },
  { x: 18.5, y: 12.5, tex: 7, scale: 0.55 },
  { x: 11.5, y: 18.5, tex: 7, scale: 0.55 },
  { x: 5.5, y: 1.5, tex: 7, scale: 0.55 },
  { x: 1.5, y: 20.5, tex: 5, scale: 0.75 },
  { x: 17.5, y: 20.5, tex: 5, scale: 0.75 },
  { x: 1.5, y: 33.5, tex: 7, scale: 0.55 },
  { x: 17.5, y: 33.5, tex: 7, scale: 0.55 },
  { x: 1.5, y: 30.5, tex: 7, scale: 0.55 },
];

export interface ZombieSpawn {
  type: 'walker' | 'runner';
  x: number;
  y: number;
}

export const ZOMBIE_SPAWNS: readonly ZombieSpawn[] = [
  { type: 'walker', x: 5.5, y: 8.5 },
  { type: 'runner', x: 5.5, y: 2.5 },
  { type: 'walker', x: 9.5, y: 6.5 },
  { type: 'walker', x: 14.5, y: 3.5 },
  { type: 'runner', x: 15.5, y: 9.5 },
  { type: 'runner', x: 14.5, y: 16.5 },
];
