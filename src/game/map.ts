import { GridMap } from '../engine/raycast';
import { Floor } from '../engine/textures';

/**
 * La casa (20x35). Leyenda: 0 vacío · 1 papel tapiz · 2 madera · 3 ladrillo · 4 puerta · 5 puerta de salida ·
 * 6 puerta de la arena del jefe.
 *
 * Estancias: Cocina (NO) · Sala (O) · Recibidor (SO, inicio) · Dormitorio (NE, llave) · Estudio (E) ·
 * Almacén (SE) · Pasillo central de 1 celda (x=9) que une todo. Bucles para huir: Recibidor→Sala→Pasillo→
 * Recibidor y Dormitorio→Estudio→Pasillo. La puerta (3,19) del recibidor, cerrada con llave, da a una gran arena
 * (filas 20-34) donde espera el jefe; al derrotarlo se abre la salida real (9,34).
 */
export const HOUSE_ROWS: readonly string[] = [
  '33333333111111111111', // 0
  '30222000301000000001', // 1  cocina | pasillo | dormitorio
  '30000000401000000001', // 2  puerta cocina↔pasillo (8,2)
  '30002000304000002201', // 3  puerta pasillo↔dormitorio (10,3)
  '30000000301000002201', // 4
  '33343333301000000001', // 5  puerta sala↔cocina (3,5)
  '10000000101111411111', // 6  puerta dormitorio↔estudio (14,6)
  '10000000102000000002', // 7  sala | estudio
  '10220000404000000002', // 8  puertas sala↔pasillo (8,8) y pasillo↔estudio (10,8)
  '10000020102002200002', // 9
  '10000000102000000002', // 10
  '22242222202222222222', // 11 puerta recibidor↔sala (3,11)
  '20000000203000000003', // 12 recibidor | pasillo | almacén
  '20020000203002200003', // 13
  '20000000203000000003', // 14
  '20000000404000000003', // 15 puertas (8,15) y (10,15)
  '20000000203000002203', // 16
  '20020000203020000003', // 17
  '20000000203000000003', // 18
  '22262222111333333333', // 19 puerta de la arena (3,19)
  '30000000000000000003', // 20 arena
  '30000000000000000003', // 21
  '30000000000000000003', // 22
  '30000330000003300003', // 23 columnas (cobertura)
  '30000000000000000003', // 24
  '30000000000000000003', // 25
  '30003000000000030003', // 26
  '30000000000000000003', // 27
  '30000000000000000003', // 28
  '30000330000003300003', // 29
  '30000000000000000003', // 30
  '30000000000000000003', // 31
  '30000000000000000003', // 32
  '30000000000000000003', // 33
  '33333333353333333333', // 34 salida real (9,34): se desbloquea al vencer al jefe
];

/** Rectángulos [x, y, ancho, alto] con un suelo distinto al de madera por defecto. */
const FLOOR_RECTS: readonly (readonly [number, number, number, number, number])[] = [
  [1, 1, 7, 4, Floor.Tile], // cocina
  [1, 6, 7, 5, Floor.Carpet], // sala
  [11, 1, 8, 5, Floor.Carpet], // dormitorio
  [11, 12, 8, 7, Floor.Stone], // almacén
  [9, 1, 1, 18, Floor.Stone], // pasillo
  [1, 20, 18, 14, Floor.Stone], // arena del jefe
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

/** Crea una instancia fresca de la casa (cada partida tiene su propio estado de puertas). */
export function createHouse(): GridMap {
  return parseMap(HOUSE_ROWS, FLOOR_RECTS);
}

/** Inicio: recibidor, mirando al suroeste hacia la puerta de la arena (3,19). */
export const START = { x: 6.5, y: 15.5, angle: Math.atan2(4, -3) };

/** Puerta de la arena del jefe y salida real de la casa. */
export const BOSS_DOOR = { x: 3, y: 19 };
export const FINAL_EXIT = { x: 9, y: 34 };
/** Donde aparece el jefe al abrir la puerta. */
export const BOSS_SPAWN = { x: 9.5, y: 30.5 };

export const enum ItemKind {
  Key = 0,
  Tonic = 1,
  PistolAmmo = 2,
  ShotgunShells = 3,
  Shotgun = 4,
  Smg = 5,
  /** Caja grande de balas (pistola y metralleta). */
  BulletCrate = 6,
  /** Caja grande de cartuchos de escopeta. */
  ShellCrate = 7,
}

export interface ItemSpawn {
  kind: ItemKind;
  x: number;
  y: number;
}

/** Objetos recogibles. La llave está en la zona más lejana (dormitorio, NE); la escopeta, en el estudio. */
export const ITEM_SPAWNS: readonly ItemSpawn[] = [
  { kind: ItemKind.Key, x: 17.5, y: 1.5 },
  { kind: ItemKind.Shotgun, x: 17.5, y: 10.5 },
  { kind: ItemKind.Tonic, x: 6.5, y: 3.5 },
  { kind: ItemKind.Tonic, x: 12.5, y: 18.5 },
  { kind: ItemKind.PistolAmmo, x: 2.5, y: 9.5 },
  { kind: ItemKind.PistolAmmo, x: 2.5, y: 12.5 },
  { kind: ItemKind.PistolAmmo, x: 12.5, y: 7.5 },
  { kind: ItemKind.ShotgunShells, x: 17.5, y: 13.5 },
  // arena del jefe: la metralleta junto a la puerta y munición abundante repartida entre las columnas
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
  /** SpriteId */
  tex: number;
  scale: number;
}

/** Decoración sin colisión (SpriteId: 5 lámpara, 6 planta, 7 barril). */
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

/** 6 zombis: 3 rezagados (lentos, resistentes) y 3 corredores (rápidos, frágiles). */
export const ZOMBIE_SPAWNS: readonly ZombieSpawn[] = [
  { type: 'walker', x: 5.5, y: 8.5 }, // sala
  { type: 'runner', x: 5.5, y: 2.5 }, // cocina
  { type: 'walker', x: 9.5, y: 6.5 }, // pasillo central (estrecho)
  { type: 'walker', x: 14.5, y: 3.5 }, // dormitorio, junto a la llave
  { type: 'runner', x: 15.5, y: 9.5 }, // estudio, junto a la escopeta
  { type: 'runner', x: 14.5, y: 16.5 }, // almacén
];
