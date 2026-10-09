import { describe, expect, it } from 'vitest';
import { INVENTORY_SLOTS, InvItem, Inventory } from '../src/game/inventory';
import { AmmoPool, PISTOL, SHOTGUN, Weapon, falloff, findTarget, spreadAngles } from '../src/game/weapons';
import { MAX_HP, SWITCH_LOCK, TONIC_HEAL, World, HEAL_TIME, SHOTGUN_START_MAG, START_RESERVE } from '../src/game/world';
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

describe('inventario', () => {
  it('tiene capacidad explícita de 8 ranuras', () => {
    expect(INVENTORY_SLOTS).toBe(8);
    expect(new Inventory().capacity).toBe(8);
  });
  it('añade en la primera ranura libre y no excede la capacidad', () => {
    const inv = new Inventory(3);
    expect(inv.add(InvItem.Pistol)).toBe(true);
    expect(inv.add(InvItem.Tonic)).toBe(true);
    expect(inv.add(InvItem.Tonic)).toBe(true);
    expect(inv.full).toBe(true);
    expect(inv.add(InvItem.Tonic)).toBe(false);
    expect(inv.add(InvItem.Key)).toBe(false);
    expect(inv.count(InvItem.Tonic)).toBe(2);
  });
  it('armas y llave son únicas; los tónicos no se apilan (una ranura cada uno)', () => {
    const inv = new Inventory();
    inv.add(InvItem.Key);
    expect(inv.add(InvItem.Key)).toBe(false);
    inv.add(InvItem.Tonic);
    inv.add(InvItem.Tonic);
    expect(inv.used).toBe(3);
  });
  it('quitar libera la ranura y reutiliza el hueco', () => {
    const inv = new Inventory(2);
    inv.add(InvItem.Tonic);
    inv.add(InvItem.Key);
    expect(inv.removeOne(InvItem.Tonic)).toBe(true);
    expect(inv.removeOne(InvItem.Tonic)).toBe(false);
    expect(inv.add(InvItem.Pistol)).toBe(true);
    expect(inv.slots[0]).toBe(InvItem.Pistol);
  });
  it('el inventario lleno impide recoger y deja el objeto en el suelo', () => {
    const w = new World();
    while (!w.inventory.full) w.inventory.add(InvItem.Tonic);
    const t = ITEM_SPAWNS.find((s) => s.kind === ItemKind.Key)!;
    w.player.x = t.x;
    w.player.y = t.y;
    step(w, 0.2);
    expect(w.hasKey).toBe(false);
    expect(w.items.find((i) => i.kind === ItemKind.Key)!.taken).toBe(false);
    expect(w.message).toBe('Inventario lleno');
  });
});

