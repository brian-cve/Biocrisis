import { describe, expect, it } from 'vitest';
import { parseMap, createHouse } from '../src/game/map';
import { hasLineOfSight } from '../src/game/los';
import { Pathfinder } from '../src/game/pathfinding';
import { AmmoPool, PISTOL, Weapon, findTarget } from '../src/game/weapons';
import { RUNNER, WALKER, ZContext, ZState, Zombie } from '../src/game/zombie';
import { Doors } from '../src/game/doors';
import { World } from '../src/game/world';

const idle = { forward: 0, strafe: 0, turn: 0 };

describe('línea de visión', () => {
  const m = parseMap(['11111', '10001', '10101', '10001', '11111']);
  it('ve en espacio abierto', () => expect(hasLineOfSight(m, 1.5, 1.5, 3.5, 1.5)).toBe(true));
  it('una pared bloquea', () => expect(hasLineOfSight(m, 1.5, 2.5, 3.5, 2.5)).toBe(false));
  it('una puerta cerrada bloquea y abierta no', () => {
    const h = createHouse();
    const d = new Doors(h);
    expect(hasLineOfSight(h, 6.5, 15.5, 9.5, 15.5)).toBe(false);
    d.use(8, 15);
    for (let i = 0; i < 90; i++) d.update(1 / 60);
    expect(hasLineOfSight(h, 6.5, 15.5, 9.5, 15.5)).toBe(true);
  });
});

describe('A*', () => {
  const m = parseMap(['1111111', '1000001', '1011101', '1000001', '1111111']);
  const pf = new Pathfinder(m.width, m.height);
  const out = new Int16Array(64);
  it('rodea obstáculos', () => {
    const n = pf.find(m, 1, 2, 5, 2, out);
    expect(n).toBeGreaterThan(4);
    expect(out[n - 1]).toBe(2 * 7 + 5);
    for (let i = 0; i < n; i++) expect(m.cells[out[i]]).toBe(0);
  });
  it('devuelve -1 si el destino es una pared', () => expect(pf.find(m, 1, 1, 0, 0, out)).toBe(-1));
  it('atraviesa puertas pero no la de salida', () => {
    const h = createHouse();
    const p = new Pathfinder(20, 20);
    const o = new Int16Array(200);
    expect(p.find(h, 6, 15, 12, 15, o)).toBeGreaterThan(0);
    expect(p.find(h, 6, 15, 0, 15, o)).toBe(-1);
  });
});

describe('arma: cargador, recarga y reserva', () => {
  const pool = (b: number): AmmoPool => ({ bullets: b, shells: 0 });
  it('dispara y descuenta cargador; respeta la cadencia', () => {
    const w = new Weapon(PISTOL);
    expect(w.fire()).toBe('fired');
    expect(w.mag).toBe(11);
    expect(w.fire()).toBe('none');
    w.update(0.4, pool(0));
    expect(w.fire()).toBe('fired');
  });
  it('sin balas en el cargador hace "dry"', () => {
    const w = new Weapon(PISTOL, 0);
    expect(w.fire()).toBe('dry');
  });
  it('recargar transfiere de la reserva y no excede el cargador', () => {
    const w = new Weapon(PISTOL, 4);
    const p = pool(20);
    expect(w.startReload(p)).toBe('reloadStart');
    expect(w.update(0.5, p)).toBe('none');
    expect(w.update(PISTOL.reloadTime, p)).toBe('reloaded');
    expect(w.mag).toBe(12);
    expect(p.bullets).toBe(12);
  });
  it('con reserva insuficiente carga lo que hay; sin reserva no recarga', () => {
    const w = new Weapon(PISTOL, 0);
    const p = pool(5);
    w.startReload(p);
    w.update(2, p);
    expect(w.mag).toBe(5);
    expect(p.bullets).toBe(0);
    expect(new Weapon(PISTOL, 3).startReload(pool(0))).toBe('none');
  });
  it('no se dispara mientras se recarga y cancelar no consume reserva', () => {
    const w = new Weapon(PISTOL, 3);
    const p = pool(10);
    w.startReload(p);
    expect(w.fire()).toBe('none');
    w.cancelReload();
    expect(p.bullets).toBe(10);
    expect(w.mag).toBe(3);
  });
});

