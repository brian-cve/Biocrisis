import { CELL_EXIT, GridMap } from '../engine/raycast';
import { SpriteBatch, SpriteId } from '../engine/sprites';
import { Doors } from './doors';
import { INVENTORY_SLOTS, InvItem, Inventory } from './inventory';
import { BOSS_SPAWN, DECOR_SPAWNS, FINAL_EXIT, ITEM_SPAWNS, ItemKind, START, ZOMBIE_SPAWNS, createHouse } from './map';
import { Pathfinder } from './pathfinding';
import { MoveInput, Player } from './player';
import { Rng } from '../engine/rng';
import { AmmoPool, PISTOL, SHOTGUN, SMG, Weapon, WeaponId, falloff, findTarget, spreadAngles } from './weapons';
import { BOSS, RUNNER, WALKER, ZContext, Zombie } from './zombie';

export const PICKUP_RADIUS = 0.55;
const MESSAGE_SECONDS = 2.5;
export const MAX_HP = 100;
export const TONIC_HEAL = 35;
export const HEAL_TIME = 0.8;
export const SWITCH_LOCK = 0.4;
export const ALARM_RADIUS = 40;
export const AIM_ASSIST = 0.035;
export const START_RESERVE = 6;
export const BOX_BULLETS = 4;
export const BOX_SHELLS = 3;
export const SHOTGUN_START_MAG = 2;
export const SMG_START_MAG = 30;
export const CRATE_BULLETS = 40;
export const CRATE_SHELLS = 8;
const WEAPON_ORDER: readonly WeaponId[] = ['pistol', 'shotgun', 'smg'];

export type WorldEvent =
  | 'shot'
  | 'alarm'
  | 'shotgunShot'
  | 'shell'
  | 'dry'
  | 'switch'
  | 'keyPickup'
  | 'doorClose'
  | 'doorLocked'
  | 'healStart'
  | 'heal'
  | 'reloadStart'
  | 'reloaded'
  | 'zombieHit'
  | 'zombieKill'
  | 'playerHurt'
  | 'playerDead'
  | 'pickup'
  | 'bossWake'
  | 'bossDead'
  | 'doorOpen';

export interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  taken: boolean;
}

const ITEM_SPRITE: Record<ItemKind, SpriteId> = {
  [ItemKind.Key]: SpriteId.Key,
  [ItemKind.Tonic]: SpriteId.Tonic,
  [ItemKind.PistolAmmo]: SpriteId.PistolAmmo,
  [ItemKind.ShotgunShells]: SpriteId.ShotgunShells,
  [ItemKind.Shotgun]: SpriteId.Shotgun,
  [ItemKind.Smg]: SpriteId.Smg,
  [ItemKind.BulletCrate]: SpriteId.PistolAmmo,
  [ItemKind.ShellCrate]: SpriteId.ShotgunShells,
};

const ITEM_SCALE: Partial<Record<ItemKind, number>> = { [ItemKind.BulletCrate]: 0.46, [ItemKind.ShellCrate]: 0.46, [ItemKind.Smg]: 0.4 };

const ITEM_MESSAGE: Record<ItemKind, string> = {
  [ItemKind.Key]: 'Has encontrado la llave... algo se mueve en la casa',
  [ItemKind.Tonic]: 'Tónico recogido',
  [ItemKind.PistolAmmo]: 'Balas recogidas',
  [ItemKind.ShotgunShells]: 'Cartuchos recogidos',
  [ItemKind.Shotgun]: 'Has encontrado una escopeta',
  [ItemKind.Smg]: 'Metralleta. Mantén el disparo para ráfagas',
  [ItemKind.BulletCrate]: 'Caja de munición: +40 balas',
  [ItemKind.ShellCrate]: 'Caja de cartuchos: +8',
};

export class World {
  readonly map: GridMap = createHouse();
  readonly doors = new Doors(this.map);
  readonly player = new Player(START.x, START.y, START.angle);
  readonly items: Item[] = ITEM_SPAWNS.map((s) => ({ ...s, taken: false }));

