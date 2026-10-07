import { Bmp } from './draw';
import { Texture } from './textures';

export const SPR_SIZE = 32;
/** Índice de paleta reservado como "transparente" en texturas de sprite. */
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
  /** Zombi lento: 5 poses consecutivas (ver ZPose). */
  WalkerBase = 8,
  /** Zombi rápido: 5 poses consecutivas. */
  RunnerBase = 13,
}
/** Icono de la pistola (solo menú). */
export const PISTOL_ICON = 18;
export const SPRITE_COUNT = 19;

/** Orden de poses dentro de cada bloque de zombi. */
export const enum ZPose {
  WalkA = 0,
  WalkB = 1,
  Attack = 2,
  Hurt = 3,
  Dead = 4,
}

/** Sprite en el mundo. `scale` = altura relativa a una pared; `lift` = elevación sobre el suelo (en paredes). */
export interface Sprite {
  x: number;
  y: number;
  tex: number;
  scale: number;
  lift: number;
  /** Distancia² a la cámara; la rellena SpriteBatch.sort. */
  dist2: number;
}

/** Lista reutilizable de sprites (sin asignaciones por frame) con orden lejano→cercano. */
export class SpriteBatch {
  readonly items: Sprite[] = [];
  count = 0;

  clear(): void {
    this.count = 0;
  }

  add(x: number, y: number, tex: number, scale: number, lift = 0): void {
    let s = this.items[this.count];
    if (s === undefined) {
      s = { x: 0, y: 0, tex: 0, scale: 1, lift: 0, dist2: 0 };
      this.items[this.count] = s;
    }
    s.x = x;
    s.y = y;
    s.tex = tex;
    s.scale = scale;
    s.lift = lift;
    this.count++;
  }

  /** Ordena por distancia decreciente (inserción: N es pequeño y el orden casi no cambia entre frames). */
  sort(camX: number, camY: number): void {
    const a = this.items;
    for (let i = 0; i < this.count; i++) {
      const dx = a[i].x - camX;
      const dy = a[i].y - camY;
      a[i].dist2 = dx * dx + dy * dy;
    }
    for (let i = 1; i < this.count; i++) {
      const s = a[i];
      let j = i - 1;
      while (j >= 0 && a[j].dist2 < s.dist2) {
        a[j + 1] = a[j];
        j--;
      }
      a[j + 1] = s;
    }
  }
}

class Spr extends Bmp {
  constructor() {
    super(SPR_SIZE, SPR_SIZE);
  }
}

function key(): Texture {
  const s = new Spr();
  s.disc(9, 15, 6, 13);
  s.disc(9, 15, 3, 255); // ojo de la llave
  s.disc(7, 13, 1, 31);
  s.rect(14, 14, 14, 3, 14);
  s.rect(14, 14, 14, 1, 15);
  s.rect(23, 17, 2, 5, 13); // dientes
  s.rect(27, 17, 2, 4, 13);
  s.rect(19, 17, 2, 3, 13);
  return s.outline(0).d;
}

function tonic(): Texture {
  const s = new Spr();
  s.disc(16, 21, 9, 5); // frasco
  s.disc(16, 22, 7, 7); // líquido
  s.rect(9, 11, 14, 4, 5); // hombro
  s.rect(13, 6, 6, 8, 24); // cuello
  s.rect(13, 3, 6, 4, 11); // corcho
  s.rect(11, 18, 3, 2, 31); // brillo
  s.px(12, 17, 27);
  s.rect(11, 23, 10, 4, 6); // etiqueta
  return s.outline(1).d;
}

function pistolAmmo(): Texture {
  const s = new Spr();
  s.rect(5, 17, 22, 12, 12);
  s.rect(5, 17, 22, 2, 13);
  s.rect(5, 27, 22, 2, 9);
  s.rect(9, 21, 14, 4, 15); // etiqueta
  for (let i = 0; i < 4; i++) {
    s.rect(7 + i * 5, 8, 3, 9, 14); // balas
    s.rect(7 + i * 5, 6, 3, 3, 25); // puntas
    s.px(7 + i * 5, 10, 31);
  }
  return s.outline(8).d;
}

function shells(): Texture {
  const s = new Spr();
  s.rect(5, 17, 22, 12, 19);
  s.rect(5, 17, 22, 2, 21);
  s.rect(5, 27, 22, 2, 16);
  s.rect(9, 21, 14, 4, 27);
  for (let i = 0; i < 3; i++) {
    s.rect(7 + i * 7, 7, 5, 10, 20); // cartuchos rojos
    s.rect(7 + i * 7, 13, 5, 4, 14); // base de latón
    s.px(8 + i * 7, 9, 21);
  }
  return s.outline(16).d;
}

function shotgun(): Texture {
  const s = new Spr();
  s.rect(1, 11, 24, 3, 25); // cañón
  s.rect(1, 11, 24, 1, 27);
  s.rect(1, 14, 18, 2, 24); // tubo del cargador
  s.rect(9, 16, 7, 3, 12); // corredera
  s.rect(18, 13, 8, 5, 22); // receptor
  s.rect(25, 14, 6, 9, 11); // culata
  s.rect(25, 14, 6, 2, 13);
  s.rect(20, 18, 3, 3, 23); // guardamonte
  return s.outline(0).d;
}

