import { Spr } from './spriteBase';
import { Texture } from './textures';

export function key(): Texture {
  const s = new Spr();
  s.disc(9, 15, 6, 13);
  s.disc(9, 15, 3, 255);
  s.disc(7, 13, 1, 31);
  s.rect(14, 14, 14, 3, 14);
  s.rect(14, 14, 14, 1, 15);
  s.rect(23, 17, 2, 5, 13);
  s.rect(27, 17, 2, 4, 13);
  s.rect(19, 17, 2, 3, 13);
  return s.outline(0).d;
}

export function tonic(): Texture {
  const s = new Spr();
  s.disc(16, 21, 9, 5);
  s.disc(16, 22, 7, 7);
  s.rect(9, 11, 14, 4, 5);
  s.rect(13, 6, 6, 8, 24);
  s.rect(13, 3, 6, 4, 11);
  s.rect(11, 18, 3, 2, 31);
  s.px(12, 17, 27);
  s.rect(11, 23, 10, 4, 6);
  return s.outline(1).d;
}

export function pistolAmmo(): Texture {
  const s = new Spr();
  s.rect(5, 17, 22, 12, 12);
  s.rect(5, 17, 22, 2, 13);
  s.rect(5, 27, 22, 2, 9);
  s.rect(9, 21, 14, 4, 15);
  for (let i = 0; i < 4; i++) {
    s.rect(7 + i * 5, 8, 3, 9, 14);
    s.rect(7 + i * 5, 6, 3, 3, 25);
    s.px(7 + i * 5, 10, 31);
  }
  return s.outline(8).d;
}

export function shells(): Texture {
  const s = new Spr();
  s.rect(5, 17, 22, 12, 19);
  s.rect(5, 17, 22, 2, 21);
  s.rect(5, 27, 22, 2, 16);
  s.rect(9, 21, 14, 4, 27);
  for (let i = 0; i < 3; i++) {
    s.rect(7 + i * 7, 7, 5, 10, 20);
    s.rect(7 + i * 7, 13, 5, 4, 14);
    s.px(8 + i * 7, 9, 21);
  }
  return s.outline(16).d;
}

export function shotgun(): Texture {
  const s = new Spr();
  s.rect(1, 11, 24, 3, 25);
  s.rect(1, 11, 24, 1, 27);
  s.rect(1, 14, 18, 2, 24);
  s.rect(9, 16, 7, 3, 12);
  s.rect(18, 13, 8, 5, 22);
  s.rect(25, 14, 6, 9, 11);
  s.rect(25, 14, 6, 2, 13);
  s.rect(20, 18, 3, 3, 23);
  return s.outline(0).d;
}

export function pistolIcon(): Texture {
  const s = new Spr();
  s.rect(3, 9, 24, 5, 24);
  s.rect(3, 9, 24, 1, 27);
  s.rect(3, 13, 24, 1, 23);
  s.rect(26, 10, 2, 3, 22);
  s.rect(5, 7, 2, 2, 27);
  s.rect(24, 7, 1, 2, 27);
  s.rect(4, 14, 12, 4, 22);
  s.rect(6, 18, 6, 9, 11);
  s.rect(6, 18, 2, 9, 12);
  s.rect(15, 18, 5, 1, 23);
  s.rect(19, 15, 1, 3, 23);
  s.rect(14, 15, 1, 3, 23);
  return s.outline(0).d;
}

export function smg(): Texture {
  const s = new Spr();
  s.rect(1, 11, 12, 3, 24);
  s.rect(1, 11, 12, 1, 27);
  s.rect(0, 10, 2, 5, 23);
  s.rect(11, 10, 14, 6, 22);
  s.rect(11, 10, 14, 1, 25);
  s.rect(24, 11, 6, 4, 11);
  s.rect(24, 11, 6, 1, 13);
  s.rect(14, 16, 4, 12, 24);
  s.rect(14, 16, 4, 1, 27);
  s.rect(14, 27, 4, 1, 23);
  s.rect(20, 16, 3, 7, 11);
  s.rect(19, 16, 1, 1, 23);
  s.rect(7, 16, 6, 1, 23);
  s.rect(12, 8, 8, 2, 23);
  s.px(2, 9, 27);
  return s.outline(0).d;
}

export function lamp(): Texture {
  const s = new Spr();
  s.rect(12, 28, 8, 3, 23);
  s.rect(15, 11, 2, 17, 24);
  for (let i = 0; i < 8; i++) s.rect(15 - 3 - i, 3 + i, 6 + 2 * i + 2, 1, i < 2 ? 15 : 14);
  s.rect(10, 11, 12, 1, 12);
  return s.outline(8).d;
}

export function plant(): Texture {
  const s = new Spr();
  s.rect(10, 22, 12, 9, 19);
  s.rect(9, 21, 14, 2, 20);
  s.rect(11, 29, 10, 2, 16);
  const leaves: [number, number, number][] = [[16, 21, 7], [16, 21, 24], [16, 21, 12], [16, 21, 20], [16, 21, 16]];
  const ends: [number, number][] = [[6, 6], [26, 8], [9, 14], [24, 15], [16, 3]];
  leaves.forEach(([x, y], i) => s.line(x, y, ends[i][0], ends[i][1], i % 2 ? 9 : 10));
  s.disc(6, 7, 2, 12);
  s.disc(26, 9, 2, 12);
  return s.outline(8).d;
}

export function barrel(): Texture {
  const s = new Spr();
  s.rect(7, 4, 18, 27, 11);
  s.rect(8, 3, 16, 1, 12);
  s.rect(8, 31 - 1, 16, 1, 9);
  for (let x = 7; x < 25; x += 4) s.rect(x, 4, 1, 27, 10);
  s.rect(7, 9, 18, 2, 23);
  s.rect(7, 22, 18, 2, 23);
  s.rect(7, 9, 18, 1, 25);
  return s.outline(8).d;
}