describe('hitscan', () => {
  const m = parseMap(['1111111111', '1000000001', '1000000001', '1111111111']);
  const z = (x: number, y: number) => new Zombie(WALKER, x, y);
  it('acierta al zombi en la línea de tiro y elige el más cercano', () => {
    const a = z(4.5, 1.5), b = z(7.5, 1.5);
    const h = findTarget(m, [b, a], 1.5, 1.5, 0, 20, 0);
    expect(h?.target).toBe(a);
    expect(h?.dist).toBeCloseTo(3, 5);
  });
  it('falla si se apunta fuera, salvo con ayuda de puntería', () => {
    const a = z(4.5, 1.5);
    expect(findTarget(m, [a], 1.5, 1.5, 0.25, 20, 0)).toBeNull();
    expect(findTarget(m, [a], 1.5, 1.5, 0.2, 20, 0.15)).not.toBeNull();
  });
  it('una pared de por medio bloquea el disparo', () => {
    const w = parseMap(['11111111', '10010001', '11111111']);
    expect(findTarget(w, [z(5.5, 1.5)], 1.5, 1.5, 0, 20, 0)).toBeNull();
  });
  it('no apunta a zombis muertos', () => {
    const a = z(4.5, 1.5);
    a.hurt(999, 0, 1, 0);
    expect(findTarget(m, [a], 1.5, 1.5, 0, 20, 0)).toBeNull();
  });
});

describe('zombis', () => {
  function ctx(px: number, py: number, zs: Zombie[]): ZContext & { damage: number } {
    const map = createHouse();
    const c = { map, doors: new Doors(map), pathfinder: new Pathfinder(20, 20), px, py, others: zs, damage: 0, damagePlayer(n: number) { c.damage += n; } };
    return c;
  }
  it('un rezagado tarda 7 balazos y un corredor 4', () => {
    const w = new Zombie(WALKER, 5, 5);
    const r = new Zombie(RUNNER, 5, 5);
    for (let i = 0; i < 6; i++) expect(w.hurt(PISTOL.damage, 0, 1, 0)).toBe(false);
    expect(w.hurt(PISTOL.damage, 0, 1, 0)).toBe(true);
    expect(w.state).toBe(ZState.Dead);
    for (let i = 0; i < 3; i++) expect(r.hurt(PISTOL.damage, 0, 1, 0)).toBe(false);
    expect(r.hurt(PISTOL.damage, 0, 1, 0)).toBe(true);
  });
  it('ve al jugador → alerta → persecución → ataque y daña', () => {
    const z = new Zombie(WALKER, 3.5, 15.5);
    const c = ctx(6.5, 15.5, [z]);
    z.update(c, 1 / 60);
    expect(z.state).toBe(ZState.Alert);
    let reachedAttack = false;
    for (let i = 0; i < 60 * 12 && c.damage === 0; i++) {
      z.update(c, 1 / 60);
      if (z.state === ZState.Attack) reachedAttack = true;
    }
    expect(reachedAttack).toBe(true);
    expect(c.damage).toBe(WALKER.damage);
  });
  it('no ve ni oye a través de una puerta cerrada, pero un ruido lo alerta', () => {
    const z = new Zombie(WALKER, 12.5, 15.5);
    const c = ctx(6.5, 15.5, [z]);
    for (let i = 0; i < 30; i++) z.update(c, 1 / 60);
    expect(z.state).toBe(ZState.Idle);
    z.hear(6.5, 15.5);
    expect(z.state).toBe(ZState.Alert);
  });
  it('persigue a través de puertas abriéndolas', () => {
    const z = new Zombie(RUNNER, 12.5, 15.5);
    const c = ctx(6.5, 15.5, [z]);
    z.hear(6.5, 15.5);
    for (let i = 0; i < 60 * 10; i++) {
      c.doors.update(1 / 60);
      z.update(c, 1 / 60);
    }
    expect(z.x).toBeLessThan(8);
  });
  it('dos zombis no se apilan', () => {
    const a = new Zombie(WALKER, 5.5, 8.5);
    const b = new Zombie(WALKER, 5.6, 8.5);
    const c = ctx(1.5, 8.5, [a, b]);
    a.hear(1.5, 8.5);
    b.hear(1.5, 8.5);
    for (let i = 0; i < 60 * 3; i++) {
      a.update(c, 1 / 60);
      b.update(c, 1 / 60);
    }
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.45);
  });
});

