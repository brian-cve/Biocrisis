import { describe, expect, it } from 'vitest';
import { BOX_BULLETS, BOX_SHELLS, SHOTGUN_START_MAG, START_RESERVE, World, ALARM_RADIUS } from '../src/game/world';
import { ITEM_SPAWNS, ItemKind, ZOMBIE_SPAWNS } from '../src/game/map';
import { PISTOL, SHOTGUN } from '../src/game/weapons';
import { RUNNER, WALKER, ZState } from '../src/game/zombie';
import { EXIT_DOOR_SPEED } from '../src/game/doors';
import { DOOR_PASSABLE } from '../src/game/collision';
import { InvItem } from '../src/game/inventory';

const defs = ZOMBIE_SPAWNS.map((z) => (z.type === 'walker' ? WALKER : RUNNER));

describe('invariantes de balance (docs/BALANCE.md)', () => {
  const bulletsNeeded = (d: typeof WALKER) => Math.ceil(d.hp / PISTOL.damage);
  const pistolSupply = PISTOL.magSize + START_RESERVE + ITEM_SPAWNS.filter((i) => i.kind === ItemKind.PistolAmmo).length * BOX_BULLETS;
  const shellSupply = SHOTGUN_START_MAG + BOX_SHELLS;

  it('hay 4–7 zombis: 3 rezagados y 3 corredores', () => {
    expect(ZOMBIE_SPAWNS.length).toBeGreaterThanOrEqual(4);
    expect(ZOMBIE_SPAWNS.length).toBeLessThanOrEqual(7);
    expect(defs.filter((d) => d === WALKER).length).toBe(3);
    expect(defs.filter((d) => d === RUNNER).length).toBe(3);
  });
  it('con solo la pistola NO se puede matar a todos ni acertando siempre', () => {
    const needed = defs.reduce((s, d) => s + bulletsNeeded(d), 0);
    expect(pistolSupply).toBeLessThan(needed);
  });
  it('pero NO es imposible: pistola + escopeta bastan con margen para fallar algún tiro', () => {
    // un cartucho de escopeta a bocajarro mata a un corredor; los rezagados van a pistola
    const runners = defs.filter((d) => d === RUNNER).length;
    const walkerBullets = defs.filter((d) => d === WALKER).reduce((s, d) => s + bulletsNeeded(d), 0);
    expect(shellSupply).toBeGreaterThanOrEqual(runners);
    expect(pistolSupply).toBeGreaterThan(walkerBullets);
    expect(pistolSupply - walkerBullets).toBeLessThan(0.5 * walkerBullets); // margen real, pero no holgado
  });
  it('la escopeta tiene munición muy escasa', () => {
    expect(shellSupply).toBeLessThanOrEqual(5);
    expect(SHOTGUN.magSize).toBeLessThanOrEqual(6);
  });
  it('hay vida extra para sobrevivir a un par de errores pero no a muchos: 2 tónicos', () => {
    expect(ITEM_SPAWNS.filter((i) => i.kind === ItemKind.Tonic).length).toBe(2);
  });
  it('los zombis son más lentos que el jugador (se puede huir de ellos andando de frente)', async () => {
    const { MOVE_SPEED } = await import('../src/game/player');
    expect(WALKER.speed).toBeLessThan(MOVE_SPEED * 0.6);
    expect(RUNNER.speed).toBeLessThan(MOVE_SPEED);
    expect(RUNNER.speed).toBeGreaterThan(MOVE_SPEED * 0.7); // pero ir marcha atrás o parar sí te alcanza
  });
});

describe('clímax: la casa despierta', () => {
  it('coger la llave alerta a todos los zombis vivos de la casa, estén donde estén', () => {
    const w = new World();
    const events: string[] = [];
    w.onEvent = (e) => events.push(e);
    const key = ITEM_SPAWNS.find((i) => i.kind === ItemKind.Key)!;
    expect(w.zombies.every((z) => z.state === ZState.Idle)).toBe(true);
    w.player.x = key.x;
    w.player.y = key.y;
    w.update({ forward: 0, strafe: 0, turn: 0 }, 1 / 60);
    expect(w.alarm).toBe(true);
    expect(events).toContain('alarm');
    expect(w.zombies.every((z) => z.state !== ZState.Idle)).toBe(true);
    const farthest = Math.max(...w.zombies.map((z) => Math.hypot(z.x - key.x, z.y - key.y)));
    expect(ALARM_RADIUS).toBeGreaterThan(farthest);
  });
  it('un zombi muerto no se alerta', () => {
    const w = new World();
    w.zombies[0].hurt(1e9, 0, 1, 0);
    const key = ITEM_SPAWNS.find((i) => i.kind === ItemKind.Key)!;
    w.player.x = key.x;
    w.player.y = key.y;
    w.update({ forward: 0, strafe: 0, turn: 0 }, 1 / 60);
    expect(w.zombies[0].dead).toBe(true);
  });
  it('la puerta de salida tarda ~1 s en ser transitable (tensión del final)', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Key);
    w.player.x = 1.6; w.player.y = 15.5; w.player.angle = Math.PI;
    w.interact();
    const t = DOOR_PASSABLE / EXIT_DOOR_SPEED;
    expect(t).toBeGreaterThan(0.8);
    expect(t).toBeLessThan(1.4);
    for (let i = 0; i < 60 * 0.5; i++) w.update({ forward: 1, strafe: 0, turn: 0 }, 1 / 60);
    expect(w.won).toBe(false); // a medio segundo todavía no se puede pasar
  });
});
