import { Rng } from './rng';

export const TEX_SIZE = 64;

export const enum Wall {
  Wallpaper = 1,
  Wood = 2,
  Brick = 3,
  Door = 4,
  LockedDoor = 5,
  BossDoor = 6,
}
export const WALL_TEXTURE_COUNT = 7;

export type Texture = Uint8Array;

function make(fill: (x: number, y: number, set: (v: number) => void) => void): Texture {
  const t = new Uint8Array(TEX_SIZE * TEX_SIZE);
  for (let x = 0; x < TEX_SIZE; x++) {
    for (let y = 0; y < TEX_SIZE; y++) {
      fill(x, y, (v) => {
        t[x * TEX_SIZE + y] = v;
      });
    }
  }
  return t;
}

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function wallpaper(): Texture {
  return make((x, y, set) => {
    const stripe = x % 16 < 8;
    let v = stripe ? 4 : 3;
    const cx = (x % 16) - 8;
    const cy = (y % 16) - 8;
    if (Math.abs(cx) + Math.abs(cy) < 3) v = 5;
    const damp = hash(x >> 2, y >> 2, 1) * 0.5 + (y / TEX_SIZE) * 0.6;
    if (damp > 0.85) v = Math.max(2, v - 2);
    else if (damp > 0.6) v = Math.max(2, v - 1);
    if (hash(x, y, 2) > 0.94) v = Math.max(1, v - 1);
    if (y > 56) v = y > 59 ? 10 : 9;
    set(v);
  });
}

function wood(): Texture {
  return make((x, y, set) => {
    const plank = Math.floor(x / 16);
    let v = 10 + (plank % 2);
    const grain = Math.sin((y + plank * 13) * 0.35 + hash(x, 0, 3) * 2) * 0.5 + 0.5;
    if (grain > 0.8) v += 1;
    if (hash(x, y >> 1, 4) > 0.9) v -= 1;
    if (x % 16 === 0) v = 8;
    const kx = (plank * 23 + 7) % 16;
    const kd = Math.hypot(x % 16 - kx, y - ((plank * 29 + 17) % 56 + 4));
    if (kd < 1.8) v = 9;
    else if (kd < 2.6) v = Math.max(8, v - 1);
    set(v);
  });
}

function brick(): Texture {
  return make((x, y, set) => {
    const row = Math.floor(y / 8);
    const off = row % 2 ? 8 : 0;
    const bx = (x + off) % 16;
    const by = y % 8;
    if (by === 0 || bx === 0) {
      set(hash(x, y, 5) > 0.5 ? 23 : 22);
      return;
    }
    let v = 17 + ((Math.floor((x + off) / 16) + row * 3) % 3 === 0 ? 1 : 0);
    if (by === 1) v += 1;
    if (hash(x, y, 6) > 0.88) v -= 1;
    if (hash(x >> 1, y >> 1, 7) > 0.97) v = 16;
    set(Math.max(16, v));
  });
}

function door(): Texture {
  return make((x, y, set) => {
    let v = 11;
    const frame = x < 4 || x > 59 || y < 3 || y > 61;
    if (frame) v = 9;
    else {
      const px = x % 28 < 24 && x % 28 > 3;
      const py = (y > 6 && y < 28) || (y > 34 && y < 58);
      const panel = px && py && x > 3 && x < 60;
      const inner = panel && x % 28 > 6 && x % 28 < 21 && ((y > 9 && y < 25) || (y > 37 && y < 55));
      v = inner ? 12 : panel ? 13 : 10;
      if (hash(x, y >> 2, 8) > 0.85) v = Math.max(8, v - 1);
    }
    if (Math.hypot(x - 52, y - 33) < 2.6) v = 15;
    set(v);
  });
}

function lockedDoor(): Texture {
  return make((x, y, set) => {
    let v = 23 + (hash(x >> 3, y, 9) > 0.5 ? 1 : 0);
    if (x < 3 || x > 60 || y < 3 || y > 61) v = 22;
    if (y % 21 === 0 && x > 3 && x < 60) v = 22;
    if ((x % 14 === 6 || x % 14 === 7) && (y % 21 === 5 || y % 21 === 6)) v = 25;
    if (x > 44 && x < 58 && y > 24 && y < 42) v = 30;
    if (Math.hypot(x - 51, y - 31) < 2.2 || (x > 50 && x < 53 && y > 31 && y < 38)) v = 0;
    if (hash(x, y >> 2, 10) > 0.93 && y > 40) v = 18;
    set(v);
  });
}

export function buildWallTextures(seed = 1337): Texture[] {
  void new Rng(seed);
  const out: Texture[] = new Array(WALL_TEXTURE_COUNT);
  out[0] = new Uint8Array(TEX_SIZE * TEX_SIZE);
  out[Wall.Wallpaper] = wallpaper();
  out[Wall.Wood] = wood();
  out[Wall.Brick] = brick();
  out[Wall.Door] = door();
  out[Wall.LockedDoor] = lockedDoor();
  out[Wall.BossDoor] = lockedDoor();
  return out;
}

export const enum Floor {
  Wood = 0,
  Tile = 1,
  Stone = 2,
  Carpet = 3,
}
export const FLOOR_TYPE_COUNT = 4;

function floorWood(): Texture {
  return make((x, y, set) => {
    const row = Math.floor(y / 16);
    let v = 9 + ((row * 5) % 3 === 0 ? 1 : 0);
    const off = (row * 21) % 64;
    if (y % 16 === 0) v = 8;
    else if ((x + off) % 64 === 0) v = 8;
    if (hash(x >> 1, y, 11) > 0.9) v = Math.max(8, v - 1);
    if (hash(x, y >> 2, 12) > 0.93) v += 1;
    set(v);
  });
}

function floorTile(): Texture {
  return make((x, y, set) => {
    const grout = x % 16 === 0 || y % 16 === 0;
    let v = grout ? 2 : ((x >> 4) + (y >> 4)) % 2 === 0 ? 4 : 3;
    if (!grout && hash(x, y, 13) > 0.92) v -= 1;
    if (!grout && hash(x >> 2, y >> 2, 14) > 0.96) v = 17;
    set(v);
  });
}

function floorStone(): Texture {
  return make((x, y, set) => {
    let v = 22 + (hash(x >> 2, y >> 2, 15) > 0.5 ? 1 : 0);
    if (x % 32 === 0 || y % 32 === 0) v = 0;
    else if (hash(x, y, 16) > 0.9) v = 22;
    set(v);
  });
}

function floorCarpet(): Texture {
  return make((x, y, set) => {
    let v = 16 + (((x + y) & 3) === 0 ? 1 : 0);
    if (hash(x, y, 17) > 0.85) v = 17;
    if (x < 3 || x > 60 || y < 3 || y > 60) v = 18;
    set(v);
  });
}

export function buildFlatTextures(): { floors: Texture[]; ceiling: Texture } {
  const ceiling = make((x, y, set) => {
    let v = 3;
    if (hash(x >> 3, y >> 3, 18) > 0.8) v = 2;
    if (x % 32 === 0 || y % 32 === 0) v = 1;
    if (hash(x, y, 19) > 0.95) v = Math.max(1, v - 1);
    set(v);
  });
  return { floors: [floorWood(), floorTile(), floorStone(), floorCarpet()], ceiling };
}
