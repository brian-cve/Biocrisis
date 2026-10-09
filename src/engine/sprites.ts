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
  /** Icono de la pistola (solo menú). */
  PistolIcon = 18,
  /** Jefe de la arena: 5 poses consecutivas (ver ZPose). */
  BossBase = 19,
  Smg = 24,
}
export const PISTOL_ICON = SpriteId.PistolIcon;
export const SPRITE_COUNT = 25;

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

function smg(): Texture {
  const s = new Spr();
  s.rect(1, 11, 12, 3, 24); // cañón con cubrellamas
  s.rect(1, 11, 12, 1, 27);
  s.rect(0, 10, 2, 5, 23);
  s.rect(11, 10, 14, 6, 22); // cuerpo
  s.rect(11, 10, 14, 1, 25);
  s.rect(24, 11, 6, 4, 11); // culata plegable
  s.rect(24, 11, 6, 1, 13);
  s.rect(14, 16, 4, 12, 24); // cargador largo
  s.rect(14, 16, 4, 1, 27);
  s.rect(14, 27, 4, 1, 23);
  s.rect(20, 16, 3, 7, 11); // empuñadura
  s.rect(19, 16, 1, 1, 23);
  s.rect(7, 16, 6, 1, 23); // guardamonte
  s.rect(12, 8, 8, 2, 23); // alza / riel
  s.px(2, 9, 27);
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
  skinMid: number;
  skinDark: number;
  hair: number;
  cloth: number;
  clothLight: number;
  clothDark: number;
  pants: number;
  pantsLight: number;
  /** Semianchura de hombros (px). */
  shoulder: number;
  headY: number;
}

/** Caminante: chaqueta marrón hecha jirones, piel grisácea. Corredor: camisa azul-gris, más flaco y encorvado. */
const WALKER: ZStyle = { skin: 7, skinMid: 6, skinDark: 5, hair: 1, cloth: 11, clothLight: 13, clothDark: 9, pants: 22, pantsLight: 23, shoulder: 7, headY: 7 };
const RUNNER: ZStyle = { skin: 6, skinMid: 5, skinDark: 4, hair: 8, cloth: 28, clothLight: 29, clothDark: 3, pants: 2, pantsLight: 3, shoulder: 6, headY: 8 };

const BLOOD = 20;
const BLOOD_DARK = 18;
const BLOOD_LIGHT = 21;
const BONE = 27;

/** Brazo encorvado hacia delante: hombro -> codo -> mano en alto con dedos como garras. */
function zArm(s: Spr, st: ZStyle, side: -1 | 1, shoulderX: number, handTop: number): void {
  const sx = shoulderX;
  const ex = sx + side * 3; // codo hacia fuera
  const ey = 18;
  const hx = sx + side * 1;
  for (let k = 0; k < 2; k++) {
    s.line(sx + side * k, 12, ex + side * k, ey, k ? st.cloth : st.clothLight); // manga
  }
  s.line(ex, ey, hx, handTop + 3, st.skin); // antebrazo
  s.line(ex - side, ey, hx - side, handTop + 3, st.skinMid);
  s.rect(ex - 1, ey - 1, 2, 2, st.clothDark); // manga rota en el codo
  s.rect(hx - 1, handTop + 1, 3, 3, st.skin); // mano
  s.px(hx - 1, handTop, st.skinDark); // dedos
  s.px(hx + 1, handTop, st.skinDark);
  s.px(hx, handTop - 1, st.skinMid);
  s.px(hx + side, handTop + 4, BLOOD);
}

