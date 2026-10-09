import { GridMap, cellAt, isDoorCell } from '../engine/raycast';
import { SpriteId, ZPose } from '../engine/sprites';
import { Doors } from './doors';
import { DOOR_PASSABLE, moveWithCollision } from './collision';
import { hasLineOfSight } from './los';
import { Pathfinder } from './pathfinding';

export const enum ZState {
  Idle,
  Alert,
  Chase,
  Attack,
  Dead,
}

export interface ZombieDef {
  name: string;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  attackRange: number;
  windup: number;
  recover: number;
  sight: number;
  spriteBase: SpriteId;
  scale: number;
  poise?: number;
  boss?: boolean;
}

export const WALKER: ZombieDef = {
  name: 'Rezagado',
  hp: 70,
  speed: 0.95,
  radius: 0.3,
  damage: 18,
  attackRange: 0.9,
  windup: 0.55,
  recover: 0.9,
  sight: 7,
  spriteBase: SpriteId.WalkerBase,
  scale: 0.85,
};

export const RUNNER: ZombieDef = {
  name: 'Corredor',
  hp: 35,
  speed: 1.75,
  radius: 0.26,
  damage: 12,
  attackRange: 0.85,
  windup: 0.35,
  recover: 0.6,
  sight: 9,
  spriteBase: SpriteId.RunnerBase,
  scale: 0.8,
};

export const BOSS: ZombieDef = {
  name: 'Abominación',
  hp: 650,
  speed: 1.15,
  radius: 0.42,
  damage: 32,
  attackRange: 1.25,
  windup: 0.6,
  recover: 0.8,
  sight: 30,
  spriteBase: SpriteId.BossBase,
  scale: 1.3,
  poise: 0.12,
  boss: true,
};

export interface ZContext {
  map: GridMap;
  doors: Doors;
  pathfinder: Pathfinder;
  px: number;
  py: number;
  others: readonly Zombie[];
  damagePlayer(amount: number): void;
}

const hyp = (x: number, y: number): number => Math.sqrt(x * x + y * y);

const ALERT_TIME = 0.6;
const DOOR_PAUSE = 0.15;
const REPATH = 0.5;
const EN_ROUTE_LOST = 0.2;
const GIVE_UP = 12;
const HEAR_STEPS = 5.5;
const HEAR_IDLE = 4;

export class Zombie {
  hp: number;
  readonly maxHp: number;
  state = ZState.Idle;
  stateTime = 0;
  stagger = 0;
  animT = 0;
  moving = false;

  private tx = 0;
  private ty = 0;
  private lost = 0;
  private attackT = 0;
  private attackHit = false;
  private repath = 0;
  private doorTimer = 0;
  private readonly path = new Int16Array(200);
  private pathLen = 0;
  private pathIdx = 0;
  private kbx = 0;
  private kby = 0;

  constructor(readonly def: ZombieDef, public x: number, public y: number) {
    this.hp = def.hp;
    this.maxHp = def.hp;
  }

  get enraged(): boolean {
    return this.def.boss === true && this.hp < this.maxHp * 0.5;
  }

  get dead(): boolean {
    return this.state === ZState.Dead;
  }
  get radius(): number {
    return this.def.radius;
  }

  private enter(s: ZState): void {
    this.state = s;
    this.stateTime = 0;
    if (s === ZState.Attack) {
      this.attackT = 0;
      this.attackHit = false;
    }
    if (s === ZState.Chase) this.repath = 0;
  }

  hear(x: number, y: number): void {
    if (this.state === ZState.Dead) return;
    if (this.state === ZState.Idle) {
      this.tx = x;
      this.ty = y;
      this.enter(ZState.Alert);
    } else if (this.state === ZState.Chase && this.lost > 0) {
      this.tx = x;
      this.ty = y;
    }
  }

