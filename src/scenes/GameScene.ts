import Phaser from 'phaser';
import { GameAudio } from '../audio/gameAudio';
import { music } from '../audio/music';
import { IntensityTracker, worldIntensity } from '../audio/music/intensity';
import { audio } from '../audio/engine';
import { Bmp } from '../engine/draw';
import { WeaponArt, blit, bmpFromTexture, buildPistolArt, buildShotgunArt, buildSmgArt } from '../engine/overlay';
import { Camera } from '../engine/raycast';
import { SCREEN_H, SCREEN_W, Renderer } from '../engine/renderer';
import { SpriteBatch, buildSpriteTextures } from '../engine/sprites';
import { SpriteId } from '../engine/spriteBase';
import { buildFlatTextures, buildWallTextures } from '../engine/textures';
import { FixedStep } from '../game/fixedStep';
import { settings } from '../game/settings';
import { WeaponId } from '../game/weapons';
import { AIM_ASSIST, HEAL_TIME, SWITCH_LOCK, World } from '../game/world';
import { GameInput } from '../ui/gameInput';
import { touchUI } from '../ui/touchUI';
import { Hud } from '../ui/hud';
import { fadeIn, fadeTo } from '../ui/transition';

const FB = 'fb';
const END_DELAY_DEAD = 1.8;
const END_DELAY_WON = 0.7;

export class GameScene extends Phaser.Scene {
  world!: World;
  private cam: Camera = { x: 0, y: 0, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 };
  private rc!: Renderer;
  private arts!: Record<WeaponId, WeaponArt>;
  private tonicBmp!: Bmp;
  private batch = new SpriteBatch();
  private fixed = new FixedStep(60);
  private gi!: GameInput;
  private hud!: Hud;
  private gameAudio!: GameAudio;
  private ctx!: CanvasRenderingContext2D;
  private image!: ImageData;
  private tex!: Phaser.Textures.CanvasTexture;
  private lockUntil = 0;
  private endTimer = 0;
  private ending = false;
  private disposers: (() => void)[] = [];
  private tension = new IntensityTracker();

  constructor() {
    super('Game');
  }

