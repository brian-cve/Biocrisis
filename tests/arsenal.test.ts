import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS, InvItem, Inventory } from '../src/game/inventory';
import { AmmoPool, PISTOL, SHOTGUN, Weapon, falloff, findTarget, spreadAngles } from '../src/game/weapons';
import { SHOTGUN_START_MAG } from '../src/game/items';
import { MAX_HP, SWITCH_LOCK, TONIC_HEAL, World, HEAL_TIME, START_RESERVE } from '../src/game/world';
import { parseMap, ITEM_SPAWNS, ItemKind } from '../src/game/map';
import { Rng } from '../src/engine/rng';
import { WALKER, Zombie } from '../src/game/zombie';

const idle = { forward: 0, strafe: 0, turn: 0 };
function step(w: World, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 60); i++) w.update(idle, 1 / 60);
}
function armed(): World {
  const w = new World();
  for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
  w.inventory.add(InvItem.Shotgun);
  w.weapons.shotgun.mag = 4;
  w.ammo.shells = 6;
  return w;
}

describe('inventory', () => {
  it('has an explicit capacity of 8 slots', () => {
    expect(INVENTORY_SLOTS).toBe(8);
    expect(new Inventory().capacity).toBe(8);
  });
  it('adds to the first free slot and does not exceed capacity', () => {
    const inv = new Inventory(3);
    expect(inv.add(InvItem.Pistol)).toBe(true);
    expect(inv.add(InvItem.Tonic)).toBe(true);
    expect(inv.add(InvItem.Tonic)).toBe(true);
    expect(inv.full).toBe(true);
    expect(inv.add(InvItem.Tonic)).toBe(false);
    expect(inv.add(InvItem.Key)).toBe(false);
    expect(inv.count(InvItem.Tonic)).toBe(2);
  });
  it('weapons and key are unique; tonics do not stack (one slot each)', () => {
    const inv = new Inventory();
    inv.add(InvItem.Key);
    expect(inv.add(InvItem.Key)).toBe(false);
    inv.add(InvItem.Tonic);
    inv.add(InvItem.Tonic);
    expect(inv.used).toBe(3);
  });
  it('removing frees the slot and the gap is reused', () => {
    const inv = new Inventory(2);
    inv.add(InvItem.Tonic);
    inv.add(InvItem.Key);
    expect(inv.removeOne(InvItem.Tonic)).toBe(true);
    expect(inv.removeOne(InvItem.Tonic)).toBe(false);
    expect(inv.add(InvItem.Pistol)).toBe(true);
    expect(inv.slots[0]).toBe(InvItem.Pistol);
  });
  it('a full inventory prevents pickup and leaves the item on the floor', () => {
    const w = new World();
    while (!w.inventory.full) w.inventory.add(InvItem.Tonic);
    const t = ITEM_SPAWNS.find((s) => s.kind === ItemKind.Key)!;
    w.player.x = t.x;
    w.player.y = t.y;
    step(w, 0.2);
    expect(w.hasKey).toBe(false);
    expect(w.items.find((i) => i.kind === ItemKind.Key)!.taken).toBe(false);
    expect(w.message).toBe('Inventory full');
  });
});

