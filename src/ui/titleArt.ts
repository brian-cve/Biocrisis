import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';

const W = SCREEN_W;
const H = SCREEN_H;
const KEY = 'title_bg';

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Niebla: ruido de valor suavizado, repetible en horizontal. */
function fogTile(seed: number): HTMLCanvasElement {
  const [c, ctx] = canvas(W * 2, 80);
  const img = ctx.createImageData(W * 2, 80);
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < W * 2; x++) {
      let v = 0;
      for (let o = 0; o < 3; o++) {
        const s = 8 << o;
        const gx = Math.floor(x / s) % ((W * 2) / s);
        const gy = Math.floor(y / s);
        v += hash(gx, gy, seed + o) / (1 << o);
      }
      v = Math.max(0, v / 1.75 - 0.25) * (1 - Math.abs(y - 40) / 40);
      const i = (y * W * 2 + x) * 4;
      img.data[i] = 120;
      img.data[i + 1] = 145;
      img.data[i + 2] = 130;
      img.data[i + 3] = Math.floor(v * 110);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Dibuja la silueta de la casa, el árbol muerto y la valla sobre un contexto ya con el cielo. */
function drawHouse(ctx: CanvasRenderingContext2D, windowsLit: boolean): void {
  ctx.fillStyle = '#030504';
  // colina
  ctx.beginPath();
  ctx.moveTo(0, 170);
  ctx.quadraticCurveTo(100, 150, 200, 160);
  ctx.quadraticCurveTo(270, 166, W, 150);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  // cuerpo de la casa
  ctx.fillRect(120, 98, 100, 62);
  ctx.fillRect(100, 118, 30, 42); // ala
  // tejado a dos aguas
  ctx.beginPath();
  ctx.moveTo(112, 98);
  ctx.lineTo(170, 62);
  ctx.lineTo(228, 98);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(94, 118);
  ctx.lineTo(115, 100);
  ctx.lineTo(136, 118);
  ctx.fill();
  ctx.fillRect(196, 66, 8, 22); // chimenea
  ctx.fillRect(194, 63, 12, 4);
  // porche
  ctx.fillRect(150, 138, 40, 3);
  ctx.fillRect(152, 138, 2, 22);
  ctx.fillRect(186, 138, 2, 22);
  // árbol muerto
  ctx.strokeStyle = '#030504';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, 168);
  ctx.lineTo(42, 120);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  for (const [x1, y1, x2, y2] of [[42, 128, 22, 108], [42, 120, 60, 98], [32, 114, 18, 96], [52, 108, 66, 92], [42, 112, 40, 90], [22, 108, 10, 104]]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // valla rota
  ctx.fillStyle = '#030504';
  for (let x = 6; x < W; x += 9) {
    if (hash(x, 1, 5) > 0.82) continue;
    const h = 14 - Math.floor(hash(x, 2, 6) * 6);
    ctx.fillRect(x, 168 - h + (x > 100 && x < 230 ? 4 : 0), 3, h + 6);
  }
  ctx.fillRect(0, 160, W, 2);
  // ventanas (iluminadas o apagadas) y puerta entreabierta
  const win = (x: number, y: number, w: number, h: number, lit: boolean) => {
    ctx.fillStyle = lit && windowsLit ? '#806b40' : '#0a0f0c';
    ctx.fillRect(x, y, w, h);
  };
  win(130, 108, 12, 14, false);
  win(198, 108, 12, 14, false);
  win(130, 130, 12, 14, false);
  win(106, 128, 10, 12, false);
  ctx.fillStyle = '#0a0f0c';
  ctx.fillRect(163, 118, 14, 42); // puerta
}

/** Fondo del título: composición dramática dibujada por código y animada (niebla, lluvia, relámpagos, luz que parpadea). */
export class TitleArt {
  private tex: Phaser.Textures.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private lit: HTMLCanvasElement;
  private fogA = fogTile(11);
  private fogB = fogTile(23);
  private vignette: HTMLCanvasElement;
  private drops: { x: number; y: number; v: number }[] = [];
  private t = 0;
  private flash = 0;
  private nextFlash = 3;
  private lightA = 1;
  readonly image: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    if (scene.textures.exists(KEY)) scene.textures.remove(KEY);
    this.tex = scene.textures.createCanvas(KEY, W, H)!;
    this.ctx = this.tex.getContext();
    this.image = scene.add.image(0, 0, KEY).setOrigin(0, 0);

    const sky = (ctx: CanvasRenderingContext2D, bright: number) => {
      const g = ctx.createLinearGradient(0, 0, 0, 160);
      const lerp = (a: number, b: number) => Math.round(a + (b - a) * bright);
      g.addColorStop(0, `rgb(${lerp(4, 70)},${lerp(7, 90)},${lerp(6, 84)})`);
      g.addColorStop(1, `rgb(${lerp(22, 130)},${lerp(34, 150)},${lerp(30, 140)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // luna velada
      ctx.fillStyle = `rgba(150,170,155,${0.25 + 0.4 * bright})`;
      ctx.beginPath();
      ctx.arc(262, 38, 13, 0, Math.PI * 2);
      ctx.fill();
      // nubes
      for (let i = 0; i < 26; i++) {
        const cx = (i * 37) % W;
        const cy = 14 + Math.floor(hash(i, 3, 8) * 70);
        ctx.fillStyle = `rgba(8,12,10,${0.35 - 0.2 * bright})`;
        ctx.fillRect(cx - 20, cy, 40 + (i % 5) * 8, 6);
      }
    };
    [this.base] = canvas(W, H);
    [this.lit] = canvas(W, H);
    const b = this.base.getContext('2d')!;
    sky(b, 0);
    drawHouse(b, true);
    const l = this.lit.getContext('2d')!;
    sky(l, 1);
    drawHouse(l, false);

    [this.vignette] = canvas(W, H);
    const v = this.vignette.getContext('2d')!;
    const rg = v.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 200);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,0.85)');
    v.fillStyle = rg;
    v.fillRect(0, 0, W, H);

    for (let i = 0; i < 90; i++) this.drops.push({ x: Math.random() * W, y: Math.random() * H, v: 140 + Math.random() * 90 });
  }

  update(dt: number): void {
    this.t += dt;
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.base, 0, 0);

    // relámpagos
    this.nextFlash -= dt;
    if (this.nextFlash <= 0) {
      this.flash = 1;
      this.nextFlash = 6 + Math.random() * 7;
      // el trueno llega después (temporizador de la escena: se limpia solo al salir)
      this.scene.time.delayedCall(700 + Math.random() * 1200, () => sfx.thunder());
    }
    if (this.flash > 0) {
      const flicker = this.flash > 0.5 ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(this.t * 40));
      ctx.globalAlpha = Math.min(1, this.flash * flicker);
      ctx.drawImage(this.lit, 0, 0);
      ctx.globalAlpha = 1;
      this.flash = Math.max(0, this.flash - dt * 1.6);
    }

    // niebla en dos capas a distinta velocidad
    ctx.globalAlpha = 0.9;
    ctx.drawImage(this.fogA, -((this.t * 6) % W), 96);
    ctx.drawImage(this.fogA, W - ((this.t * 6) % W), 96);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(this.fogB, -((this.t * 11) % W), 128);
    ctx.drawImage(this.fogB, W - ((this.t * 11) % W), 128);
    ctx.globalAlpha = 1;

    // luz de una ventana que falla
    this.lightA = Math.random() < 0.04 ? 0.15 + Math.random() * 0.4 : Math.min(1, this.lightA + dt * 3);
    ctx.fillStyle = `rgba(150,120,60,${0.8 * this.lightA})`;
    ctx.fillRect(130, 130, 12, 14);
    ctx.fillStyle = `rgba(150,120,60,${0.05 * this.lightA})`;
    ctx.fillRect(124, 124, 24, 26);
    // rendija de luz en la puerta entreabierta
    ctx.fillStyle = `rgba(128,107,64,${0.55 * this.lightA})`;
    ctx.fillRect(170, 120, 2, 40);

    // lluvia
    ctx.fillStyle = 'rgba(122,147,124,0.45)';
    for (const d of this.drops) {
      d.y += d.v * dt;
      d.x -= 18 * dt;
      if (d.y > H) {
        d.y = -6;
        d.x = Math.random() * W + 20;
      }
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 4);
    }

    ctx.drawImage(this.vignette, 0, 0);
    this.tex.refresh();
  }

  destroy(): void {
    this.image.destroy();
    if (this.scene.textures.exists(KEY)) this.scene.textures.remove(KEY);
  }
}
