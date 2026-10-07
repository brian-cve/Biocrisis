import { Rng } from '../src/engine/rng';
import { START } from '../src/game/map';
import { MoveInput } from '../src/game/player';
import { hasLineOfSight } from '../src/game/los';
import { World } from '../src/game/world';
import { InvItem } from '../src/game/inventory';
import { RUNNER, WALKER, ZState } from '../src/game/zombie';

// barridos de balance por variables de entorno (solo en simulación)
if (process.env.WHP) WALKER.hp = Number(process.env.WHP);
if (process.env.WDMG) WALKER.damage = Number(process.env.WDMG);
if (process.env.RHP) RUNNER.hp = Number(process.env.RHP);
if (process.env.RDMG) RUNNER.damage = Number(process.env.RDMG);

/**
 * Jugador automático para medir el balance sin jugadores humanos (cota optimista: ruta perfecta, sin dudas).
 *  - huida:    ruta directa llave→salida, no dispara nunca (solo se cura).
 *  - sigilo:   ruta directa; dispara solo a quien le persigue de cerca.
 *  - agresivo: lo recoge todo y mata a todo lo que ve (kiting con retroceso), usa la escopeta de cerca.
 */
export type Policy = 'huida' | 'sigilo' | 'agresivo' | 'tactico';

export interface BotResult {
  won: boolean;
  dead: boolean;
  timedOut: boolean;
  seconds: number;
  shots: number;
  hits: number;
  kills: number;
  tonicsUsed: number;
  hpEnd: number;
  bulletsLeft: number;
  shellsLeft: number;
}

