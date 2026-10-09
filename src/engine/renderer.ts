import { BAYER4, LIGHT_LEVELS, PALETTE_SIZE, SHADE } from './palette';
import { Camera, GridMap, RayHit, castHit, isDoorCell, makeRayHit } from './raycast';
import { SPR_SIZE, SpriteBatch, TRANSPARENT } from './sprites';
import { TEX_SIZE, Texture } from './textures';

export const SCREEN_W = 320;
export const SCREEN_H = 200;

const FOG_DIST = 14;
const SIDE_BIAS = 2.2;

export class Renderer {
  readonly w: number;
  readonly h: number;
  readonly zbuf: Float32Array;
  private readonly hit: RayHit = makeRayHit();

  constructor(
    readonly pixels: Uint32Array,
    private readonly textures: Texture[],
    private readonly floorTex: Texture[],
    private readonly ceilTex: Texture,
    private readonly spriteTex: Texture[],
    w = SCREEN_W,
    h = SCREEN_H,
  ) {
    this.w = w;
    this.h = h;
    this.zbuf = new Float32Array(w);
  }

  render(cam: Camera, map: GridMap, sprites?: SpriteBatch): void {
    this.drawFlats(cam, map);
    this.drawWalls(cam, map);
    if (sprites !== undefined) this.drawSprites(cam, sprites);
  }