  readonly pathfinder = new Pathfinder(this.map.width, this.map.height);
  readonly zombies: Zombie[] = ZOMBIE_SPAWNS.map((s) => new Zombie(s.type === 'walker' ? WALKER : RUNNER, s.x, s.y));
  readonly inventory = new Inventory(INVENTORY_SLOTS);
  readonly weapons: Record<WeaponId, Weapon> = { pistol: new Weapon(PISTOL), shotgun: new Weapon(SHOTGUN, 0), smg: new Weapon(SMG, 0) };
  readonly ammo: AmmoPool = { bullets: START_RESERVE, shells: 0 };
  readonly stats = { shots: 0, hits: 0, kills: 0, tonicsUsed: 0 };
  boss: Zombie | null = null;
  bossDefeated = false;
  aimAssist = AIM_ASSIST;
  onEvent: ((e: WorldEvent, x?: number, y?: number) => void) | null = null;

  private emit(e: WorldEvent, x?: number, y?: number): void {
    this.onEvent?.(e, x, y);
  }

  equipped: WeaponId = 'pistol';
  switchLock = 0;
  healTimer = 0;
  hp = MAX_HP;
  dead = false;
  hurtFlash = 0;
  private readonly rng: Rng;

  constructor(seed = 20240601) {
    this.rng = new Rng(seed);
    this.inventory.add(InvItem.Pistol);
    this.doors.onUse = (d, r) => {
      const ev = r === 'opened' ? 'doorOpen' : r === 'closed' ? 'doorClose' : r === 'locked' ? 'doorLocked' : null;
      if (ev) this.emit(ev, d.x + 0.5, d.y + 0.5);
      if (d.boss && r === 'opened') this.startBossFight();
    };
  }

  get weapon(): Weapon {
    return this.weapons[this.equipped];
  }
  get hasKey(): boolean {
    return this.inventory.has(InvItem.Key);
  }
  get hasShotgun(): boolean {
    return this.inventory.has(InvItem.Shotgun);
  }
  get tonics(): number {
    return this.inventory.count(InvItem.Tonic);
  }

  private readonly zctx: ZContext = {
    map: this.map,
    doors: this.doors,
    pathfinder: this.pathfinder,
    px: 0,
    py: 0,
    others: this.zombies,
    damagePlayer: (n) => this.hurtPlayer(n),
  };

  alarm = false;
  won = false;
  time = 0;
  message = '';
  messageTime = 0;