export const ENGAGE: Record<Policy, number> = { huida: 0, sigilo: 5, agresivo: Number(process.env.ENGAGE ?? 9), tactico: 8 };
const MAX_SECONDS = 900;
/** Dispersión de la puntería del bot (rad): ajustada para un acierto parecido al de una persona (~60–75 %). */
export const AIM_NOISE = Number(process.env.AIM_NOISE ?? 0.2);
/** Segundos que tarda en reaccionar a un enemigo nuevo antes de empezar a apuntar. */
const REACTION = 0.35;

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function playBot(seed: number, policy: Policy): BotResult {
  const w = new World(seed);
  if (process.env.RESERVE) w.ammo.bullets = Number(process.env.RESERVE);
  for (const z of w.zombies) z.hp = z.def.hp;
  const rng = new Rng(seed * 7919 + 13);
  const input: MoveInput = { forward: 0, strafe: 0, turn: 0 };
  const path = new Int16Array(400);
  const dt = 1 / 60;

  // plan de objetivos: huida/sigilo van a la llave; agresivo recoge todo (vecino más cercano) y la llave
  const plan: { x: number; y: number; kind: number }[] = [];
  const key = w.items.find((i) => i.kind === 0)!;
  if (policy === 'agresivo' || policy === 'tactico') {
    const rest = w.items.filter((i) => i.kind !== 0);
    let cx = START.x, cy = START.y;
    const all = [...rest, key];
    while (all.length) {
      all.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
      const n = all.shift()!;
      plan.push({ x: n.x, y: n.y, kind: n.kind });
      cx = n.x; cy = n.y;
    }
    // la llave se recoge cuando toque por cercanía; el resto del plan no es obligatorio si no se puede llegar
  } else plan.push({ x: key.x, y: key.y, kind: 0 });

  let repath = 0;
  let wpX = START.x, wpY = START.y;
  let doorCooldown = 0;
  let aimNoise = 0;
  let noiseT = 0;
  let stuckT = 0, lastX = w.player.x, lastY = w.player.y;
  let unstick = 0;
  let healed = 0;
  let seenT = 0;

  for (let t = 0; t < MAX_SECONDS; t += dt) {
    if (w.dead || w.won) break;
    const p = w.player;

    // --- objetivo actual
    let gx = 1.5, gy = 15.5; // delante de la puerta de salida
    let goingExit = true;
    for (const g of plan) {
      const it = w.items.find((i) => Math.hypot(i.x - g.x, i.y - g.y) < 0.01);
      if (it && !it.taken) { gx = g.x; gy = g.y; goingExit = false; break; }
    }
    if (goingExit && !w.hasKey) { gx = key.x; gy = key.y; goingExit = false; }

    // --- combate
    const alive = w.zombies.filter((z) => !z.dead);
    // cuántos zombis rodean al jugador a menos de 2 celdas (para decidir si ya no hay margen de esquivar)
    const nearBlockers = alive.filter((z) => Math.hypot(z.x - p.x, z.y - p.y) < 2).length;
    let target = null as (typeof alive)[number] | null;
    let best = ENGAGE[policy];
    if (best > 0) {
      for (const z of alive) {
        const d = Math.hypot(z.x - p.x, z.y - p.y);
        const threat = policy === 'agresivo' || z.state === ZState.Chase || z.state === ZState.Attack;
        // táctico: gasta munición en corredores (rápidos); a los rezagados (lentos) solo si ya están encima y hay escopeta o
        // si se acabó el espacio para esquivarlos; si no, los esquiva
        const walker = z.def.name === 'Rezagado';
        const worth = policy !== 'tactico' || !walker || (d < 3 && w.weapons.shotgun.mag > 0 && w.owns('shotgun')) || (d < 1.6 && nearBlockers > 0);
        if (d < best && threat && worth && hasLineOfSight(w.map, p.x, p.y, z.x, z.y)) { best = d; target = z; }
      }
    }
    // curarse cuando toca (en plena huida también)
    if (w.hp < 45 && w.tonics > 0 && w.healTimer <= 0) { w.useTonic(); healed++; }
    // recarga oportunista
    const wp = w.weapon;
    const nearest = alive.reduce((m, z) => Math.min(m, Math.hypot(z.x - p.x, z.y - p.y)), 99);
    if (!wp.reloading && (wp.mag === 0 || (wp.mag < wp.def.magSize / 2 && nearest > 6))) w.reload();

    noiseT -= dt;
    if (noiseT <= 0) { aimNoise = (rng.next() + rng.next() - 1) * AIM_NOISE; noiseT = 0.45; }

    input.forward = 0; input.turn = 0; input.strafe = 0;
    seenT = target ? seenT + dt : 0;
    if (target && seenT < REACTION) {
      input.forward = 0; // se queda un instante paralizado al ver al enemigo
    } else if (target) {
      const d = Math.hypot(target.x - p.x, target.y - p.y);
      // arma según distancia
      if (w.owns('shotgun') && w.weapons.shotgun.mag > 0 && d < 3.2) w.switchTo('shotgun');
      else if (w.equipped === 'shotgun' && (d > 4.5 || w.weapons.shotgun.mag === 0)) w.switchTo('pistol');
      const aim = Math.atan2(target.y - p.y, target.x - p.x) + aimNoise;
      const err = norm(aim - p.angle);
      input.turn = Math.max(-1, Math.min(1, err * 4));
      if (Math.abs(err) < 0.06) w.fire();
      // retroceder si se acerca (kiting); si no, mantener posición
      if (d < 2.2) input.forward = -1;
    } else {
      // --- navegación
      repath -= dt;
      const cx = Math.floor(p.x), cy = Math.floor(p.y);
      if (repath <= 0) {
        repath = 0.3;
        const n = w.pathfinder.find(w.map, cx, cy, Math.floor(gx), Math.floor(gy), path);
        if (n > 0) { wpX = (path[0] % w.map.width) + 0.5; wpY = Math.floor(path[0] / w.map.width) + 0.5; }
        else { wpX = gx; wpY = gy; }
      }
      const atGoalCell = Math.floor(p.x) === Math.floor(gx) && Math.floor(p.y) === Math.floor(gy);
      let tx = atGoalCell ? gx : wpX, ty = atGoalCell ? gy : wpY;
      if (goingExit && atGoalCell) { tx = 0.5; ty = 15.5; } // cruzar la puerta de salida

      // puerta cerrada en el siguiente paso: abrirla mirándola
      const door = w.doors.at(Math.floor(tx), Math.floor(ty));
      const needDoor = door && (door.open < 0.8) && Math.hypot(tx - p.x, ty - p.y) < 1.4;
      let dirX = tx - p.x, dirY = ty - p.y;
      const dl = Math.hypot(dirX, dirY) || 1;
      dirX /= dl; dirY /= dl;
      if (policy === 'tactico') {
        for (const z of alive) {
          const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy);
          if (d < 2.4 && d > 0.01) { const k = ((2.4 - d) / 2.4) * 1.6; dirX += (dx / d) * k; dirY += (dy / d) * k; }
        }
      }
      const err = norm(Math.atan2(dirY, dirX) - p.angle);
      input.turn = Math.max(-1, Math.min(1, err * 4));
      if (needDoor) {
        doorCooldown -= dt;
        if (Math.abs(err) < 0.25 && doorCooldown <= 0) { w.interact(); doorCooldown = 0.6; }
        input.forward = 0;
      } else input.forward = Math.abs(err) < 0.7 ? 1 : 0.15;
      if (goingExit && atGoalCell && !door?.open) {
        // frente a la puerta de salida: abrir con la llave
        const e2 = norm(Math.PI - p.angle);
        input.turn = Math.max(-1, Math.min(1, e2 * 4));
        if (Math.abs(e2) < 0.1) { doorCooldown -= dt; if (doorCooldown <= 0) { w.interact(); doorCooldown = 0.8; } }
        input.forward = 0;
      }
    }

    // anti-atasco
    stuckT += dt;
    if (stuckT > 2.5) {
      if (Math.hypot(p.x - lastX, p.y - lastY) < 0.25 && !target && w.healTimer <= 0) unstick = 0.6;
      stuckT = 0; lastX = p.x; lastY = p.y;
    }
    if (unstick > 0) { unstick -= dt; input.strafe = 1; input.forward = 0.6; input.turn = 0.7; }

    w.update(input, dt);
  }
  return {
    won: w.won, dead: w.dead, timedOut: !w.won && !w.dead, seconds: w.time,
    shots: w.stats.shots, hits: w.stats.hits, kills: w.stats.kills, tonicsUsed: w.stats.tonicsUsed,
    hpEnd: w.hp, bulletsLeft: w.ammo.bullets + w.weapons.pistol.mag, shellsLeft: w.ammo.shells + w.weapons.shotgun.mag,
  };
}

void InvItem;