  private drawSprites(cam: Camera, batch: SpriteBatch): void {
    const { w, h, pixels, zbuf, spriteTex } = this;
    batch.sort(cam.x, cam.y);
    const half = h >> 1;
    const invDet = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY);
    for (let i = 0; i < batch.count; i++) {
      const s = batch.items[i];
      const sx = s.x - cam.x;
      const sy = s.y - cam.y;
      const tx = invDet * (cam.dirY * sx - cam.dirX * sy);
      const depth = invDet * (-cam.planeY * sx + cam.planeX * sy);
      if (depth < 0.2) continue;
      const size = (s.scale * h) / depth;
      const centerX = (w / 2) * (1 + tx / depth);
      const left = centerX - size / 2;
      const bottom = half + half / depth - (s.lift * h) / depth;
      const top = bottom - size;
      const xa = Math.max(0, Math.ceil(left));
      const xb = Math.min(w - 1, Math.floor(left + size));
      const ya = Math.max(0, Math.ceil(top));
      const yb = Math.min(h - 1, Math.floor(bottom));
      const tex = spriteTex[s.tex];
      const lightBase = (depth / FOG_DIST) * (LIGHT_LEVELS - 1) + 0.6;
      const k = SPR_SIZE / size;
      for (let x = xa; x <= xb; x++) {
        if (depth >= zbuf[x]) continue;
        const col = Math.min(SPR_SIZE - 1, ((x - left) * k) | 0) * SPR_SIZE;
        for (let y = ya; y <= yb; y++) {
          const c = tex[col + Math.min(SPR_SIZE - 1, ((y - top) * k) | 0)];
          if (c === TRANSPARENT) continue;
          let level = (lightBase + BAYER4[(x & 3) + ((y & 3) << 2)] * 1.5) | 0;
          if (level >= LIGHT_LEVELS) level = LIGHT_LEVELS - 1;
          pixels[y * w + x] = SHADE[level * PALETTE_SIZE + c];
        }
      }
    }
  }

  private drawFlats(cam: Camera, map: GridMap): void {
    const { w, h, pixels, floorTex, ceilTex } = this;
    const half = h >> 1;
    const lx = cam.dirX - cam.planeX;
    const ly = cam.dirY - cam.planeY;
    const rx = cam.dirX + cam.planeX;
    const ry = cam.dirY + cam.planeY;
    const floors = map.floors;
    for (let y = half + 1; y < h; y++) {
      const rowDist = half / (y - half);
      const stepX = (rowDist * (rx - lx)) / w;
      const stepY = (rowDist * (ry - ly)) / w;
      let fx = cam.x + rowDist * lx;
      let fy = cam.y + rowDist * ly;
      const lightBase = (rowDist / FOG_DIST) * (LIGHT_LEVELS - 1) + 1.2;
      const yc = h - 1 - y;
      const rowF = y * w;
      const rowC = yc * w;
      const by = (y & 3) << 2;
      const byc = (yc & 3) << 2;
      for (let x = 0; x < w; x++) {
        const cx = fx | 0;
        const cy = fy | 0;
        const tx = ((fx * TEX_SIZE) | 0) & (TEX_SIZE - 1);
        const ty = ((fy * TEX_SIZE) | 0) & (TEX_SIZE - 1);
        const ti = tx * TEX_SIZE + ty;
        const ft = floors !== undefined && fx >= 0 && fy >= 0 && cx < map.width && cy < map.height ? floors[cy * map.width + cx] : 0;
        let lf = (lightBase + BAYER4[(x & 3) + by] * 1.5) | 0;
        if (lf >= LIGHT_LEVELS) lf = LIGHT_LEVELS - 1;
        let lc = (lightBase + 0.8 + BAYER4[(x & 3) + byc] * 1.5) | 0;
        if (lc >= LIGHT_LEVELS) lc = LIGHT_LEVELS - 1;
        pixels[rowF + x] = SHADE[lf * PALETTE_SIZE + floorTex[ft][ti]];
        pixels[rowC + x] = SHADE[lc * PALETTE_SIZE + ceilTex[ti]];
        fx += stepX;
        fy += stepY;
      }
    }
    const fog = SHADE[(LIGHT_LEVELS - 1) * PALETTE_SIZE];
    pixels.fill(fog, half * w, half * w + w);
  }

  private drawWalls(cam: Camera, map: GridMap): void {
    const { w, h, pixels, zbuf, hit, textures } = this;
    for (let x = 0; x < w; x++) {
      const camX = (2 * x) / w - 1;
      const rdx = cam.dirX + cam.planeX * camX;
      const rdy = cam.dirY + cam.planeY * camX;
      hit.ox = cam.x;
      hit.oy = cam.y;
      hit.rdx = rdx;
      hit.rdy = rdy;
      castHit(map, hit);
      const dist = hit.dist < 0.0001 ? 0.0001 : hit.dist;
      zbuf[x] = dist;

      const lineH = (h / dist) | 0;
      let y0 = ((h - lineH) >> 1);
      let y1 = y0 + lineH;
      const step = TEX_SIZE / lineH;
      let texPos = 0;
      if (y0 < 0) {
        texPos = -y0 * step;
        y0 = 0;
      }
      if (y1 > h) y1 = h;

      let u = hit.wallX;
      if (isDoorCell(hit.cell) && map.doorOpen !== undefined) u -= map.doorOpen[hit.mapY * map.width + hit.mapX];
      let texX = (u * TEX_SIZE) | 0;
      if (texX < 0) texX = 0;
      if ((hit.side === 0 && rdx > 0) || (hit.side === 1 && rdy < 0)) texX = TEX_SIZE - 1 - texX;
      const outside = hit.mapX < 0 || hit.mapY < 0 || hit.mapX >= map.width || hit.mapY >= map.height;
      if (outside) {
        const night = SHADE[(LIGHT_LEVELS - 1) * PALETTE_SIZE + 1];
        for (let y = y0; y < y1; y++) pixels[y * w + x] = night;
        continue;
      }
      const tex = textures[hit.cell] ?? textures[1];
      const base = texX * TEX_SIZE;
      const lightBase = (dist / FOG_DIST) * (LIGHT_LEVELS - 1) + (hit.side === 1 ? 0 : SIDE_BIAS);

      for (let y = y0; y < y1; y++) {
        const ty = texPos | 0;
        texPos += step;
        let level = (lightBase + BAYER4[(x & 3) + ((y & 3) << 2)] * 1.5) | 0;
        if (level >= LIGHT_LEVELS) level = LIGHT_LEVELS - 1;
        pixels[y * w + x] = SHADE[level * PALETTE_SIZE + tex[base + (ty & (TEX_SIZE - 1))]];
      }
    }
  }
}
