import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { InvItem } from '../game/inventory';
import { MAX_HP, World } from '../game/world';
import { CELL_EXIT, isDoorCell } from '../engine/raycast';
import { iconKey, registerIcons } from './icons';

const FONT = 'monospace';
const BAR_W = 70;

/** HUD del juego: vida, arma y munición, tónicos, llave, mensajes, mira y minimapa opcional. */
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
  private t = 0;
  minimap = false;

  constructor(scene: Phaser.Scene) {
    registerIcons(scene.textures);
    const y0 = SCREEN_H - 24;
    this.vignette = scene.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x8a0000, 0).setOrigin(0, 0).setDepth(5);
    scene.add.rectangle(0, y0, SCREEN_W, 24, 0x050706, 0.62).setOrigin(0, 0).setDepth(10);
    scene.add.text(6, y0 + 3, 'VIDA', { fontFamily: FONT, fontSize: '8px', color: '#56705f' }).setDepth(11);
    scene.add.rectangle(6, y0 + 13, BAR_W + 2, 7, 0x16201c).setOrigin(0, 0).setStrokeStyle(1, 0x2e4038).setDepth(11);
    this.hpBar = scene.add.rectangle(7, y0 + 14, BAR_W, 5, 0x56a05f).setOrigin(0, 0).setDepth(12);
    this.hpText = scene.add.text(6 + BAR_W + 6, y0 + 11, '', { fontFamily: FONT, fontSize: '8px', color: '#9ab49c' }).setDepth(11);
    this.hpLabel = scene.add.text(32, y0 + 3, '', { fontFamily: FONT, fontSize: '8px', color: '#7ac080' }).setDepth(11);
    this.tonicIcon = scene.add.image(122, y0 + 4, iconKey(InvItem.Tonic)).setOrigin(0, 0).setScale(0.6).setDepth(11);
    this.tonicText = scene.add.text(142, y0 + 10, '', { fontFamily: FONT, fontSize: '10px', color: '#9ab49c' }).setDepth(11);
    this.keyIcon = scene.add.image(168, y0 + 4, iconKey(InvItem.Key)).setOrigin(0, 0).setScale(0.6).setDepth(11).setVisible(false);
    this.weaponIcon = scene.add.image(SCREEN_W - 98, y0 + 2, iconKey(InvItem.Pistol)).setOrigin(0, 0).setScale(0.75).setDepth(11);
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
  }

  update(w: World, dt: number): void {
    this.t += dt;
    const frac = w.hp / MAX_HP;
    const low = w.hp <= 30 && !w.dead;
    this.hpBar.width = Math.max(0, Math.min(BAR_W, Math.round(BAR_W * frac)));
    const label = w.healthLabel;
    const color = label === 'Bien' ? 0x56a05f : label === 'Precaución' ? 0xc4b040 : 0xb02a24;
    this.hpBar.setFillStyle(color);
    // la barra y el texto parpadean con vida baja
    const blink = low && Math.sin(this.t * 10) < 0;
    this.hpBar.setAlpha(blink ? 0.25 : 1);
    this.hpLabel.setText(label.toUpperCase()).setColor(label === 'Bien' ? '#7ac080' : label === 'Precaución' ? '#c4b040' : '#d05048');
    this.hpLabel.setAlpha(blink ? 0.3 : 1);
    this.hpText.setText(String(w.hp));

    this.tonicText.setText(`x${w.tonics}`);
    this.tonicIcon.setAlpha(w.tonics > 0 ? 1 : 0.3);
    this.keyIcon.setVisible(w.hasKey);

    const wp = w.weapon;
    this.weaponIcon.setTexture(iconKey(w.equipped === 'pistol' ? InvItem.Pistol : InvItem.Shotgun));
    const reserve = wp.def.ammo === 'bullets' ? w.ammo.bullets : w.ammo.shells;
    this.ammoText.setText(wp.reloading ? '...' : `${wp.mag}`);
    this.ammoText.setColor(wp.mag === 0 && !wp.reloading ? '#d05048' : '#c4c4be');
    this.ammoSub.setText(`${wp.def.name}  /${reserve}`);

    this.message.setText(w.messageTime > 0 ? w.message : '');
    this.message.setAlpha(Math.min(1, w.messageTime * 2));

    // viñeta roja: golpe reciente + pulso con vida baja
    const pulse = low ? 0.12 + 0.1 * Math.sin(this.t * 5) : 0;
    this.vignette.setFillStyle(0x8a0000, Math.min(0.6, w.hurtFlash * 0.45 + pulse));

    this.mini.clear();
    if (this.minimap) this.drawMinimap(w);
  }

  private drawMinimap(w: World): void {
    const s = 3;
    const x0 = SCREEN_W - w.map.width * s - 6;
    const y0 = 6;
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
    // los objetos pertenecen a la escena y se destruyen con ella
    this.mini.clear();
  }
}