  hurt(amount: number, stagger: number, dx: number, dy: number, knock = 1.2): boolean {
    if (this.state === ZState.Dead) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter(ZState.Dead);
      return true;
    }
    const poise = this.def.poise ?? 1;
    this.stagger = Math.max(this.stagger, stagger * poise);
    this.kbx = dx * knock * poise;
    this.kby = dy * knock * poise;
    if (this.state === ZState.Idle || this.state === ZState.Alert) this.enter(ZState.Chase);
    if (this.state === ZState.Attack && poise >= 0.5) this.enter(ZState.Chase);
    return false;
  }

  update(ctx: ZContext, dt: number): void {
    if (this.state === ZState.Dead) return;
    this.stateTime += dt;
    this.moving = false;
    if (this.stagger > 0) {
      this.stagger -= dt;
      this.slide(ctx, this.kbx * dt, this.kby * dt);
      this.kbx *= 0.85;
      this.kby *= 0.85;
      return;
    }
    const dx = ctx.px - this.x;
    const dy = ctx.py - this.y;
    const dist = hyp(dx, dy);
    const sees = dist <= 20 && hasLineOfSight(ctx.map, this.x, this.y, ctx.px, ctx.py);

    switch (this.state) {
      case ZState.Idle:
        if ((sees && dist <= this.def.sight) || dist <= HEAR_IDLE) {
          this.tx = ctx.px;
          this.ty = ctx.py;
          this.enter(ZState.Alert);
        }
        break;
      case ZState.Alert:
        if (this.stateTime >= ALERT_TIME) this.enter(ZState.Chase);
        break;
      case ZState.Chase:
        this.chase(ctx, dt, sees, dist);
        break;
      case ZState.Attack:
        this.attack(ctx, dt, dist);
        break;
    }
    this.animT += dt;
  }

  private chase(ctx: ZContext, dt: number, sees: boolean, dist: number): void {
    if (sees) {
      this.tx = ctx.px;
      this.ty = ctx.py;
      this.lost = 0;
      if (dist <= this.def.attackRange) {
        this.enter(ZState.Attack);
        return;
      }
    } else {
      const hears = dist <= HEAR_STEPS;
      const atTarget = hyp(this.tx - this.x, this.ty - this.y) < 0.5;
      if (hears) {
        this.tx = ctx.px;
        this.ty = ctx.py;
      } else this.lost += atTarget ? dt : dt * EN_ROUTE_LOST;
      if (this.def.boss) this.lost = 0;
      if (this.lost > GIVE_UP || (atTarget && !hears && this.lost > 4)) {
        this.lost = 0;
        this.enter(ZState.Idle);
        return;
      }
    }
    this.advance(ctx, dt, sees && dist < 2.5);
  }

  private attack(ctx: ZContext, dt: number, dist: number): void {
    this.attackT += dt;
    if (!this.attackHit && this.attackT >= this.def.windup) {
      this.attackHit = true;
      if (dist <= this.def.attackRange + 0.25) ctx.damagePlayer(this.def.damage);
    }
    if (this.attackT >= this.def.windup + this.def.recover * (this.enraged ? 0.55 : 1)) {
      if (dist > this.def.attackRange + 0.4) this.enter(ZState.Chase);
      else {
        this.attackT = 0;
        this.attackHit = false;
      }
    }
  }

  private advance(ctx: ZContext, dt: number, direct: boolean): void {
    let gx = this.tx;
    let gy = this.ty;
    if (!direct) {
      this.repath -= dt;
      if (this.repath <= 0) {
        this.repath = REPATH;
        this.pathLen = ctx.pathfinder.find(ctx.map, Math.floor(this.x), Math.floor(this.y), Math.floor(this.tx), Math.floor(this.ty), this.path);
        this.pathIdx = 0;
      }
      const w = ctx.map.width;
      while (this.pathIdx < this.pathLen) {
        const c = this.path[this.pathIdx];
        const cx = (c % w) + 0.5;
        const cy = Math.floor(c / w) + 0.5;
        if (hyp(cx - this.x, cy - this.y) < 0.3) this.pathIdx++;
        else break;
      }
      if (this.pathIdx < this.pathLen) {
        const c = this.path[this.pathIdx];
        gx = (c % w) + 0.5;
        gy = Math.floor(c / w) + 0.5;
        if (this.waitForDoor(ctx, c % w, Math.floor(c / w), dt)) return;
      }
    }
    const dx = gx - this.x;
    const dy = gy - this.y;
    const d = hyp(dx, dy);
    if (d < 0.05) return;
    const step = Math.min(d, this.def.speed * (this.enraged ? 1.45 : 1) * dt);
    this.slide(ctx, (dx / d) * step, (dy / d) * step);
    this.moving = true;
  }

  private waitForDoor(ctx: ZContext, cx: number, cy: number, dt: number): boolean {
    const cell = cellAt(ctx.map, cx, cy);
    if (!isDoorCell(cell) || ctx.map.doorOpen === undefined) return false;
    if (ctx.map.doorOpen[cy * ctx.map.width + cx] >= DOOR_PASSABLE) return false;
    if (hyp(cx + 0.5 - this.x, cy + 0.5 - this.y) > 1.5) return false;
    if (ctx.doors.at(cx, cy)?.target === 1) return true;
    this.doorTimer += dt;
    if (this.doorTimer >= DOOR_PAUSE) {
      this.doorTimer = 0;
      ctx.doors.use(cx, cy);
    }
    return true;
  }

  private slide(ctx: ZContext, dx: number, dy: number): void {
    moveWithCollision(ctx.map, this, dx, dy, this.def.radius);
    for (const o of ctx.others) {
      if (o === this || o.dead) continue;
      const ox = this.x - o.x;
      const oy = this.y - o.y;
      const min = this.def.radius + o.def.radius;
      const d2 = ox * ox + oy * oy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001;
      const push = (min - d) * 0.5;
      moveWithCollision(ctx.map, this, (ox / d) * push, (oy / d) * push, this.def.radius);
    }
  }

  sprite(): number {
    const base = this.def.spriteBase;
    if (this.state === ZState.Dead) return base + ZPose.Dead;
    if (this.stagger > 0) return base + ZPose.Hurt;
    if (this.state === ZState.Attack && this.attackT < this.def.windup) return base + ZPose.Attack;
    if (this.moving) return base + (Math.floor(this.animT * (this.def.speed * 4)) % 2 === 0 ? ZPose.WalkA : ZPose.WalkB);
    return base + ZPose.WalkA;
  }
}
