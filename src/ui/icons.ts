import Phaser from 'phaser';
import { PALETTE_U32 } from '../engine/palette';
import { PISTOL_ICON, SPR_SIZE, SpriteId, TRANSPARENT, buildSpriteTextures } from '../engine/sprites';
import { InvItem } from '../game/inventory';

const ICON_SPRITE: Record<InvItem, number> = {
  [InvItem.Pistol]: PISTOL_ICON,
  [InvItem.Shotgun]: SpriteId.Shotgun,
  [InvItem.Tonic]: SpriteId.Tonic,
  [InvItem.Key]: SpriteId.Key,
};

export function iconKey(item: InvItem): string {
  return `icon_${item}`;
}

/** Convierte los sprites procedurales a texturas de Phaser para los menús (idempotente). */
export function registerIcons(textures: Phaser.Textures.TextureManager): void {
  const sprites = buildSpriteTextures();
  for (const item of [InvItem.Pistol, InvItem.Shotgun, InvItem.Tonic, InvItem.Key]) {
    const key = iconKey(item);
    if (textures.exists(key)) continue;
    const tex = textures.createCanvas(key, SPR_SIZE, SPR_SIZE)!;
    const ctx = tex.getContext();
    const img = ctx.createImageData(SPR_SIZE, SPR_SIZE);
    const px = new Uint32Array(img.data.buffer);
    const src = sprites[ICON_SPRITE[item]];
    for (let x = 0; x < SPR_SIZE; x++) {
      for (let y = 0; y < SPR_SIZE; y++) {
        const c = src[x * SPR_SIZE + y];
        px[y * SPR_SIZE + x] = c === TRANSPARENT ? 0 : PALETTE_U32[c];
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }
}
