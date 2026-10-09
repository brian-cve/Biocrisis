import { CELL_EXIT, GridMap, cellAt } from '../engine/raycast';

export class Pathfinder {
  private readonly g: Float32Array;
  private readonly f: Float32Array;
  private readonly parent: Int16Array;
  private readonly state: Uint8Array;
  private readonly open: Int16Array;

  constructor(readonly width: number, readonly height: number) {
    const n = width * height;
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.parent = new Int16Array(n);
    this.state = new Uint8Array(n);
    this.open = new Int16Array(n);
  }

  passable(map: GridMap, x: number, y: number): boolean {
    const c = cellAt(map, x, y);
    return c === 0 || (c !== CELL_EXIT && c >= 4);
  }

  find(map: GridMap, sx: number, sy: number, gx: number, gy: number, out: Int16Array): number {
    const w = this.width;
    if (!this.passable(map, gx, gy) || !this.passable(map, sx, sy)) return -1;
    const start = sy * w + sx;
    const goal = gy * w + gx;
    if (start === goal) return 0;
    this.state.fill(0);
    let openCount = 0;
    this.g[start] = 0;
    this.f[start] = Math.abs(gx - sx) + Math.abs(gy - sy);
    this.parent[start] = -1;
    this.state[start] = 1;
    this.open[openCount++] = start;
    while (openCount > 0) {
      let best = 0;
      for (let i = 1; i < openCount; i++) if (this.f[this.open[i]] < this.f[this.open[best]]) best = i;
      const cur = this.open[best];
      this.open[best] = this.open[--openCount];
      if (cur === goal) return this.build(cur, out);
      this.state[cur] = 2;
      const cx = cur % w;
      const cy = (cur - cx) / w;
      for (let d = 0; d < 4; d++) {
        const nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0);
        const ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= this.height || !this.passable(map, nx, ny)) continue;
        const n = ny * w + nx;
        if (this.state[n] === 2) continue;
        const ng = this.g[cur] + 1;
        if (this.state[n] === 1 && ng >= this.g[n]) continue;
        this.g[n] = ng;
        this.f[n] = ng + Math.abs(gx - nx) + Math.abs(gy - ny);
        this.parent[n] = cur;
        if (this.state[n] !== 1) {
          this.state[n] = 1;
          this.open[openCount++] = n;
        }
      }
    }
    return -1;
  }

  private build(goal: number, out: Int16Array): number {
    let len = 0;
    for (let c = goal; this.parent[c] !== -1; c = this.parent[c]) len++;
    if (len > out.length) return -1;
    let i = len - 1;
    for (let c = goal; this.parent[c] !== -1; c = this.parent[c]) out[i--] = c;
    return len;
  }
}