describe('shotgun', () => {
  const m = parseMap(['11111111111111', '10000000000001', '10000000000001', '10000000000001', '11111111111111']);

  it('the spread has N symmetric pellets within the half-angle', () => {
    const a = spreadAngles(SHOTGUN.pellets, SHOTGUN.spread, new Rng(1).next.bind(new Rng(1))) as number[];
    expect(a.length).toBe(7);
    for (const v of a) expect(Math.abs(v)).toBeLessThanOrEqual(SHOTGUN.spread + 1e-9);
    expect(Math.min(...a)).toBeLessThan(-SHOTGUN.spread * 0.5);
    expect(Math.max(...a)).toBeGreaterThan(SHOTGUN.spread * 0.5);
  });
  it('damage falls off with distance and has a minimum', () => {
    expect(falloff(SHOTGUN, 1)).toBe(1);
    expect(falloff(SHOTGUN, 3)).toBeGreaterThan(falloff(SHOTGUN, 5));
    expect(falloff(SHOTGUN, 5)).toBeGreaterThan(falloff(SHOTGUN, 9));
    expect(falloff(SHOTGUN, 50)).toBeCloseTo(0.12, 5);
    expect(falloff(PISTOL, 15)).toBe(1);
  });
  it('up close one shell kills a runner and nearly a shambler; at range it does little', () => {
    const dmgAt = (d: number) => {
      const w = new World();
      for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; }
      w.aimAssist = 0;
      w.inventory.add(InvItem.Shotgun);
      w.weapons.shotgun.mag = 4;
      w.equipped = 'shotgun';
      const z = w.zombies[0];
      w.player.x = 9.5; w.player.y = 2.5; w.player.angle = Math.PI / 2;
      z.x = 9.5; z.y = 2.5 + d; z.hp = 1e6; z.state = 0;
      w.fire();
      return 1e6 - z.hp;
    };
    expect(dmgAt(1.5)).toBeGreaterThan(40);
    expect(dmgAt(2.5)).toBeGreaterThan(30);
    expect(dmgAt(7)).toBeLessThan(dmgAt(2.5) / 3);
  });
  it('a pellet outside the body misses: at range only part of the spread hits', () => {
    const z = new Zombie(WALKER, 9.5, 2.5);
    let hits = 0;
    const offs = spreadAngles(7, SHOTGUN.spread, () => 0.5) as number[];
    for (const o of offs) if (findTarget(m, [z], 1.5, 2.5, o, 12, 0)) hits++;
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(7);
  });
  it('staggers and pushes more than the pistol', () => {
    const a = new Zombie(WALKER, 5, 5), b = new Zombie(WALKER, 5, 5);
    a.hurt(7, PISTOL.stagger, 1, 0, PISTOL.knock);
    b.hurt(7, SHOTGUN.stagger, 1, 0, SHOTGUN.knock);
    expect(b.stagger).toBeGreaterThan(a.stagger);
  });
  it('slow fire rate: cannot fire twice in a row', () => {
    const w = new Weapon(SHOTGUN);
    expect(w.fire()).toBe('fired');
    w.update(0.5, { bullets: 0, shells: 0 });
    expect(w.fire()).toBe('none');
    w.update(0.6, { bullets: 0, shells: 0 });
    expect(w.fire()).toBe('fired');
  });
});

describe('ammo by type and reload', () => {
  it('reserves are independent: the shotgun does not use bullets', () => {
    const pool: AmmoPool = { bullets: 10, shells: 2 };
    const w = new Weapon(SHOTGUN, 0);
    w.startReload(pool);
    for (let i = 0; i < 400; i++) w.update(1 / 60, pool);
    expect(w.mag).toBe(2);
    expect(pool).toEqual({ bullets: 10, shells: 0 });
  });
  it('the shotgun reloads shell by shell and can be interrupted by firing', () => {
    const pool: AmmoPool = { bullets: 0, shells: 5 };
    const w = new Weapon(SHOTGUN, 1);
    w.startReload(pool);
    w.update(0.6, pool);
    expect(w.mag).toBe(2);
    expect(w.reloading).toBe(true);
    expect(w.fire()).toBe('fired');
    expect(w.reloading).toBe(false);
    expect(w.mag).toBe(1);
  });
  it('a full reload fills the shotgun magazine', () => {
    const pool: AmmoPool = { bullets: 0, shells: 6 };
    const w = new Weapon(SHOTGUN, 0);
    w.startReload(pool);
    let done = 0;
    for (let i = 0; i < 60 * 4; i++) if (w.update(1 / 60, pool) === 'reloaded') done++;
    expect(done).toBe(1);
    expect(w.mag).toBe(4);
    expect(pool.shells).toBe(2);
  });
});

