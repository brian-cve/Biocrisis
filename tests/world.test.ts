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

  it('sin llave la puerta de la arena no cede', () => {
    const w = new World();
    w.player.x = 3.5;
    w.player.y = 18.5;
    w.player.angle = Math.PI / 2;
    w.interact();
    expect(w.message).toBe('Necesitas una llave');
    runFor(w, 2);
    expect(w.map.doorOpen![19 * 20 + 3]).toBe(0);
    expect(w.boss).toBeNull();
  });

  it('con la llave la puerta cede y el jefe despierta en la arena', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Key);
    w.player.x = 3.5;
    w.player.y = 18.5;
    w.player.angle = Math.PI / 2;
    const events: string[] = [];
    w.onEvent = (e) => events.push(e);
    w.interact();
    expect(w.boss).not.toBeNull();
    expect(events).toContain('bossWake');
    expect(w.zombies).toContain(w.boss!);
    expect(w.boss!.y).toBeGreaterThan(20);
    runFor(w, 1);
    expect(w.map.doorOpen![19 * 20 + 3]).toBeGreaterThan(0.5);
    expect(w.won).toBe(false);
  });

  it('abrir la puerta dos veces no crea dos jefes', () => {
    const w = new World();
    w.inventory.add(InvItem.Key);
    w.doors.unlock(3, 19);
    w.doors.use(3, 19);
    w.doors.use(3, 19);
    w.doors.use(3, 19);
    expect(w.zombies.filter((z) => z.def.boss).length).toBe(1);
  });

  it('vencer al jefe desbloquea la salida real, y cruzarla gana', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Key);
    w.doors.unlock(3, 19);
    w.doors.use(3, 19);
    w.player.x = 9.5;
    w.player.y = 33.2;
    w.player.angle = Math.PI / 2;
    w.interact();
    expect(w.message).toBe('La salida está sellada');
    w.boss!.hurt(1e9, 0, 1, 0);
    runFor(w, 0.1);
    expect(w.bossDefeated).toBe(true);
    w.interact();
    runFor(w, 1.5);
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
    b.add(3.5, 15.5, 7, 0.8);
    r.render(cam, map, b);
    expect(px.some((v, i) => v !== base[i])).toBe(true);
  });

  it('un sprite tras una pared no se ve', () => {
    const { r, px, cam } = setup();
    const base = new Uint32Array(px.length);
    r.render(cam, map, new SpriteBatch());
    base.set(px);
    const b = new SpriteBatch();
    cam.dirX = 1;
    cam.planeY = 0.66;
    r.render(cam, map, new SpriteBatch());
    base.set(px);
    b.add(9.5, 15.5, 7, 0.8);
    r.render(cam, map, b);
    expect(px.every((v, i) => v === base[i])).toBe(true);
  });
});