function zombie(st: ZStyle, pose: ZPose): Texture {
  const s = new Spr();
  if (pose === ZPose.Dead) {
    s.disc(16, 28, 10, BLOOD_DARK); // charco
    s.disc(12, 29, 6, BLOOD);
    s.rect(8, 22, 18, 7, st.cloth); // torso tendido
    s.rect(8, 22, 18, 2, st.clothLight);
    s.rect(8, 27, 18, 2, st.clothDark);
    s.rect(12, 24, 4, 3, st.skinMid); // pecho abierto
    s.rect(13, 25, 2, 2, BLOOD_LIGHT);
    s.disc(5, 25, 4, st.skin); // cabeza
    s.rect(2, 22, 5, 2, st.hair);
    s.px(4, 25, 1);
    s.px(6, 25, BONE);
    s.rect(4, 27, 3, 1, 1);
    s.rect(26, 24, 5, 4, st.pants); // piernas
    s.rect(29, 25, 2, 3, st.skinDark);
    s.line(9, 22, 2, 19, st.skin); // brazo extendido
    s.line(10, 22, 3, 20, st.skinMid);
    s.px(1, 18, st.skinDark);
    s.px(2, 18, st.skinDark);
    return s.outline(0).d;
  }
  const hurt = pose === ZPose.Hurt;
  const attack = pose === ZPose.Attack;
  const a = pose === ZPose.WalkB ? 1 : 0;
  const lean = pose === ZPose.WalkB ? 1 : 0;
  const hurtDx = hurt ? 3 : 0;
  const cx = 16;
  const sh = st.shoulder;

  // piernas: pantalón roto, una pierna arrastrándose
  const lx = cx - 5;
  const rx = cx + 1;
  s.rect(lx, 21, 4, 8 - a, st.pants);
  s.rect(rx, 21, 4, 7 + a, st.pants);
  s.rect(lx, 21, 1, 8 - a, st.pantsLight);
  s.rect(rx, 21, 1, 7 + a, st.pantsLight);
  s.rect(lx, 26 - a, 4, 3, st.skinMid); // pantorrilla desnuda por el desgarro
  s.rect(rx + 1, 25 + a, 3, 3, st.skinMid);
  s.px(lx + 1, 26 - a, BLOOD);
  s.px(rx + 2, 26 + a, BLOOD_DARK);
  s.rect(lx - 1, 29 - a, 6, 2, st.skinDark); // pies descalzos
  s.rect(rx - 1, 28 + a, 6, 2, st.skinDark);
  s.px(lx + 4, 30 - a, st.skinMid);

  // torso: trapecio encorvado (hombros anchos, cintura estrecha)
  for (let y = 11; y < 23; y++) {
    const half = sh - Math.floor((y - 11) / 4);
    const x0 = cx - half + (y < 14 ? lean : 0);
    const w = half * 2;
    s.rect(x0, y, w, 1, st.cloth);
    s.px(x0, y, st.clothLight);
    s.px(x0 + 1, y, st.clothLight);
    s.px(x0 + w - 1, y, st.clothDark);
    if (y % 3 === 0) s.px(x0 + w - 2, y, st.clothDark);
  }
  s.rect(cx - sh, 11, sh * 2, 1, st.clothLight); // hombros
  // dobladillo desgarrado
  for (let i = 0; i < 2 * (sh - 2); i += 2) s.px(cx - sh + 2 + i, 23, i % 4 === 0 ? st.clothDark : st.cloth);
  // herida abierta en el torso: piel, costillas, sangre
  s.rect(cx - 4, 14, 5, 6, st.skinMid);
  s.rect(cx - 3, 15, 3, 4, BLOOD);
  s.rect(cx - 3, 17, 2, 1, BONE);
  s.px(cx - 2, 15, BLOOD_LIGHT);
  s.rect(cx - 1, 19, 1, 3, BLOOD); // chorro hacia abajo
  s.rect(cx + 3, 13, 2, 2, BLOOD_DARK); // manchas
  s.rect(cx + 2, 20, 3, 2, BLOOD_DARK);
  s.px(cx + 4, 17, BLOOD);

  // brazos adelantados; en el ataque suben hasta la cara
  const topL = attack ? 3 : 6 + a;
  const topR = attack ? 3 : 7 - a;
  zArm(s, st, -1, cx - sh + 1, hurt ? 13 : topL);
  zArm(s, st, 1, cx + sh - 2, hurt ? 9 : topR);

  // cabeza encorvada y ladeada
  const hx = cx + (hurt ? 2 : 0) + lean - 1 + hurtDx * 0;
  const hy = st.headY + (hurt ? 2 : 0);
  s.rect(hx, hy + 3, 3, 4, st.skinDark); // cuello tendinoso
  s.disc(hx + 1, hy, 4, st.skin);
  s.rect(hx - 3, hy, 1, 4, st.skinMid); // mejilla hundida
  s.rect(hx + 4, hy - 1, 1, 4, st.skinDark);
  s.rect(hx - 2, hy - 4, 7, 2, st.hair); // pelo enmarañado
  s.px(hx - 3, hy - 2, st.hair);
  s.px(hx + 4, hy - 2, st.hair);
  s.px(hx - 1, hy - 5, st.hair);
  s.px(hx + 3, hy - 5, st.hair);
  // ojos: cuencas hundidas con iris lechoso
  s.rect(hx - 2, hy - 1, 2, 2, 0);
  s.rect(hx + 2, hy - 1, 2, 2, 0);
  s.px(hx - 1, hy - 1, 26);
  s.px(hx + 3, hy - 1, 26);
  s.px(hx + 1, hy + 1, 1); // nariz
  // boca: abierta y desencajada, dientes, baba de sangre
  if (attack || hurt) {
    s.rect(hx - 2, hy + 2, 6, 4, 0);
    s.rect(hx - 1, hy + 2, 4, 1, BONE);
    s.px(hx, hy + 5, 25);
    s.px(hx + 2, hy + 5, 25);
    s.rect(hx - 1, hy + 6, 2, 2, BLOOD);
  } else {
    s.rect(hx - 1, hy + 2, 4, 2, 0);
    s.px(hx, hy + 2, BONE);
    s.px(hx + 2, hy + 2, BONE);
    s.px(hx, hy + 4, BLOOD);
  }
  // mordida/herida en la mejilla
  s.rect(hx + 3, hy + 1, 2, 2, BLOOD);
  s.px(hx + 3, hy + 3, BLOOD_DARK);
  if (hurt) {
    s.rect(cx - 7, 12, 3, 3, BLOOD_LIGHT);
    s.rect(cx + 4, 16, 3, 2, BLOOD_LIGHT);
    s.px(hx - 3, hy - 3, BLOOD_LIGHT);
  }
  return s.outline(0).d;
}