describe('weapon switching', () => {
  it('cannot equip the shotgun without owning it', () => {
    const w = new World();
    expect(w.switchTo('shotgun')).toBe(false);
    expect(w.equipped).toBe('pistol');
  });
  it('picking up the shotgun adds it to the inventory with 2 shells loaded', () => {
    const w = new World();
    const s = ITEM_SPAWNS.find((i) => i.kind === ItemKind.Shotgun)!;
    w.player.x = s.x; w.player.y = s.y;
    step(w, 0.1);
    expect(w.hasShotgun).toBe(true);
    expect(w.weapons.shotgun.mag).toBe(SHOTGUN_START_MAG);
    expect(w.equipped).toBe('pistol');
  });
  it('switching during a reload interrupts it and does not use reserve', () => {
    const w = armed();
    w.weapon.mag = 2;
    w.reload();
    expect(w.weapon.reloading).toBe(true);
    step(w, 0.3);
    expect(w.switchTo('shotgun')).toBe(true);
    expect(w.weapons.pistol.reloading).toBe(false);
    expect(w.weapons.pistol.mag).toBe(2);
    expect(w.ammo.bullets).toBe(START_RESERVE);
    step(w, 3);
    expect(w.weapons.pistol.mag).toBe(2);
  });
  it('after switching there is a short lock before firing', () => {
    const w = armed();
    w.switchTo('shotgun');
    w.fire();
    expect(w.stats.shots).toBe(0);
    step(w, SWITCH_LOCK + 0.05);
    w.fire();
    expect(w.stats.shots).toBe(1);
  });
  it('cycleWeapon alternates between owned weapons', () => {
    const w = armed();
    w.cycleWeapon();
    expect(w.equipped).toBe('shotgun');
    step(w, 0.5);
    w.cycleWeapon();
    expect(w.equipped).toBe('pistol');
  });
});

describe('medicine', () => {
  function hurt(): World {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Tonic);
    w.inventory.add(InvItem.Tonic);
    w.hurtPlayer(50);
    return w;
  }
  it('heals a fixed amount and consumes a tonic', () => {
    const w = hurt();
    expect(w.useTonic(true)).toBe('healed');
    expect(w.hp).toBe(50 + TONIC_HEAL);
    expect(w.tonics).toBe(1);
  });
  it('never exceeds max health', () => {
    const w = hurt();
    w.hurtPlayer(-0);
    w.hp = MAX_HP - 10;
    w.useTonic(true);
    expect(w.hp).toBe(MAX_HP);
  });
  it('is not consumed at full health', () => {
    const w = new World();
    w.inventory.add(InvItem.Tonic);
    expect(w.useTonic()).toBe('full');
    expect(w.useTonic(true)).toBe('full');
    expect(w.tonics).toBe(1);
    expect(w.hp).toBe(MAX_HP);
  });
  it('does nothing without tonics', () => {
    const w = new World();
    w.hurtPlayer(10);
    expect(w.useTonic()).toBe('none');
    expect(w.hp).toBe(90);
  });
  it('in game it lasts HEAL_TIME; the player moves but cannot fire and stays vulnerable', () => {
    const w = hurt();
    expect(w.useTonic()).toBe('started');
    expect(w.useTonic()).toBe('busy');
    const x0 = w.player.x;
    w.update({ forward: 1, strafe: 0, turn: 0 }, 0.1);
    expect(w.player.x).not.toBe(x0);
    w.fire();
    expect(w.stats.shots).toBe(0);
    w.hurtPlayer(10);
    expect(w.hp).toBe(40);
    expect(w.tonics).toBe(2);
    step(w, HEAL_TIME);
    expect(w.tonics).toBe(1);
    expect(w.hp).toBe(40 + TONIC_HEAL);
  });
  it('status labels: Good / Caution / Danger', () => {
    const w = new World();
    expect(w.healthLabel).toBe('Good');
    w.hp = 50;
    expect(w.healthLabel).toBe('Caution');
    w.hp = 20;
    expect(w.healthLabel).toBe('Danger');
  });
});
