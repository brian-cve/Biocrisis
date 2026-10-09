export const CLEAR = 255;

export class Bmp {
  readonly d: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.d = new Uint8Array(w * h).fill(CLEAR);
  }
  px(x: number, y: number, c: number): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[x * this.h + y] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.px(x + i, y + j, c);
  }
  disc(cx: number, cy: number, r: number, c: number): void {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) this.px(cx + x, cy + y, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  }
  outline(c: number): this {
    const src = this.d.slice();
    for (let x = 0; x < this.w; x++) {
      for (let y = 0; y < this.h; y++) {
        if (src[x * this.h + y] !== CLEAR) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h && src[nx * this.h + ny] !== CLEAR) {
            this.d[x * this.h + y] = c;
            break;
          }
        }
      }
    }
    return this;
  }
}
