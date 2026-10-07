import Phaser from 'phaser';

/** Fuente de bloques propia (5×7). '1' = hueso, '2' = sangre (la ranura de la O). Solo las letras del logo. */
const GLYPHS: Record<string, string[]> = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  O: ['01110', '10001', '10201', '10201', '10201', '10001', '01110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
};

const SCALE = 4;
const GAP = 1;

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const LOGO_KEY = 'logo';
export const LOGO_W = 9 * 5 * SCALE + 8 * GAP * SCALE;
export const LOGO_H = 7 * SCALE + 18;

/**
 * Dibuja el logo BioCrisis por código: bloques gastados, una grieta, la "O" con una ranura vertical roja
 * (identidad propia: sin hexágonos, paraguas ni rojo/blanco corporativos) y goteos de sangre oscura.
 */
export function buildLogo(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(LOGO_KEY)) return;
  const tex = textures.createCanvas(LOGO_KEY, LOGO_W + 4, LOGO_H + 4)!;
  const ctx = tex.getContext();
  const word = 'BIOCRISIS';
  const bone = ['#b8a672', '#9c8858', '#c4b890', '#806b40'];
  const draw = (ox: number, oy: number, shadow: boolean) => {
    let x0 = 0;
    for (let li = 0; li < word.length; li++) {
      const g = GLYPHS[word[li]];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          const v = g[r][c];
          if (v === '0') continue;
          const px = x0 + c * SCALE;
          const py = r * SCALE;
          if (shadow) {
            ctx.fillStyle = '#050706';
            ctx.fillRect(ox + px, oy + py, SCALE, SCALE);
            continue;
          }
          // desgaste: huecos en los bordes y celdas descoloridas
          const h = hash(li * 5 + c, r, 7);
          if (h > 0.93) continue;
          ctx.fillStyle = v === '2' ? '#7a2824' : bone[Math.floor(h * 4) % bone.length];
          ctx.fillRect(ox + px, oy + py, SCALE, SCALE);
          // pixeles sueltos dentro del bloque para dar textura
          ctx.fillStyle = 'rgba(5,7,6,0.35)';
          if (hash(px, py, 3) > 0.55) ctx.fillRect(ox + px + 1, oy + py + 2, 1, 1);
          if (hash(px, py, 4) > 0.7) ctx.fillRect(ox + px + 3, oy + py, 1, 2);
        }
      }
      x0 += (5 + GAP) * SCALE;
    }
  };
  draw(3, 3, true);
  draw(0, 0, false);
  // grieta diagonal que atraviesa todo el logo
  ctx.strokeStyle = '#050706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LOGO_W * 0.42, 0);
  ctx.lineTo(LOGO_W * 0.46, 9);
  ctx.lineTo(LOGO_W * 0.43, 15);
  ctx.lineTo(LOGO_W * 0.5, 28);
  ctx.stroke();
  // goteos de sangre desde el borde inferior de las letras
  const cols = [14, 38, 63, 91, 118, 140, 166, 190, 206];
  cols.forEach((cx, i) => {
    const len = 4 + Math.floor(hash(i, 1, 9) * 13);
    ctx.fillStyle = '#5c1c1a';
    ctx.fillRect(cx, 7 * SCALE, 2, len);
    ctx.fillStyle = '#9a3a30';
    ctx.fillRect(cx, 7 * SCALE + len, 2, 2);
    ctx.fillRect(cx - 1, 7 * SCALE + len - 1, 4, 1);
  });
  tex.refresh();
}