/** Jefe: mole encorvada de músculo expuesto, un brazo hipertrofiado con garras de hueso y ojos amarillos. */
function boss(pose: ZPose): Texture {
  const s = new Spr();
  const skin = 6;
  const skinD = 4;
  const skinL = 7;
  const musc = 19;
  const muscL = 20;
  const coat = 22;
  const coatL = 23;
  if (pose === ZPose.Dead) {
    s.disc(16, 28, 13, 18); // charco enorme
    s.disc(11, 29, 8, 19);
    s.rect(3, 19, 26, 10, skin); // cuerpo desplomado
    s.rect(3, 19, 26, 2, skinL);
    s.rect(3, 27, 26, 2, skinD);
    s.rect(8, 21, 8, 5, musc);
    s.rect(10, 22, 4, 3, muscL);
    s.rect(18, 20, 8, 7, coat);
    s.disc(5, 22, 3, skin); // cabeza
    s.px(4, 21, 1);
    s.px(6, 21, 1);
    s.line(26, 22, 31, 18, 27); // garras
    s.line(27, 24, 31, 22, 27);
    s.px(30, 27, 27);
    return s.outline(0).d;
  }
  const a = pose === ZPose.WalkB ? 1 : 0;
  const attack = pose === ZPose.Attack;
  const hurt = pose === ZPose.Hurt;
  const sway = pose === ZPose.WalkB ? 1 : 0;
  // piernas gruesas
  s.rect(8, 22, 6, 9 - a, coat);
  s.rect(18, 22, 6, 8 + a, coat);
  s.rect(8, 22, 1, 9 - a, coatL);
  s.rect(18, 22, 1, 8 + a, coatL);
  s.rect(7, 29 - a, 8, 2, skinD); // pies
  s.rect(17, 29 + a, 8, 2, skinD);
  s.px(10, 27 - a, musc);
  s.px(21, 26 + a, musc);
  // torso: hombros descomunales, cintura estrecha
  for (let y = 8; y < 24; y++) {
    const half = 13 - Math.floor((y - 8) / 2.4);
    const x0 = 16 - half + (y < 14 ? sway : 0);
    s.rect(x0, y, half * 2, 1, skin);
    s.px(x0, y, skinL);
    s.px(x0 + 1, y, skinL);
    s.px(x0 + half * 2 - 1, y, skinD);
    if (y % 4 === 0) s.px(x0 + half * 2 - 2, y, skinD);
  }
  // músculo expuesto y restos de abrigo
  s.rect(10, 12, 6, 7, musc);
  s.rect(11, 13, 4, 4, muscL);
  s.rect(12, 14, 2, 1, 27);
  s.rect(17, 13, 5, 8, coat);
  s.rect(17, 13, 5, 1, coatL);
  s.rect(9, 20, 14, 3, coat);
  s.px(18, 19, musc);
  s.px(21, 15, musc);
  // brazo izquierdo: grueso, el puño al frente
  const top = attack ? 3 : hurt ? 14 : 12 + a;
  s.rect(1, top, 6, 12, skin);
  s.rect(1, top, 2, 12, skinL);
  s.rect(0, top + 11, 8, 5, skinD); // puño
  s.rect(0, top + 11, 8, 1, skin);
  s.px(2, top + 14, musc);
  // brazo derecho hipertrofiado con garras de hueso
  const rtop = attack ? 2 : hurt ? 15 : 11 - a;
  s.rect(24, rtop, 8, 13, musc);
  s.rect(24, rtop, 2, 13, muscL);
  s.rect(29, rtop + 2, 3, 9, 18);
  s.rect(23, rtop + 12, 9, 3, skinD);
  for (let i = 0; i < 3; i++) s.line(24 + i * 3, rtop + 14, 24 + i * 3 + (i - 1), rtop + 18 + (attack ? 0 : 1), 27); // garras
  // cabeza minúscula hundida entre los hombros
  const hx = 16 + (hurt ? 2 : 0) + sway;
  const hy = hurt ? 9 : 7;
  s.disc(hx, hy, 3, skin);
  s.rect(hx - 3, hy - 3, 7, 2, 1); // pelo ralo
  s.rect(hx - 2, hy - 1, 2, 1, 31); // ojos amarillos
  s.rect(hx + 1, hy - 1, 2, 1, 31);
  if (attack || hurt) s.rect(hx - 2, hy + 1, 5, 3, 0);
  else s.rect(hx - 1, hy + 1, 3, 1, 0);
  s.px(hx - 1, hy + 1, 27);
  s.px(hx + 1, hy + 1, 27);
  s.px(hx, hy + 3, 20);
  if (hurt) {
    s.rect(11, 17, 3, 3, 21);
    s.rect(21, 11, 3, 2, 21);
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
  out[SpriteId.Smg] = smg();
  for (let p = 0; p < 5; p++) {
    out[SpriteId.WalkerBase + p] = zombie(WALKER, p);
    out[SpriteId.RunnerBase + p] = zombie(RUNNER, p);
    out[SpriteId.BossBase + p] = boss(p);
  }
  return out;
}