function pistolIcon(): Texture {
  const s = new Spr();
  s.rect(3, 9, 24, 5, 24); // corredera
  s.rect(3, 9, 24, 1, 27);
  s.rect(3, 13, 24, 1, 23);
  s.rect(26, 10, 2, 3, 22); // boca
  s.rect(5, 7, 2, 2, 27); // alza
  s.rect(24, 7, 1, 2, 27); // punto de mira
  s.rect(4, 14, 12, 4, 22); // armazón
  s.rect(6, 18, 6, 9, 11); // empuñadura
  s.rect(6, 18, 2, 9, 12);
  s.rect(15, 18, 5, 1, 23); // guardamonte
  s.rect(19, 15, 1, 3, 23);
  s.rect(14, 15, 1, 3, 23);
  return s.outline(0).d;
}

function lamp(): Texture {
  const s = new Spr();
  s.rect(12, 28, 8, 3, 23);
  s.rect(15, 11, 2, 17, 24);
  for (let i = 0; i < 8; i++) s.rect(15 - 3 - i, 3 + i, 6 + 2 * i + 2, 1, i < 2 ? 15 : 14); // pantalla
  s.rect(10, 11, 12, 1, 12);
  return s.outline(8).d;
}

function plant(): Texture {
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

function barrel(): Texture {
  const s = new Spr();
  s.rect(7, 4, 18, 27, 11);
  s.rect(8, 3, 16, 1, 12);
  s.rect(8, 31 - 1, 16, 1, 9);
  for (let x = 7; x < 25; x += 4) s.rect(x, 4, 1, 27, 10); // duelas
  s.rect(7, 9, 18, 2, 23); // aros
  s.rect(7, 22, 18, 2, 23);
  s.rect(7, 9, 18, 1, 25);
  return s.outline(8).d;
}

interface ZStyle {
  skin: number;
  skinDark: number;
  cloth: number;
  clothLight: number;
  halfTorso: number;
  headY: number;
}

const WALKER: ZStyle = { skin: 5, skinDark: 4, cloth: 3, clothLight: 4, halfTorso: 6, headY: 6 };
const RUNNER: ZStyle = { skin: 6, skinDark: 5, cloth: 22, clothLight: 23, halfTorso: 4, headY: 8 };

function zombie(st: ZStyle, pose: ZPose): Texture {
  const s = new Spr();
  const blood = 20;
  if (pose === ZPose.Dead) {
    s.disc(15, 28, 7, 18); // charco
    s.rect(7, 25, 20, 5, st.cloth); // torso tendido
    s.rect(7, 25, 20, 1, st.clothLight);
    s.disc(5, 27, 3, st.skin); // cabeza
    s.px(4, 26, 30);
    s.rect(26, 26, 5, 3, st.skinDark); // piernas
    s.rect(12, 27, 4, 2, blood);
    return s.outline(0).d;
  }
  const hurt = pose === ZPose.Hurt;
  const hx = hurt ? 18 : 16;
  const hy = st.headY + (hurt ? 1 : 0);
  // piernas (se alternan en WalkA/WalkB)
  const a = pose === ZPose.WalkB ? 1 : 0;
  s.rect(16 - st.halfTorso + 1, 22, 4, 9 - a, st.skinDark);
  s.rect(16 + st.halfTorso - 5, 22, 4, 8 + a, st.skinDark);
  s.rect(16 - st.halfTorso + 1, 22, 4, 4, st.cloth);
  s.rect(16 + st.halfTorso - 5, 22, 4, 4, st.cloth);
  // torso
  s.rect(16 - st.halfTorso, 11, st.halfTorso * 2, 12, st.cloth);
  s.rect(16 - st.halfTorso, 11, st.halfTorso * 2, 2, st.clothLight);
  for (let i = 0; i < st.halfTorso * 2; i += 3) s.px(16 - st.halfTorso + i, 23, st.cloth); // jirones
  s.rect(14, 15, 3, 4, blood);
  s.px(18, 17, blood);
  // brazos: adelantados, más altos al atacar
  const armTop = pose === ZPose.Attack ? 7 : 12 + a;
  const reach = st.halfTorso;
  s.rect(16 - reach - 3, armTop, 3, 11, st.skin);
  s.rect(16 + reach, armTop, 3, 11, st.skin);
  s.rect(16 - reach - 3, armTop - 1, 3, 2, st.skinDark);
  s.rect(16 + reach, armTop - 1, 3, 2, st.skinDark);
  // cabeza
  s.rect(hx - 1, hy + 4, 3, 3, st.skinDark);
  s.disc(hx, hy, 4, st.skin);
  s.px(hx - 2, hy - 1, 31);
  s.px(hx + 2, hy - 1, 31);
  if (pose === ZPose.Attack) s.rect(hx - 2, hy + 1, 5, 3, 16);
  else s.rect(hx - 1, hy + 2, 3, 1, 16);
  s.px(hx + 1, hy + 3, blood);
  if (hurt) {
    s.rect(11, 12, 3, 3, blood);
    s.rect(19, 18, 3, 2, blood);
  }
  return s.outline(0).d;
}

export function buildSpriteTextures(): Texture[] {
  const out: Texture[] = new Array(SPRITE_COUNT);
  out[SpriteId.Key] = key();
  out[SpriteId.Tonic] = tonic();
  out[SpriteId.PistolAmmo] = pistolAmmo();
  out[SpriteId.ShotgunShells] = shells();
  out[SpriteId.Shotgun] = shotgun();
  out[SpriteId.Lamp] = lamp();
  out[SpriteId.Plant] = plant();
  out[SpriteId.Barrel] = barrel();
  out[PISTOL_ICON] = pistolIcon();
  for (let p = 0; p < 5; p++) {
    out[SpriteId.WalkerBase + p] = zombie(WALKER, p);
    out[SpriteId.RunnerBase + p] = zombie(RUNNER, p);
  }
  return out;
}