  create(): void {
    this.ending = false;
    this.endTimer = 0;
    this.lockUntil = this.time.now + 300;
    this.fixed = new FixedStep(60);
    this.world = new World((Math.random() * 0x7fffffff) | 0);
    this.disposers = [];

    if (this.textures.exists(FB)) this.textures.remove(FB);
    this.tex = this.textures.createCanvas(FB, SCREEN_W, SCREEN_H)!;
    this.ctx = this.tex.getContext();
    this.image = this.ctx.createImageData(SCREEN_W, SCREEN_H);
    const flats = buildFlatTextures();
    const sprites = buildSpriteTextures();
    this.tonicBmp = bmpFromTexture(sprites[SpriteId.Tonic]);
    this.arts = { pistol: buildPistolArt(), shotgun: buildShotgunArt(), smg: buildSmgArt() };
    this.rc = new Renderer(new Uint32Array(this.image.data.buffer), buildWallTextures(), flats.floors, flats.ceiling, sprites);
    this.add.image(0, 0, FB).setOrigin(0, 0);

    this.hud = new Hud(this);
    this.gi = new GameInput(this);
    this.gameAudio = new GameAudio(this.world);
    this.gi.doorAhead = () => {
      const p = this.world.player;
      return this.world.doors.ahead(p.x, p.y, Math.cos(p.angle), Math.sin(p.angle)) !== undefined;
    };
    const prev = this.world.onEvent;
    this.world.onEvent = (e, x, y) => {
      prev?.(e, x, y);
      if (e === 'shot') touchUI.haptic(14);
      else if (e === 'shotgunShot') touchUI.haptic(34);
      else if (e === 'playerHurt') touchUI.haptic(60);
      else if (e === 'playerDead') touchUI.haptic([90, 60, 160]);
    };
    this.applySettings();
    this.tension = new IntensityTracker();
    music.setIntensity(0);
    music.play('explore');

    this.events.on('resume', this.onResume, this);
    const onLockChange = () => {
      if (!document.pointerLockElement && this.scene.isActive() && !this.world.dead && !this.world.won && !this.ending && this.time.now >= this.lockUntil) this.openPause();
    };
    document.addEventListener('pointerlockchange', onLockChange);
    this.disposers.push(() => document.removeEventListener('pointerlockchange', onLockChange));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());
    if (import.meta.env.DEV) {
      (window as unknown as { __bc: GameScene }).__bc = this;
    }
    fadeIn(this, 500);
  }

  private onResume(): void {
    this.lockUntil = this.time.now + 250;
    this.input.keyboard?.resetKeys();
    audio.setDucked(false);
  }

  private applySettings(): void {
    const s = settings.value;
    this.gi.sensitivity = s.sensitivity;
    this.gi.mouseLook = s.mouseLook;
    this.gi.touchActive = touchUI.visible;
    this.world.aimAssist = s.aimAssist ? AIM_ASSIST : 0;
    this.hud.minimap = s.minimap;
  }

  private dispose(): void {
    this.events.off('resume', this.onResume, this);
    this.gi?.dispose();
    this.gameAudio?.dispose();
    this.world.doors.onUse = null;
    this.world.onEvent = null;
    this.hud?.destroy();
    audio.setDucked(false);
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.textures.exists(FB)) this.textures.remove(FB);
    for (const d of this.disposers) d();
    this.disposers = [];
  }

  update(_t: number, delta: number): void {
    const dt = delta / 1000;
    const w = this.world;
    this.applySettings();
    this.gi.update(dt);
    const gi = this.gi;

    if (!this.ending && (w.dead || w.won)) {
      this.endTimer += dt;
      if (this.endTimer > (w.dead ? END_DELAY_DEAD : END_DELAY_WON)) {
        this.ending = true;
        fadeTo(this, w.dead ? 'GameOver' : 'Win', this.runStats(), 600);
      }
    }

    const canAct = !w.dead && !w.won && !this.ending;
    if (canAct && this.time.now >= this.lockUntil) {
      if (gi.pressed('pause')) return this.openPause();
      if (gi.pressed('inventory')) return this.openInventory();
    }
    if (canAct) {
      if (w.weapon.def.auto ? gi.held('fire') : gi.pressed('fire')) w.fire();
      if (gi.pressed('reload')) w.reload();
      if (gi.pressed('interact')) w.interact();
      if (gi.pressed('weapon1')) w.switchTo('pistol');
      if (gi.pressed('weapon2')) w.switchTo('shotgun');
      if (gi.pressed('weapon3')) w.switchTo('smg');
      if (gi.pressed('cycleWeapon')) w.cycleWeapon();
      if (gi.pressed('heal')) w.useTonic();
    }

    let look = gi.move.look ?? 0;
    this.fixed.advance(dt, (step) => {
      gi.move.look = look;
      look = 0;
      w.update(gi.move, step);
    });
    this.gameAudio.update(dt);
    music.setIntensity(this.tension.update(canAct ? worldIntensity(w) : 0, dt));
    if ((w.dead || w.won) && music.mode !== 'off') music.stop(1.2);

    w.player.fillCamera(this.cam);
    w.fillSprites(this.batch);
    this.rc.render(this.cam, w.map, this.batch);
    this.drawWeapon();
    this.ctx.putImageData(this.image, 0, 0);
    this.tex.refresh();
    this.hud.update(w, dt);
  }

  private runStats() {
    const w = this.world;
    return {
      seconds: w.time,
      shots: w.stats.shots,
      hits: w.stats.hits,
      kills: w.stats.kills,
      tonicsUsed: w.stats.tonicsUsed,
      zombies: w.zombies.length,
    };
  }

  private openPause(): void {
    if (document.pointerLockElement) document.exitPointerLock();
    audio.setDucked(true);
    this.scene.launch('Pause');
    this.scene.pause();
  }

  private openInventory(): void {
    this.scene.launch('Inventory', { world: this.world });
    this.scene.pause();
  }

  debugStats(): Record<string, number | string> {
    const kb = this.input.keyboard as unknown as { keys?: unknown[] } | null;
    return {
      textures: this.textures.getTextureKeys().length,
      keys: kb?.keys?.filter(Boolean).length ?? 0,
      pointerListeners: this.input.listenerCount('pointerdown') + this.input.listenerCount('wheel') + this.input.listenerCount('pointermove'),
      sceneEvents: this.events.eventNames().length,
      voices: audio.voices,
      loops: audio.loops,
    };
  }

  private drawWeapon(): void {
    const w = this.world;
    const wp = w.weapon;
    const art = this.arts[w.equipped];
    const moving = this.gi.move.forward !== 0 || this.gi.move.strafe !== 0;
    const sway = Math.sin(w.time * 6) * (moving ? 3 : 0.6);
    let drop = 0;
    if (wp.reloading) {
      const t = 1 - wp.reload / wp.def.reloadTime;
      drop = wp.def.perShell ? 8 + Math.sin(t * Math.PI) * 14 : Math.sin(Math.min(1, t) * Math.PI) * 60;
    }
    if (w.switchLock > 0) drop = Math.max(drop, (w.switchLock / SWITCH_LOCK) * 70);
    if (w.healTimer > 0) drop = 80;
    if (w.dead) drop = 90;

    let bmp = art.idle;
    if (wp.kick > 0.55) bmp = art.recoil;
    else if (art.pump && wp.cooldown > 0.2 && wp.cooldown < wp.def.cooldown - 0.2) bmp = art.pump;
    const scale = 2;
    const x = Math.round(SCREEN_W / 2 - (bmp.w * scale) / 2 + sway + 24);
    const y = Math.round(SCREEN_H - bmp.h * scale + 6 + drop + wp.kick * 6);
    blit(this.rc.pixels, SCREEN_W, SCREEN_H, bmp, x, y, scale, 2);
    if (wp.kick > 0.7) blit(this.rc.pixels, SCREEN_W, SCREEN_H, art.flash, x + art.flashDx * scale, y + art.flashDy * scale, scale, 0);

    if (w.healTimer > 0) {
      const t = 1 - w.healTimer / HEAL_TIME;
      const lift = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 52;
      blit(this.rc.pixels, SCREEN_W, SCREEN_H, this.tonicBmp, SCREEN_W / 2 - 48 + sway, SCREEN_H - 40 - lift, 3, 1);
    }
  }
}
