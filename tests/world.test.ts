import { describe, expect, it } from 'vitest';
import { World } from '../src/game/world';
import { InvItem } from '../src/game/inventory';
import { ITEM_SPAWNS, ItemKind } from '../src/game/map';
import { SpriteBatch, buildSpriteTextures, SPRITE_COUNT, TRANSPARENT } from '../src/engine/sprites';
import { Renderer } from '../src/engine/renderer';
import { buildFlatTextures, buildWallTextures } from '../src/engine/textures';
import { createHouse } from '../src/game/map';

const idle = { forward: 0, strafe: 0, turn: 0 };

function runFor(w: World, seconds: number, input = idle): void {
  for (let i = 0; i < seconds * 60; i++) w.update(input, 1 / 60);
}

describe('objetos, llave y puerta de salida', () => {
  it('recoger la llave activa hasKey', () => {
    const w = new World();
    const k = ITEM_SPAWNS.find((s) => s.kind === ItemKind.Key)!;
    w.player.x = k.x;
    w.player.y = k.y;
    w.update(idle, 1 / 60);
    expect(w.hasKey).toBe(true);
    expect(w.items.find((i) => i.kind === ItemKind.Key)!.taken).toBe(true);
  });

  it('cada objeto se recoge una sola vez', () => {
    const w = new World();
    const t = ITEM_SPAWNS.find((s) => s.kind === ItemKind.Tonic)!;
    w.player.x = t.x;
    w.player.y = t.y;
    runFor(w, 0.5);
    expect(w.tonics).toBe(1);
  });

  it('sin llave la puerta de salida no cede', () => {
    const w = new World();
    w.player.x = 1.6;
    w.player.y = 15.5;
    w.player.angle = Math.PI;
    w.interact();
    expect(w.message).toBe('Necesitas una llave');
    runFor(w, 2);
    expect(w.map.doorOpen![15 * 20 + 0]).toBe(0);
  });

  it('con la llave se puede salir y ganar', () => {
    const w = new World();
    w.inventory.add(InvItem.Key);
    w.player.x = 1.6;
    w.player.y = 15.5;
    w.player.angle = Math.PI;
    w.interact();
    runFor(w, 1.5); // se abre
    expect(w.won).toBe(false);
    runFor(w, 1.5, { forward: 1, strafe: 0, turn: 0 });
    expect(w.won).toBe(true);
  });
});

describe('sprites', () => {
  it('SpriteBatch ordena de lejos a cerca y reutiliza objetos', () => {
    const b = new SpriteBatch();
    b.add(2, 0, 0, 1);
    b.add(8, 0, 0, 1);
    b.add(5, 0, 0, 1);
    b.sort(0, 0);
    expect(b.items.slice(0, 3).map((s) => s.x)).toEqual([8, 5, 2]);
    const first = b.items[0];
    b.clear();
    b.add(1, 1, 0, 1);
    expect(b.items[0]).toBe(first);
  });

  it('todas las texturas de sprite tienen píxeles opacos y transparentes', () => {
    const t = buildSpriteTextures();
    expect(t.length).toBe(SPRITE_COUNT);
    for (const tex of t) {
      expect(tex.some((v) => v === TRANSPARENT)).toBe(true);
      expect(tex.some((v) => v !== TRANSPARENT)).toBe(true);
    }
  });
});

describe('z-buffer de columna', () => {
  const W = 64, H = 40;
  function setup() {
    const flats = buildFlatTextures();
    const px = new Uint32Array(W * H);
    const r = new Renderer(px, buildWallTextures(), flats.floors, flats.ceiling, buildSpriteTextures(), W, H);
    const cam = { x: 6.5, y: 15.5, dirX: -1, dirY: 0, planeX: 0, planeY: -0.66 };
    return { r, px, cam };
  }
  const map = createHouse();

  it('un sprite delante de la pared se dibuja', () => {
    const { r, px, cam } = setup();
    const base = new Uint32Array(px.length);
    const b0 = new SpriteBatch();
    r.render(cam, map, b0);
    base.set(px);
    const b = new SpriteBatch();
    b.add(3.5, 15.5, 7, 0.8); // barril entre la cámara y la puerta de salida
    r.render(cam, map, b);
    expect(px.some((v, i) => v !== base[i])).toBe(true);
  });

  it('un sprite tras una pared no se ve', () => {
    const { r, px, cam } = setup();
    const base = new Uint32Array(px.length);
    r.render(cam, map, new SpriteBatch());
    base.set(px);
    const b = new SpriteBatch();
    cam.dirX = 1; // mirando al este: la puerta (8,15) cerrada tapa lo de detrás
    cam.planeY = 0.66;
    r.render(cam, map, new SpriteBatch());
    base.set(px);
    b.add(9.5, 15.5, 7, 0.8);
    r.render(cam, map, b);
    expect(px.every((v, i) => v === base[i])).toBe(true);
  });
});