describe('World: combate', () => {
  it('disparar gasta bala, cuenta estadística y mata a un corredor en 4 impactos', () => {
    const w = new World();
    const z = w.zombies[1]; // corredor de la cocina
    w.player.x = z.x - 3;
    w.player.y = z.y;
    w.player.angle = 0;
    let killed = 0;
    w.onEvent = (e) => { if (e === 'zombieKill') killed++; };
    for (let i = 0; i < 4; i++) {
      w.fire();
      for (let t = 0; t < 30; t++) w.update(idle, 1 / 60);
      z.x = w.player.x + 3; // evita que se acerque durante la prueba
      z.y = w.player.y;
    }
    expect(killed).toBe(1);
    expect(w.stats.kills).toBe(1);
    expect(w.stats.shots).toBe(4);
    expect(w.weapon.mag).toBe(8);
  });
  it('un disparo alerta a zombis lejanos', () => {
    const w = new World();
    w.player.x = 6.5;
    w.player.y = 9.5;
    w.fire();
    expect(w.zombies[0].state).not.toBe(ZState.Idle); // el de la sala (a ~1.4 celdas)
  });
  it('el daño al jugador lo mata y detiene el mundo', () => {
    const w = new World();
    w.hurtPlayer(60);
    expect(w.dead).toBe(false);
    w.hurtPlayer(60);
    expect(w.hp).toBe(0);
    expect(w.dead).toBe(true);
    const t = w.time;
    w.update(idle, 1);
    expect(w.time).toBe(t);
  });
  it('recarga automática al intentar disparar con el cargador vacío', () => {
    const w = new World();
    w.weapon.mag = 0;
    w.fire();
    expect(w.weapon.reloading).toBe(true);
  });
});

describe('los zombis son sólidos para el jugador', () => {
  const fwd = { forward: 1, strafe: 0, turn: 0 };
  it('un zombi vivo en el pasillo de una celda cierra el paso; muerto, no', () => {
    const w = new World();
    for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; z.hp = 1e9; }
    const z = w.zombies[2];
    z.x = 9.5; z.y = 8.0;
    w.player.x = 9.5; w.player.y = 5.0; w.player.angle = Math.PI / 2;
    for (let i = 0; i < 60 * 4; i++) { z.x = 9.5; z.y = 8.0; w.update(fwd, 1 / 60); }
    expect(w.player.y).toBeLessThan(8.0 - 0.5);
    z.hurt(1e12, 0, 1, 0); // muerto: ya no estorba
    w.player.y = 5.0;
    for (let i = 0; i < 60 * 4; i++) w.update(fwd, 1 / 60);
    expect(w.player.y).toBeGreaterThan(9);
  });
  it('retroceder es más lento que avanzar', () => {
    const a = new World(), b = new World();
    for (const w of [a, b]) for (const z of w.zombies) { z.x = 1.5; z.y = 1.5; }
    a.player.x = b.player.x = 4.5; a.player.y = b.player.y = 17.5; a.player.angle = b.player.angle = 0;
    for (let i = 0; i < 30; i++) { a.update({ forward: 1, strafe: 0, turn: 0 }, 1 / 60); b.update({ forward: -1, strafe: 0, turn: 0 }, 1 / 60); }
    expect(Math.abs(b.player.x - 4.5)).toBeLessThan(Math.abs(a.player.x - 4.5) * 0.7);
  });
});
