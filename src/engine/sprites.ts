import { barrel, key, lamp, pistolAmmo, pistolIcon, plant, shells, shotgun, smg, tonic } from './itemArt';
import { PISTOL_ICON, SPRITE_COUNT, SpriteId } from './spriteBase';
import { Texture } from './textures';
import { boss, runner, walker } from './zombieArt';

interface Sprite {
  x: number;
  y: number;
  tex: number;
  scale: number;
  lift: number;
  dist2: number;
}

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
    out[SpriteId.WalkerBase + p] = walker(p);
    out[SpriteId.RunnerBase + p] = runner(p);
    out[SpriteId.BossBase + p] = boss(p);
  }
  return out;
}

