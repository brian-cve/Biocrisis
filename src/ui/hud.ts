import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { InvItem } from '../game/inventory';
import { MAX_HP, World } from '../game/world';
import { CELL_EXIT, isDoorCell } from '../engine/raycast';
import { iconKey, registerIcons } from './icons';
import { Action, bindingFor } from '../game/controls';
import { WEAPON_ITEM } from '../game/items';

const HINTS: readonly [Action, string][] = [
  ['fire', 'Fire'],
  ['interact', 'Use/Open door'],
  ['reload', 'Reload'],
  ['heal', 'Heal'],
  ['inventory', 'Inventory'],
  ['pause', 'Pause'],
];
const hintKey = (a: Action): string => bindingFor(a).keyLabels[0].replace(/^SPACE.*/, 'SPC');

const FONT = 'monospace';
const BAR_W = 70;
const BOSS_BAR_W = 140;

export class Hud {
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private hpLabel: Phaser.GameObjects.Text;
  private tonicIcon: Phaser.GameObjects.Image;
  private tonicText: Phaser.GameObjects.Text;
  private weaponIcon: Phaser.GameObjects.Image;
  private ammoText: Phaser.GameObjects.Text;
  private ammoSub: Phaser.GameObjects.Text;
  private keyIcon: Phaser.GameObjects.Image;
  private message: Phaser.GameObjects.Text;
  private cross: Phaser.GameObjects.Graphics;
  private mini: Phaser.GameObjects.Graphics;
  private vignette: Phaser.GameObjects.Rectangle;
  private bossBack: Phaser.GameObjects.Rectangle;
  private bossBar: Phaser.GameObjects.Rectangle;
  private bossName: Phaser.GameObjects.Text;
  private t = 0;
  private shown = { hp: -1, color: -1, blink: false, tonics: -1, key: false, weapon: '', ammo: '', color2: '', sub: '', boss: '', bossHp: -1, msg: '', vignette: -1 };
  minimap = false;

