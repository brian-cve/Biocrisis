import { Bmp, CLEAR } from './draw';
import { BAYER4, LIGHT_LEVELS, PALETTE_SIZE, SHADE } from './palette';

/** Arma en primera persona (pistola): reposo, retroceso y destello. Se dibuja ×2 sobre el framebuffer. */
export interface WeaponArt {
  idle: Bmp;
  recoil: Bmp;
  flash: Bmp;
  /** Solo escopeta: fase de bombeo tras el disparo. */
  pump?: Bmp;
  /** Desplazamiento del destello respecto a la esquina superior del arma (px del bitmap). */
  flashDx: number;
  flashDy: number;
}

function pistolBody(slideBack: number): Bmp {
  const b = new Bmp(36, 40);
  const cx = 18;
  // manga y mano
  b.rect(cx - 9, 31, 18, 9, 3);
  b.rect(cx - 9, 31, 18, 1, 5);
  b.rect(cx - 7, 24 + slideBack, 14, 9, 13);
  b.rect(cx - 7, 24 + slideBack, 14, 1, 14);
  b.rect(cx + 3, 25 + slideBack, 3, 7, 12);
  // empuñadura
  b.rect(cx - 4, 20 + slideBack, 8, 6, 22);
  // corredera: se estrecha hacia arriba (perspectiva)
  for (let y = 4; y < 22; y++) {
    const half = 4 + Math.floor((y - 4) / 9);
    b.rect(cx - half, y + slideBack, half * 2 + 1, 1, y < 6 ? 27 : 24);
    b.px(cx - half, y + slideBack, 25);
    b.px(cx + half, y + slideBack, 23);
  }
  b.rect(cx - 2, 2 + slideBack, 5, 3, 23); // boca del cañón
  b.rect(cx, 0 + slideBack, 1, 3, 27); // punto de mira
  b.rect(cx - 1, 8 + slideBack, 3, 12, 22); // ranura central de la corredera
  b.rect(cx - 6, 19 + slideBack, 2, 3, 27); // alza
  b.rect(cx + 5, 19 + slideBack, 2, 3, 27);
  return b.outline(0);
}

function flash(): Bmp {
  const b = new Bmp(24, 20);
  b.disc(12, 12, 7, 30);
  b.disc(12, 12, 5, 31);
  b.disc(12, 12, 2, 27);
  b.line(12, 12, 12, 0, 31);
  b.line(12, 12, 3, 3, 30);
  b.line(12, 12, 21, 3, 30);
  b.line(12, 12, 0, 10, 30);
  b.line(12, 12, 23, 10, 30);
  return b;
}

export function buildPistolArt(): WeaponArt {
  return { idle: pistolBody(0), recoil: pistolBody(2), flash: flash(), flashDx: 7, flashDy: -13 };
}

function shotgunBody(slideBack: number, pump: number): Bmp {
  const b = new Bmp(40, 44);
  const cx = 20;
  // manga y manos
  b.rect(cx - 11, 35 + slideBack, 22, 9, 3);
  b.rect(cx - 11, 35 + slideBack, 22, 1, 5);
  b.rect(cx - 9, 28 + slideBack, 18, 8, 13); // mano trasera
  b.rect(cx - 9, 28 + slideBack, 18, 1, 14);
  // receptor
  b.rect(cx - 6, 22 + slideBack, 12, 8, 22);
  b.rect(cx - 6, 22 + slideBack, 12, 1, 25);
  // cañón y tubo del cargador: se estrechan hacia el frente
  for (let y = 2; y < 23; y++) {
    const half = 3 + Math.floor((y - 2) / 10);
    b.rect(cx - half, y + slideBack, half * 2 + 1, 1, 24);
    b.px(cx - half, y + slideBack, 25);
    b.px(cx + half, y + slideBack, 23);
  }
  b.rect(cx - 1, 2 + slideBack, 3, 20, 23); // cinta de mira
  b.rect(cx - 1, 0 + slideBack, 3, 3, 27); // punto de mira
  // guardamano (corredera): se desplaza al bombear
  const py = 9 + pump;
  b.rect(cx - 7, py, 14, 7, 12);
  b.rect(cx - 7, py, 14, 1, 13);
  b.rect(cx - 7, py + 6, 14, 1, 9);
  for (let x = cx - 6; x < cx + 6; x += 2) b.px(x, py + 3, 10);
  b.rect(cx - 9, py + 1, 3, 5, 14); // mano delantera
  b.rect(cx + 6, py + 1, 3, 5, 14);
  return b.outline(0);
}

function bigFlash(): Bmp {
  const b = new Bmp(32, 26);
  b.disc(16, 16, 10, 30);
  b.disc(16, 16, 7, 31);
  b.disc(16, 16, 3, 27);
  for (const [x, y] of [[16, 0], [2, 4], [30, 4], [0, 14], [31, 14], [6, 0], [26, 0]]) b.line(16, 16, x, y, 30);
  b.line(16, 16, 16, 0, 31);
  return b;
}

export function buildShotgunArt(): WeaponArt {
  return { idle: shotgunBody(0, 0), recoil: shotgunBody(3, 0), pump: shotgunBody(0, 7), flash: bigFlash(), flashDx: 4, flashDy: -18 };
}

/** Copia un índice de textura de sprite (32×32, por columnas) a un Bmp para dibujarlo como overlay. */
export function bmpFromTexture(tex: Uint8Array, size = 32): Bmp {
  const b = new Bmp(size, size);
  b.d.set(tex);
  return b;
}

/** Copia un bitmap (índices de paleta) al buffer con escala entera. `level` = nivel de luz (0 brillante). */
export function blit(pixels: Uint32Array, sw: number, sh: number, bmp: Bmp, x: number, y: number, scale: number, level: number): void {
  x = Math.round(x);
  y = Math.round(y);
  for (let bx = 0; bx < bmp.w; bx++) {
    for (let by = 0; by < bmp.h; by++) {
      const c = bmp.d[bx * bmp.h + by];
      if (c === CLEAR) continue;
      for (let i = 0; i < scale; i++) {
        for (let j = 0; j < scale; j++) {
          const px = x + bx * scale + i;
          const py = y + by * scale + j;
          if (px < 0 || py < 0 || px >= sw || py >= sh) continue;
          let l = level + BAYER4[(px & 3) + ((py & 3) << 2)] * 0.8;
          if (l >= LIGHT_LEVELS) l = LIGHT_LEVELS - 1;
          pixels[py * sw + px] = SHADE[(l | 0) * PALETTE_SIZE + c];
        }
      }
    }
  }
}
