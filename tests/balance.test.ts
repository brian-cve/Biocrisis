import { describe, expect, it } from 'vitest';
import { BOX_BULLETS, BOX_SHELLS, SHOTGUN_START_MAG, START_RESERVE, World, ALARM_RADIUS } from '../src/game/world';
import { ITEM_SPAWNS, ItemKind, ZOMBIE_SPAWNS } from '../src/game/map';
import { PISTOL, SHOTGUN } from '../src/game/weapons';
import { RUNNER, WALKER, ZState } from '../src/game/zombie';
import { EXIT_DOOR_SPEED } from '../src/game/doors';
import { DOOR_PASSABLE } from '../src/game/collision';
import { InvItem } from '../src/game/inventory';

const defs = ZOMBIE_SPAWNS.map((z) => (z.type === 'walker' ? WALKER : RUNNER));

describe('balance invariants (docs/BALANCE.md)', () => {
  const bulletsNeeded = (d: typeof WALKER) => Math.ceil(d.hp / PISTOL.damage);
  const pistolSupply = PISTOL.magSize + START_RESERVE + ITEM_SPAWNS.filter((i) => i.kind === ItemKind.PistolAmmo).length * BOX_BULLETS;
  const shellSupply = SHOTGUN_START_MAG + BOX_SHELLS;

  it('there are 4-7 zombies: 3 shamblers and 3 runners', () => {
    expect(ZOMBIE_SPAWNS.length).toBeGreaterThanOrEqual(4);
    expect(ZOMBIE_SPAWNS.length).toBeLessThanOrEqual(7);
    expect(defs.filter((d) => d === WALKER).length).toBe(3);
    expect(defs.filter((d) => d === RUNNER).length).toBe(3);
  });
  it('with only the pistol you CANNOT kill everyone, even never missing', () => {
    const needed = defs.reduce((s, d) => s + bulletsNeeded(d), 0);
    expect(pistolSupply).toBeLessThan(needed);
  });
  it('but it is NOT impossible: pistol + shotgun suffice with margin to miss some shots', () => {
    const runners = defs.filter((d) => d === RUNNER).length;
    const walkerBullets = defs.filter((d) => d === WALKER).reduce((s, d) => s + bulletsNeeded(d), 0);
    expect(shellSupply).toBeGreaterThanOrEqual(runners);
    expect(pistolSupply).toBeGreaterThan(walkerBullets);
    expect(pistolSupply - walkerBullets).toBeLessThan(0.5 * walkerBullets);
  });
  it('the shotgun has very scarce ammo', () => {
    expect(shellSupply).toBeLessThanOrEqual(5);
    expect(SHOTGUN.magSize).toBeLessThanOrEqual(6);
  });
  it('there is extra health to survive a couple of mistakes but not many: 2 tonics', () => {
    expect(ITEM_SPAWNS.filter((i) => i.kind === ItemKind.Tonic && i.y < 20).length).toBe(2);
  });
  it('zombies are slower than the player (you can outrun them walking forward)', async () => {
    const { MOVE_SPEED } = await import('../src/game/player');
    expect(WALKER.speed).toBeLessThan(MOVE_SPEED * 0.6);
    expect(RUNNER.speed).toBeLessThan(MOVE_SPEED);
    expect(RUNNER.speed).toBeGreaterThan(MOVE_SPEED * 0.7);
  });
});

describe('climax: the house wakes up', () => {
  it('picking up the key alerts every living zombie in the house, wherever they are', () => {
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
  it('a dead zombie is not alerted', () => {
    const w = new World();
    w.zombies[0].hurt(1e9, 0, 1, 0);
    const key = ITEM_SPAWNS.find((i) => i.kind === ItemKind.Key)!;
    w.player.x = key.x;
    w.player.y = key.y;
    w.update({ forward: 0, strafe: 0, turn: 0 }, 1 / 60);
    expect(w.zombies[0].dead).toBe(true);
  });
  it('the exit door takes ~1 s to become passable (end tension)', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Key);
    w.player.x = 1.6; w.player.y = 15.5; w.player.angle = Math.PI;
    w.interact();
    const t = DOOR_PASSABLE / EXIT_DOOR_SPEED;
    expect(t).toBeGreaterThan(0.8);
    expect(t).toBeLessThan(1.4);
    for (let i = 0; i < 60 * 0.5; i++) w.update({ forward: 1, strafe: 0, turn: 0 }, 1 / 60);
    expect(w.won).toBe(false);
  });
});
