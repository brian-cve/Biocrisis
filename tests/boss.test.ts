import { describe, expect, it } from 'vitest';
import { InvItem } from '../src/game/inventory';
import { ITEM_SPAWNS, ItemKind } from '../src/game/map';
import { SMG } from '../src/game/weapons';
import { MAX_HP, CRATE_BULLETS, World } from '../src/game/world';
import { BOSS, ZState, Zombie } from '../src/game/zombie';

const idle = { forward: 0, strafe: 0, turn: 0 };

describe('arena del jefe', () => {
  it('hay metralleta y munición de sobra en la arena para matar al jefe', () => {
    const arena = ITEM_SPAWNS.filter((i) => i.y >= 20);
    expect(arena.some((i) => i.kind === ItemKind.Smg)).toBe(true);
    const bullets = arena.filter((i) => i.kind === ItemKind.BulletCrate).length * CRATE_BULLETS + SMG.magSize;
    const needed = BOSS.hp / SMG.damage;
    expect(bullets).toBeGreaterThan(needed * 2); // margen para errar la mitad
  });

  it('el jefe casi no se aturde ni se empuja con disparos', () => {
    const b = new Zombie(BOSS, 5, 5);
    b.hurt(9, SMG.stagger, 1, 0, SMG.knock);
    expect(b.stagger).toBeLessThan(0.02);
    expect(b.state).toBe(ZState.Chase);
  });

  it('se puede huir del jefe andando, incluso enfurecido', async () => {
    const { MOVE_SPEED } = await import('../src/game/player');
    expect(BOSS.speed).toBeLessThan(MOVE_SPEED * 0.7);
    expect(BOSS.speed * 1.45).toBeLessThan(MOVE_SPEED);
  });

  it('se enfurece por debajo de la mitad de vida', () => {
    const b = new Zombie(BOSS, 5, 5);
    expect(b.enraged).toBe(false);
    b.hurt(BOSS.hp * 0.55, 0, 1, 0);
    expect(b.enraged).toBe(true);
  });

  it('coger la metralleta la equipa con cargador lleno y la pone en el ciclo de armas', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    const s = ITEM_SPAWNS.find((i) => i.kind === ItemKind.Smg)!;
    w.player.x = s.x;
    w.player.y = s.y;
    w.update(idle, 1 / 60);
    expect(w.inventory.has(InvItem.Smg)).toBe(true);
    expect(w.weapons.smg.mag).toBe(SMG.magSize);
    expect(w.switchTo('smg')).toBe(true);
    w.switchLock = 0;
    expect(w.cycleWeapon()).toBe(true);
    expect(w.equipped).toBe('pistol');
  });

  it('las cajas de la arena dan mucha más munición que las de la casa', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    const before = w.ammo.bullets;
    const c = ITEM_SPAWNS.find((i) => i.kind === ItemKind.BulletCrate)!;
    w.player.x = c.x;
    w.player.y = c.y;
    w.update(idle, 1 / 60);
    expect(w.ammo.bullets).toBe(before + CRATE_BULLETS);
  });

  it('la metralleta, mantenida, derrota a un jefe inmóvil en pocos segundos', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Smg);
    w.weapons.smg.mag = SMG.magSize;
    w.ammo.bullets = 400;
    w.equipped = 'smg';
    w.aimAssist = 0.035;
    const b = new Zombie({ ...BOSS, speed: 0 }, 9.5, 28.5); // inmóvil: mide solo el daño por segundo
    w.zombies.push(b);
    w.boss = b;
    w.player.x = 9.5;
    w.player.y = 24.5;
    w.player.angle = Math.PI / 2;
    let t = 0;
    while (!b.dead && t < 40 && !w.dead) {
      w.fire(); // equivale a mantener el disparo
      w.update(idle, 1 / 60);
      t += 1 / 60;
    }
    expect(b.dead).toBe(true);
    expect(t).toBeGreaterThan(5); // no es trivial
    expect(w.bossDefeated).toBe(true);
    expect(MAX_HP).toBe(100);
  });
});
