import { Spr, ZPose } from './spriteBase';
import { Texture } from './textures';

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
  shoulder: number;
  headY: number;
}

const WALKER: ZStyle = { skin: 7, skinMid: 6, skinDark: 5, hair: 1, cloth: 11, clothLight: 13, clothDark: 9, pants: 22, pantsLight: 23, shoulder: 7, headY: 7 };
const RUNNER: ZStyle = { skin: 6, skinMid: 5, skinDark: 4, hair: 8, cloth: 28, clothLight: 29, clothDark: 3, pants: 2, pantsLight: 3, shoulder: 6, headY: 8 };

const BLOOD = 20;
const BLOOD_DARK = 18;
const BLOOD_LIGHT = 21;
const BONE = 27;

function zArm(s: Spr, st: ZStyle, side: -1 | 1, shoulderX: number, handTop: number): void {
  const sx = shoulderX;
  const ex = sx + side * 3;
  const ey = 18;
  const hx = sx + side * 1;
  for (let k = 0; k < 2; k++) {
    s.line(sx + side * k, 12, ex + side * k, ey, k ? st.cloth : st.clothLight);
  }
  s.line(ex, ey, hx, handTop + 3, st.skin);
  s.line(ex - side, ey, hx - side, handTop + 3, st.skinMid);
  s.rect(ex - 1, ey - 1, 2, 2, st.clothDark);
  s.rect(hx - 1, handTop + 1, 3, 3, st.skin);
  s.px(hx - 1, handTop, st.skinDark);
  s.px(hx + 1, handTop, st.skinDark);
  s.px(hx, handTop - 1, st.skinMid);
  s.px(hx + side, handTop + 4, BLOOD);
}