describe('escopeta', () => {
  const m = parseMap(['11111111111111', '10000000000001', '10000000000001', '10000000000001', '11111111111111']);

  it('el abanico tiene N perdigones simétricos dentro del semiángulo', () => {
    const a = spreadAngles(SHOTGUN.pellets, SHOTGUN.spread, new Rng(1).next.bind(new Rng(1))) as number[];
    expect(a.length).toBe(7);
    for (const v of a) expect(Math.abs(v)).toBeLessThanOrEqual(SHOTGUN.spread + 1e-9);
    expect(Math.min(...a)).toBeLessThan(-SHOTGUN.spread * 0.5);
    expect(Math.max(...a)).toBeGreaterThan(SHOTGUN.spread * 0.5);
  });
  it('el daño decrece con la distancia y tiene un mínimo', () => {
    expect(falloff(SHOTGUN, 1)).toBe(1);
    expect(falloff(SHOTGUN, 3)).toBeGreaterThan(falloff(SHOTGUN, 5));
    expect(falloff(SHOTGUN, 5)).toBeGreaterThan(falloff(SHOTGUN, 9));
    expect(falloff(SHOTGUN, 50)).toBeCloseTo(0.12, 5);
    expect(falloff(PISTOL, 15)).toBe(1);
  });
  it('de cerca mata a un corredor de un cartucho y casi a un rezagado; de lejos hace poco', () => {
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
  it('un perdigón fuera del cuerpo falla: a distancia solo acierta parte del abanico', () => {
    const z = new Zombie(WALKER, 9.5, 2.5);
    let hits = 0;
    const offs = spreadAngles(7, SHOTGUN.spread, () => 0.5) as number[];
    for (const o of offs) if (findTarget(m, [z], 1.5, 2.5, o, 12, 0)) hits++;
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(7);
  });
  it('aturde y empuja más que la pistola', () => {
    const a = new Zombie(WALKER, 5, 5), b = new Zombie(WALKER, 5, 5);
    a.hurt(7, PISTOL.stagger, 1, 0, PISTOL.knock);
    b.hurt(7, SHOTGUN.stagger, 1, 0, SHOTGUN.knock);
    expect(b.stagger).toBeGreaterThan(a.stagger);
  });
  it('cadencia lenta: no dispara dos veces seguidas', () => {
    const w = new Weapon(SHOTGUN);
    expect(w.fire()).toBe('fired');
    w.update(0.5, { bullets: 0, shells: 0 });
    expect(w.fire()).toBe('none');
    w.update(0.6, { bullets: 0, shells: 0 });
    expect(w.fire()).toBe('fired');
  });
});

describe('munición por tipo y recarga', () => {
  it('las reservas son independientes: la escopeta no gasta balas', () => {
    const pool: AmmoPool = { bullets: 10, shells: 2 };
    const w = new Weapon(SHOTGUN, 0);
    w.startReload(pool);
    for (let i = 0; i < 400; i++) w.update(1 / 60, pool);
    expect(w.mag).toBe(2);
    expect(pool).toEqual({ bullets: 10, shells: 0 });
  });
  it('la escopeta recarga cartucho a cartucho y se puede interrumpir disparando', () => {
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
  it('recarga completa la escopeta hasta el cargador', () => {
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

describe('cambio de arma', () => {
  it('sin escopeta no se puede equipar', () => {
    const w = new World();
    expect(w.switchTo('shotgun')).toBe(false);
    expect(w.equipped).toBe('pistol');
  });
  it('recoger la escopeta la añade al inventario con 2 cartuchos cargados', () => {
    const w = new World();
    const s = ITEM_SPAWNS.find((i) => i.kind === ItemKind.Shotgun)!;
    w.player.x = s.x; w.player.y = s.y;
    step(w, 0.1);
    expect(w.hasShotgun).toBe(true);
    expect(w.weapons.shotgun.mag).toBe(SHOTGUN_START_MAG);
    expect(w.equipped).toBe('pistol');
  });
  it('cambiar durante la recarga la interrumpe y no gasta reserva', () => {
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
  it('tras cambiar hay un bloqueo breve antes de disparar', () => {
    const w = armed();
    w.switchTo('shotgun');
    w.fire();
    expect(w.stats.shots).toBe(0);
    step(w, SWITCH_LOCK + 0.05);
    w.fire();
    expect(w.stats.shots).toBe(1);
  });
  it('cycleWeapon alterna entre las armas poseídas', () => {
    const w = armed();
    w.cycleWeapon();
    expect(w.equipped).toBe('shotgun');
    step(w, 0.5);
    w.cycleWeapon();
    expect(w.equipped).toBe('pistol');
  });
});

describe('medicina', () => {
  function hurt(): World {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    w.inventory.add(InvItem.Tonic);
    w.inventory.add(InvItem.Tonic);
    w.hurtPlayer(50);
    return w;
  }
  it('cura una cantidad fija y consume un tónico', () => {
    const w = hurt();
    expect(w.useTonic(true)).toBe('healed');
    expect(w.hp).toBe(50 + TONIC_HEAL);
    expect(w.tonics).toBe(1);
  });
  it('nunca supera la vida máxima', () => {
    const w = hurt();
    w.hurtPlayer(-0);
    w.hp = MAX_HP - 10;
    w.useTonic(true);
    expect(w.hp).toBe(MAX_HP);
  });
  it('con la vida llena no se consume', () => {
    const w = new World();
    w.inventory.add(InvItem.Tonic);
    expect(w.useTonic()).toBe('full');
    expect(w.useTonic(true)).toBe('full');
    expect(w.tonics).toBe(1);
    expect(w.hp).toBe(MAX_HP);
  });
  it('sin tónicos no hace nada', () => {
    const w = new World();
    w.hurtPlayer(10);
    expect(w.useTonic()).toBe('none');
    expect(w.hp).toBe(90);
  });
  it('en juego dura HEAL_TIME, el jugador se mueve pero no dispara y sigue vulnerable', () => {
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
  it('etiquetas de estado: Bien / Precaución / Peligro', () => {
    const w = new World();
    expect(w.healthLabel).toBe('Bien');
    w.hp = 50;
    expect(w.healthLabel).toBe('Precaución');
    w.hp = 20;
    expect(w.healthLabel).toBe('Peligro');
  });
});