  constructor(scene: Phaser.Scene) {
    registerIcons(scene.textures);
    const y0 = SCREEN_H - 24;
    this.buildHints(scene);
    this.vignette = scene.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x8a0000, 0).setOrigin(0, 0).setDepth(5);
    scene.add.rectangle(0, y0, SCREEN_W, 24, 0x050706, 0.62).setOrigin(0, 0).setDepth(10);
    scene.add.text(6, y0 + 3, 'HEALTH', { fontFamily: FONT, fontSize: '8px', color: '#56705f' }).setDepth(11);
    scene.add.rectangle(6, y0 + 13, BAR_W + 2, 7, 0x16201c).setOrigin(0, 0).setStrokeStyle(1, 0x2e4038).setDepth(11);
    this.hpBar = scene.add.rectangle(7, y0 + 14, BAR_W, 5, 0x56a05f).setOrigin(0, 0).setDepth(12);
    this.hpText = scene.add.text(6 + BAR_W + 6, y0 + 11, '', { fontFamily: FONT, fontSize: '8px', color: '#9ab49c' }).setDepth(11);
    this.hpLabel = scene.add.text(32, y0 + 3, '', { fontFamily: FONT, fontSize: '8px', color: '#7ac080' }).setDepth(11);
    this.tonicIcon = scene.add.image(122, y0 + 4, iconKey(InvItem.Tonic)).setOrigin(0, 0).setScale(0.6).setDepth(11);
    this.tonicText = scene.add.text(142, y0 + 10, '', { fontFamily: FONT, fontSize: '10px', color: '#9ab49c' }).setDepth(11);
    this.keyIcon = scene.add.image(168, y0 + 4, iconKey(InvItem.Key)).setOrigin(0, 0).setScale(0.6).setDepth(11).setVisible(false);
    this.weaponIcon = scene.add.image(SCREEN_W - 118, y0 + 2, iconKey(InvItem.Pistol)).setOrigin(0, 0).setScale(0.75).setDepth(11);
    this.ammoText = scene.add.text(SCREEN_W - 6, y0 + 3, '', { fontFamily: FONT, fontSize: '12px', color: '#c4c4be' }).setOrigin(1, 0).setDepth(11);
    this.ammoSub = scene.add.text(SCREEN_W - 6, y0 + 15, '', { fontFamily: FONT, fontSize: '8px', color: '#56705f' }).setOrigin(1, 0).setDepth(11);
    this.message = scene.add.text(SCREEN_W / 2, y0 - 14, '', { fontFamily: FONT, fontSize: '10px', color: '#c4c4be', stroke: '#050706', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(11);
    this.cross = scene.add.graphics().setDepth(11);
    this.cross.lineStyle(1, 0x9ab49c, 0.55);
    this.cross.lineBetween(SCREEN_W / 2 - 4, SCREEN_H / 2, SCREEN_W / 2 - 1, SCREEN_H / 2);
    this.cross.lineBetween(SCREEN_W / 2 + 2, SCREEN_H / 2, SCREEN_W / 2 + 5, SCREEN_H / 2);
    this.cross.lineBetween(SCREEN_W / 2, SCREEN_H / 2 - 4, SCREEN_W / 2, SCREEN_H / 2 - 1);
    this.cross.lineBetween(SCREEN_W / 2, SCREEN_H / 2 + 2, SCREEN_W / 2, SCREEN_H / 2 + 5);
    this.mini = scene.add.graphics().setDepth(11);
    this.bossBack = scene.add.rectangle(SCREEN_W / 2, 24, BOSS_BAR_W + 2, 7, 0x16201c).setStrokeStyle(1, 0x7a2824).setDepth(11).setVisible(false);
    this.bossBar = scene.add.rectangle(SCREEN_W / 2 - BOSS_BAR_W / 2, 24, BOSS_BAR_W, 5, 0xb02a24).setOrigin(0, 0.5).setDepth(12).setVisible(false);
    this.bossName = scene.add.text(SCREEN_W / 2, 14, '', { fontFamily: FONT, fontSize: '7px', color: '#d05048', stroke: '#050706', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(12).setVisible(false);
  }

  private buildHints(scene: Phaser.Scene): void {
    scene.add.rectangle(0, 0, SCREEN_W, 11, 0x050706, 0.55).setOrigin(0, 0).setDepth(10);
    const style = { fontFamily: FONT, fontSize: '7px' };
    const items = HINTS.map(([action, label]) => ({
      key: scene.add.text(0, 2, hintKey(action), { ...style, color: '#c4b040' }).setDepth(11),
      label: scene.add.text(0, 2, label, { ...style, color: '#9ab49c' }).setDepth(11),
    }));
    const gap = 8;
    const total = items.reduce((n, it) => n + it.key.width + 2 + it.label.width, 0) + gap * (items.length - 1);
    let x = Math.round((SCREEN_W - total) / 2);
    for (const it of items) {
      it.key.setX(x);
      it.label.setX(x + it.key.width + 2);
      x += it.key.width + 2 + it.label.width + gap;
    }
  }

  update(w: World, dt: number): void {
    this.t += dt;
    const sh = this.shown;
    const low = w.hp <= 30 && !w.dead;
    const label = w.healthLabel;
    const blink = low && Math.sin(this.t * 10) < 0;
    const color = label === 'Good' ? 0x56a05f : label === 'Caution' ? 0xc4b040 : 0xb02a24;
    if (sh.hp !== w.hp || sh.color !== color) {
      this.hpBar.width = Math.max(0, Math.min(BAR_W, Math.round((BAR_W * w.hp) / MAX_HP)));
      this.hpBar.setFillStyle(color);
      this.hpLabel.setText(label.toUpperCase()).setColor(label === 'Good' ? '#7ac080' : label === 'Caution' ? '#c4b040' : '#d05048');
      this.hpText.setText(String(w.hp));
      sh.hp = w.hp;
      sh.color = color;
    }
    if (sh.blink !== blink) {
      this.hpBar.setAlpha(blink ? 0.25 : 1);
      this.hpLabel.setAlpha(blink ? 0.3 : 1);
      sh.blink = blink;
    }

    if (sh.tonics !== w.tonics) {
      this.tonicText.setText(`x${w.tonics}`);
      this.tonicIcon.setAlpha(w.tonics > 0 ? 1 : 0.3);
      sh.tonics = w.tonics;
    }
    if (sh.key !== w.hasKey) {
      this.keyIcon.setVisible(w.hasKey);
      sh.key = w.hasKey;
    }

    const wp = w.weapon;
    if (sh.weapon !== w.equipped) {
      this.weaponIcon.setTexture(iconKey(WEAPON_ITEM[w.equipped]));
      sh.weapon = w.equipped;
    }
    const reserve = wp.def.ammo === 'bullets' ? w.ammo.bullets : w.ammo.shells;
    const ammo = wp.reloading ? '...' : `${wp.mag}`;
    if (sh.ammo !== ammo) {
      this.ammoText.setText(ammo);
      sh.ammo = ammo;
    }
    const ammoColor = wp.mag === 0 && !wp.reloading ? '#d05048' : '#c4c4be';
    if (sh.color2 !== ammoColor) {
      this.ammoText.setColor(ammoColor);
      sh.color2 = ammoColor;
    }
    const sub = `${wp.def.name}  /${reserve}`;
    if (sh.sub !== sub) {
      this.ammoSub.setText(sub);
      sh.sub = sub;
    }

    const b = w.boss;
    const showBoss = b !== null && !b.dead;
    this.bossBack.setVisible(showBoss);
    this.bossBar.setVisible(showBoss);
    this.bossName.setVisible(showBoss);
    if (showBoss) {
      const hp = Math.max(1, Math.round(BOSS_BAR_W * (b.hp / b.maxHp)));
      const name = b.enraged ? `${b.def.name.toUpperCase()} - ENRAGED` : b.def.name.toUpperCase();
      if (sh.bossHp !== hp || sh.boss !== name) {
        this.bossBar.width = hp;
        this.bossBar.setFillStyle(b.enraged ? 0xe04a30 : 0xb02a24);
        this.bossName.setText(name);
        sh.bossHp = hp;
        sh.boss = name;
      }
    }

    const msg = w.messageTime > 0 ? w.message : '';
    if (sh.msg !== msg) {
      this.message.setText(msg);
      sh.msg = msg;
    }
    if (msg !== '') this.message.setAlpha(Math.min(1, w.messageTime * 2));

    const pulse = low ? 0.12 + 0.1 * Math.sin(this.t * 5) : 0;
    const vignette = Math.round(Math.min(0.6, w.hurtFlash * 0.45 + pulse) * 100);
    if (sh.vignette !== vignette) {
      this.vignette.setFillStyle(0x8a0000, vignette / 100);
      sh.vignette = vignette;
    }

    this.mini.clear();
    if (this.minimap) this.drawMinimap(w);
  }

  private drawMinimap(w: World): void {
    const s = 3;
    const x0 = SCREEN_W - w.map.width * s - 6;
    const y0 = 16;
    const g = this.mini;
    g.fillStyle(0x050706, 0.55);
    g.fillRect(x0 - 2, y0 - 2, w.map.width * s + 4, w.map.height * s + 4);
    for (let y = 0; y < w.map.height; y++) {
      for (let x = 0; x < w.map.width; x++) {
        const c = w.map.cells[y * w.map.width + x];
        if (c === 0) continue;
        g.fillStyle(c === CELL_EXIT ? 0xc4b040 : isDoorCell(c) ? 0x806b40 : 0x3f5549, 1);
        g.fillRect(x0 + x * s, y0 + y * s, s, s);
      }
    }
    const p = w.player;
    g.fillStyle(0xc4c4be, 1);
    g.fillRect(x0 + Math.floor(p.x * s) - 1, y0 + Math.floor(p.y * s) - 1, 3, 3);
    g.lineStyle(1, 0xc4c4be, 1);
    g.lineBetween(x0 + p.x * s, y0 + p.y * s, x0 + (p.x + Math.cos(p.angle) * 2) * s, y0 + (p.y + Math.sin(p.angle) * 2) * s);
  }

  destroy(): void {
    this.mini.clear();
  }
}