function zombie(st: ZStyle, pose: ZPose): Texture {
  const s = new Spr();
  if (pose === ZPose.Dead) {
    s.disc(16, 28, 10, BLOOD_DARK);
    s.disc(12, 29, 6, BLOOD);
    s.rect(8, 22, 18, 7, st.cloth);
    s.rect(8, 22, 18, 2, st.clothLight);
    s.rect(8, 27, 18, 2, st.clothDark);
    s.rect(12, 24, 4, 3, st.skinMid);
    s.rect(13, 25, 2, 2, BLOOD_LIGHT);
    s.disc(5, 25, 4, st.skin);
    s.rect(2, 22, 5, 2, st.hair);
    s.px(4, 25, 1);
    s.px(6, 25, BONE);
    s.rect(4, 27, 3, 1, 1);
    s.rect(26, 24, 5, 4, st.pants);
    s.rect(29, 25, 2, 3, st.skinDark);
    s.line(9, 22, 2, 19, st.skin);
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

  const lx = cx - 5;
  const rx = cx + 1;
  s.rect(lx, 21, 4, 8 - a, st.pants);
  s.rect(rx, 21, 4, 7 + a, st.pants);
  s.rect(lx, 21, 1, 8 - a, st.pantsLight);
  s.rect(rx, 21, 1, 7 + a, st.pantsLight);
  s.rect(lx, 26 - a, 4, 3, st.skinMid);
  s.rect(rx + 1, 25 + a, 3, 3, st.skinMid);
  s.px(lx + 1, 26 - a, BLOOD);
  s.px(rx + 2, 26 + a, BLOOD_DARK);
  s.rect(lx - 1, 29 - a, 6, 2, st.skinDark);
  s.rect(rx - 1, 28 + a, 6, 2, st.skinDark);
  s.px(lx + 4, 30 - a, st.skinMid);

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
  s.rect(cx - sh, 11, sh * 2, 1, st.clothLight);
  for (let i = 0; i < 2 * (sh - 2); i += 2) s.px(cx - sh + 2 + i, 23, i % 4 === 0 ? st.clothDark : st.cloth);
  s.rect(cx - 4, 14, 5, 6, st.skinMid);
  s.rect(cx - 3, 15, 3, 4, BLOOD);
  s.rect(cx - 3, 17, 2, 1, BONE);
  s.px(cx - 2, 15, BLOOD_LIGHT);
  s.rect(cx - 1, 19, 1, 3, BLOOD);
  s.rect(cx + 3, 13, 2, 2, BLOOD_DARK);
  s.rect(cx + 2, 20, 3, 2, BLOOD_DARK);
  s.px(cx + 4, 17, BLOOD);

  const topL = attack ? 3 : 6 + a;
  const topR = attack ? 3 : 7 - a;
  zArm(s, st, -1, cx - sh + 1, hurt ? 13 : topL);
  zArm(s, st, 1, cx + sh - 2, hurt ? 9 : topR);

  const hx = cx + (hurt ? 2 : 0) + lean - 1 + hurtDx * 0;
  const hy = st.headY + (hurt ? 2 : 0);
  s.rect(hx, hy + 3, 3, 4, st.skinDark);
  s.disc(hx + 1, hy, 4, st.skin);
  s.rect(hx - 3, hy, 1, 4, st.skinMid);
  s.rect(hx + 4, hy - 1, 1, 4, st.skinDark);
  s.rect(hx - 2, hy - 4, 7, 2, st.hair);
  s.px(hx - 3, hy - 2, st.hair);
  s.px(hx + 4, hy - 2, st.hair);
  s.px(hx - 1, hy - 5, st.hair);
  s.px(hx + 3, hy - 5, st.hair);
  s.rect(hx - 2, hy - 1, 2, 2, 0);
  s.rect(hx + 2, hy - 1, 2, 2, 0);
  s.px(hx - 1, hy - 1, 26);
  s.px(hx + 3, hy - 1, 26);
  s.px(hx + 1, hy + 1, 1);
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
  s.rect(hx + 3, hy + 1, 2, 2, BLOOD);
  s.px(hx + 3, hy + 3, BLOOD_DARK);
  if (hurt) {
    s.rect(cx - 7, 12, 3, 3, BLOOD_LIGHT);
    s.rect(cx + 4, 16, 3, 2, BLOOD_LIGHT);
    s.px(hx - 3, hy - 3, BLOOD_LIGHT);
  }
  return s.outline(0).d;
}

export function boss(pose: ZPose): Texture {
  const s = new Spr();
  const skin = 6;
  const skinD = 4;
  const skinL = 7;
  const musc = 19;
  const muscL = 20;
  const coat = 22;
  const coatL = 23;
  if (pose === ZPose.Dead) {
    s.disc(16, 28, 13, 18);
    s.disc(11, 29, 8, 19);
    s.rect(3, 19, 26, 10, skin);
    s.rect(3, 19, 26, 2, skinL);
    s.rect(3, 27, 26, 2, skinD);
    s.rect(8, 21, 8, 5, musc);
    s.rect(10, 22, 4, 3, muscL);
    s.rect(18, 20, 8, 7, coat);
    s.disc(5, 22, 3, skin);
    s.px(4, 21, 1);
    s.px(6, 21, 1);
    s.line(26, 22, 31, 18, 27);
    s.line(27, 24, 31, 22, 27);
    s.px(30, 27, 27);
    return s.outline(0).d;
  }
  const a = pose === ZPose.WalkB ? 1 : 0;
  const attack = pose === ZPose.Attack;
  const hurt = pose === ZPose.Hurt;
  const sway = pose === ZPose.WalkB ? 1 : 0;
  s.rect(8, 22, 6, 9 - a, coat);
  s.rect(18, 22, 6, 8 + a, coat);
  s.rect(8, 22, 1, 9 - a, coatL);
  s.rect(18, 22, 1, 8 + a, coatL);
  s.rect(7, 29 - a, 8, 2, skinD);
  s.rect(17, 29 + a, 8, 2, skinD);
  s.px(10, 27 - a, musc);
  s.px(21, 26 + a, musc);
  for (let y = 8; y < 24; y++) {
    const half = 13 - Math.floor((y - 8) / 2.4);
    const x0 = 16 - half + (y < 14 ? sway : 0);
    s.rect(x0, y, half * 2, 1, skin);
    s.px(x0, y, skinL);
    s.px(x0 + 1, y, skinL);
    s.px(x0 + half * 2 - 1, y, skinD);
    if (y % 4 === 0) s.px(x0 + half * 2 - 2, y, skinD);
  }
  s.rect(10, 12, 6, 7, musc);
  s.rect(11, 13, 4, 4, muscL);
  s.rect(12, 14, 2, 1, 27);
  s.rect(17, 13, 5, 8, coat);
  s.rect(17, 13, 5, 1, coatL);
  s.rect(9, 20, 14, 3, coat);
  s.px(18, 19, musc);
  s.px(21, 15, musc);
  const top = attack ? 3 : hurt ? 14 : 12 + a;
  s.rect(1, top, 6, 12, skin);
  s.rect(1, top, 2, 12, skinL);
  s.rect(0, top + 11, 8, 5, skinD);
  s.rect(0, top + 11, 8, 1, skin);
  s.px(2, top + 14, musc);
  const rtop = attack ? 2 : hurt ? 15 : 11 - a;
  s.rect(24, rtop, 8, 13, musc);
  s.rect(24, rtop, 2, 13, muscL);
  s.rect(29, rtop + 2, 3, 9, 18);
  s.rect(23, rtop + 12, 9, 3, skinD);
  for (let i = 0; i < 3; i++) s.line(24 + i * 3, rtop + 14, 24 + i * 3 + (i - 1), rtop + 18 + (attack ? 0 : 1), 27);
  const hx = 16 + (hurt ? 2 : 0) + sway;
  const hy = hurt ? 9 : 7;
  s.disc(hx, hy, 3, skin);
  s.rect(hx - 3, hy - 3, 7, 2, 1);
  s.rect(hx - 2, hy - 1, 2, 1, 31);
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

export const walker = (pose: ZPose): Texture => zombie(WALKER, pose);
export const runner = (pose: ZPose): Texture => zombie(RUNNER, pose);
