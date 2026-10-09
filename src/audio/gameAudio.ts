import { LoopHandle, audio } from './engine';
import { sfx } from './sfx';
import { Spatial, spatialParams } from './spatial';
import { World, WorldEvent } from '../game/world';
import { ZState } from '../game/zombie';

const STRIDE = 1.15;
const NEAR: Spatial = { pan: 0, gain: 1 };

export class GameAudio {
  private wind: LoopHandle | null = null;
  private stepDist = 0;
  private lastX: number;
  private lastY: number;
  private heart = 0;
  private drip = 6;
  private lastHit = 0;
  private readonly groan: number[];
  private readonly prev: ZState[];

  constructor(private readonly world: World) {
    this.lastX = world.player.x;
    this.lastY = world.player.y;
    this.groan = world.zombies.map(() => 3 + Math.random() * 6);
    this.prev = world.zombies.map((z) => z.state);
    world.onEvent = (e, x, y) => this.onEvent(e, x, y);
    this.wind = audio.loopNoise({ filter: { type: 'bandpass', freq: 320, q: 0.6 }, gain: 0.14, lfoRate: 0.07, lfoDepth: 140 });
  }

  private sp(x?: number, y?: number): Spatial {
    if (x === undefined || y === undefined) return NEAR;
    const p = this.world.player;
    return spatialParams({ x: p.x, y: p.y, angle: p.angle }, x, y);
  }

  private onEvent(e: WorldEvent, x?: number, y?: number): void {
    const w = this.world;
    switch (e) {
      case 'shot': if (w.equipped === 'smg') sfx.smg(); else sfx.pistol(); break;
      case 'bossWake': sfx.bossRoar(this.sp(x, y)); break;
      case 'bossDead': sfx.bossDie(this.sp(x, y)); break;
      case 'shotgunShot': sfx.shotgun(); sfx.pump(0.55); break;
      case 'dry': sfx.dry(); break;
      case 'reloadStart': if (w.equipped !== 'shotgun') sfx.reload(); break;
      case 'shell': sfx.shell(); break;
      case 'switch': sfx.switchWeapon(); break;
      case 'zombieHit': {
        const now = performance.now();
        if (now - this.lastHit > 110) sfx.zombieHit(this.sp(x, y));
        this.lastHit = now;
        break;
      }
      case 'zombieKill': sfx.zombieDie(this.sp(x, y)); break;
      case 'playerHurt': sfx.playerHurt(); break;
      case 'playerDead': sfx.playerDead(); break;
      case 'pickup': sfx.pickup(); break;
      case 'keyPickup': sfx.keyPickup(); break;
      case 'alarm': sfx.alarm(); break;
      case 'doorOpen': sfx.door(this.sp(x, y), true); break;
      case 'doorClose': sfx.door(this.sp(x, y), false); break;
      case 'doorLocked': sfx.locked(); break;
      case 'healStart': sfx.healStart(); break;
      case 'heal': sfx.heal(); break;
    }
  }

  update(dt: number): void {
    const w = this.world;
    const p = w.player;
    if (w.dead || w.won) return;

    this.stepDist += Math.hypot(p.x - this.lastX, p.y - this.lastY);
    this.lastX = p.x;
    this.lastY = p.y;
    if (this.stepDist >= STRIDE) {
      this.stepDist = 0;
      sfx.step();
    }

    w.zombies.forEach((z, i) => {
      const sp = this.sp(z.x, z.y);
      const runner = z.def.name === 'Corredor';
      const boss = z.def.boss === true;
      if (this.groan[i] === undefined) {
        this.groan[i] = 2 + Math.random() * 2;
        this.prev[i] = z.state;
      }
      if (z.state !== this.prev[i]) {
        if (z.state === ZState.Alert) { if (!boss) sfx.groan(sp, runner); }
        else if (z.state === ZState.Attack) sfx.zombieAttack(sp);
        this.prev[i] = z.state;
      }
      if (z.dead) return;
      this.groan[i] -= dt;
      if (this.groan[i] <= 0) {
        const active = z.state === ZState.Chase || z.state === ZState.Attack;
        if (active || sp.gain > 0.05) sfx.groan(sp, runner, boss);
        this.groan[i] = active ? 2.5 + Math.random() * 2.5 : 9 + Math.random() * 10;
      }
    });

    if (w.hp <= 30) {
      this.heart -= dt;
      if (this.heart <= 0) {
        sfx.heartbeat(1);
        this.heart = 0.45 + (w.hp / 30) * 0.65;
      }
    } else this.heart = 0;

    this.drip -= dt;
    if (this.drip <= 0) {
      const a = Math.random() * Math.PI * 2;
      const d = 5 + Math.random() * 6;
      sfx.drip(this.sp(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d));
      this.drip = 5 + Math.random() * 9;
    }
  }

  dispose(): void {
    this.world.onEvent = null;
    this.wind?.stop();
    this.wind = null;
  }
}