  update(input: MoveInput, dt: number): void {
    if (this.won || this.dead) return;
    this.time += dt;
    if (this.messageTime > 0) this.messageTime -= dt;
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
    this.player.update(this.map, input, dt, this.zombies);
    this.doors.update(dt);
    if (this.switchLock > 0) this.switchLock = Math.max(0, this.switchLock - dt);
    const wev = this.weapon.update(dt, this.ammo);
    if (wev === 'reloaded' || wev === 'shell') this.emit(wev);
    if (this.healTimer > 0) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.healTimer = 0;
        this.applyTonic();
      }
    }
    this.zctx.px = this.player.x;
    this.zctx.py = this.player.y;
    for (const z of this.zombies) z.update(this.zctx, dt);
    if (this.boss?.dead && !this.bossDefeated) this.defeatBoss();
    this.pickUp();
    if (this.map.cells[Math.floor(this.player.y) * this.map.width + Math.floor(this.player.x)] === CELL_EXIT) this.won = true;
  }

  private startBossFight(): void {
    if (this.boss) return;
    const b = new Zombie(BOSS, BOSS_SPAWN.x, BOSS_SPAWN.y);
    this.boss = b;
    this.zombies.push(b);
    b.hear(this.player.x, this.player.y);
    this.say('Algo enorme despierta...');
    this.emit('bossWake', b.x, b.y);
  }

  private defeatBoss(): void {
    this.bossDefeated = true;
    this.doors.unlock(FINAL_EXIT.x, FINAL_EXIT.y);
    this.say('El monstruo cae. La salida está libre');
    this.emit('bossDead', this.boss!.x, this.boss!.y);
  }

  private handsBusy(): boolean {
    return this.won || this.dead || this.healTimer > 0;
  }

  fire(): void {
    if (this.handsBusy() || this.switchLock > 0) return;
    const w = this.weapon;
    const ev = w.fire();
    if (ev === 'dry') {
      this.emit('dry');
      this.reload();
      return;
    }
    if (ev !== 'fired') return;
    const def = w.def;
    this.stats.shots++;
    this.emit(def.pellets > 1 ? 'shotgunShot' : 'shot');
    const p = this.player;
    this.makeNoise(p.x, p.y, def.noise);

    let aim = p.angle;
    const assist = this.aimAssist > 0 ? findTarget(this.map, this.zombies, p.x, p.y, p.angle, def.range, this.aimAssist) : null;
    if (assist) aim = Math.atan2(assist.target.y - p.y, assist.target.x - p.x);

    const offsets = spreadAngles(def.pellets, def.spread, () => this.rng.next());
    let anyHit = false;
    let killedAny = false;
    let hitZ: Zombie | null = null;
    const tol = def.pellets > 1 ? 0 : assist ? 0.001 : this.aimAssist;
    for (let i = 0; i < def.pellets; i++) {
      const a = aim + offsets[i];
      const hit = findTarget(this.map, this.zombies, p.x, p.y, a, def.range, tol);
      if (!hit) continue;
      anyHit = true;
      hitZ = hit.target;
      const dmg = def.damage * falloff(def, hit.dist);
      if (hit.target.hurt(dmg, def.stagger, Math.cos(a), Math.sin(a), def.knock)) {
        killedAny = true;
        this.stats.kills++;
      }
    }
    if (anyHit) this.stats.hits++;
    if (killedAny) this.emit('zombieKill', hitZ!.x, hitZ!.y);
    else if (anyHit) this.emit('zombieHit', hitZ!.x, hitZ!.y);
  }

  reload(): void {
    if (this.handsBusy()) return;
    if (this.weapon.startReload(this.ammo) === 'reloadStart') this.emit('reloadStart');
  }

  switchTo(id: WeaponId): boolean {
    if (this.handsBusy() || id === this.equipped) return false;
    if (!this.owns(id)) {
      this.say(id === 'shotgun' ? 'No tienes la escopeta' : id === 'smg' ? 'No tienes la metralleta' : 'No tienes esa arma');
      return false;
    }
    this.weapon.cancelReload();
    this.equipped = id;
    this.switchLock = SWITCH_LOCK;
    this.emit('switch');
    return true;
  }

  cycleWeapon(): boolean {
    const n = WEAPON_ORDER.length;
    const from = WEAPON_ORDER.indexOf(this.equipped);
    for (let i = 1; i < n; i++) {
      const id = WEAPON_ORDER[(from + i) % n];
      if (this.owns(id)) return this.switchTo(id);
    }
    return false;
  }

  owns(id: WeaponId): boolean {
    return this.inventory.has(id === 'pistol' ? InvItem.Pistol : id === 'shotgun' ? InvItem.Shotgun : InvItem.Smg);
  }

  useTonic(instant = false): 'started' | 'healed' | 'full' | 'none' | 'busy' {
    if (this.dead || this.won) return 'busy';
    if (this.healTimer > 0) return 'busy';
    if (this.tonics === 0) {
      this.say('No tienes tónicos');
      return 'none';
    }
    if (this.hp >= MAX_HP) {
      this.say('Vida llena');
      return 'full';
    }
    if (instant) {
      this.applyTonic();
      return 'healed';
    }
    this.weapon.cancelReload();
    this.healTimer = HEAL_TIME;
    this.emit('healStart');
    return 'started';
  }

  private applyTonic(): void {
    if (this.dead || !this.inventory.removeOne(InvItem.Tonic)) return;
    this.hp = Math.min(MAX_HP, this.hp + TONIC_HEAL);
    this.stats.tonicsUsed++;
    this.say('Te sientes mejor');
    this.emit('heal');
  }

  get healthLabel(): 'Bien' | 'Precaución' | 'Peligro' {
    return this.hp > 60 ? 'Bien' : this.hp > 30 ? 'Precaución' : 'Peligro';
  }

  makeNoise(x: number, y: number, radius: number): void {
    for (const z of this.zombies) {
      if (z.dead) continue;
      if (Math.hypot(z.x - x, z.y - y) <= radius) z.hear(x, y);
    }
  }

  hurtPlayer(amount: number): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtFlash = 1;
    this.emit('playerHurt');
    if (this.hp <= 0) {
      this.dead = true;
      this.emit('playerDead');
    }
  }

  say(text: string): void {
    this.message = text;
    this.messageTime = MESSAGE_SECONDS;
  }

  private pickUp(): void {
    const p = this.player;
    for (const it of this.items) {
      if (it.taken) continue;
      const dx = it.x - p.x;
      const dy = it.y - p.y;
      if (dx * dx + dy * dy > PICKUP_RADIUS * PICKUP_RADIUS) continue;
      const slot = it.kind === ItemKind.Key ? InvItem.Key : it.kind === ItemKind.Tonic ? InvItem.Tonic : it.kind === ItemKind.Shotgun ? InvItem.Shotgun : it.kind === ItemKind.Smg ? InvItem.Smg : null;
      if (slot !== null && !this.inventory.add(slot)) {
        if (this.messageTime <= 0) this.say('Inventario lleno');
        continue;
      }
      it.taken = true;
      switch (it.kind) {
        case ItemKind.PistolAmmo: this.ammo.bullets += BOX_BULLETS; break;
        case ItemKind.ShotgunShells: this.ammo.shells += BOX_SHELLS; break;
        case ItemKind.Shotgun: this.weapons.shotgun.mag = SHOTGUN_START_MAG; break;
        case ItemKind.Smg: this.weapons.smg.mag = SMG_START_MAG; break;
        case ItemKind.BulletCrate: this.ammo.bullets += CRATE_BULLETS; break;
        case ItemKind.ShellCrate: this.ammo.shells += CRATE_SHELLS; break;
      }
      this.say(ITEM_MESSAGE[it.kind]);
      this.emit(it.kind === ItemKind.Key ? 'keyPickup' : 'pickup');
      if (it.kind === ItemKind.Key) {
        this.makeNoise(p.x, p.y, ALARM_RADIUS);
        this.alarm = true;
        this.emit('alarm');
      }
    }
  }

  interact(): void {
    const p = this.player;
    const d = this.doors.ahead(p.x, p.y, Math.cos(p.angle), Math.sin(p.angle));
    if (!d) return;
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    if (d.locked) {
      if (d.boss && this.hasKey) {
        this.doors.unlock(d.x, d.y);
        this.say('La llave gira. Del otro lado se oye algo respirar...');
      } else if (d.exit) {
        this.say('La salida está sellada');
        return;
      } else {
        this.say('Necesitas una llave');
        return;
      }
    }
    this.doors.use(d.x, d.y, (x, y) => x === cx && y === cy);
  }

  fillSprites(batch: SpriteBatch): void {
    batch.clear();
    for (const d of DECOR_SPAWNS) batch.add(d.x, d.y, d.tex, d.scale, 0);
    const bob = 0.04 + Math.sin(this.time * 3) * 0.015;
    for (const it of this.items) {
      if (!it.taken) batch.add(it.x, it.y, ITEM_SPRITE[it.kind], ITEM_SCALE[it.kind] ?? 0.32, bob);
    }
    for (const z of this.zombies) batch.add(z.x, z.y, z.sprite(), z.def.scale, 0);
  }
}
