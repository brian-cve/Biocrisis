import Phaser from 'phaser';
import { audio } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { registerIcons } from '../ui/icons';
import { buildLogo } from '../ui/logo';
import { touchUI } from '../ui/touchUI';
import { fadeTo } from '../ui/transition';

export class BootScene extends Phaser.Scene {
  private done = false;

  constructor() {
    super('Boot');
  }

  create(): void {
    this.done = false;
    touchUI.setSuspended(true);
    registerIcons(this.textures);
    buildLogo(this.textures);
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x000000).setOrigin(0, 0);
    this.add.image(SCREEN_W / 2, 70, 'logo').setOrigin(0.5, 0.5).setAlpha(0.9);
    const hint = this.add
      .text(SCREEN_W / 2, 140, 'PRESS ANY KEY OR TAP THE SCREEN', { fontFamily: 'monospace', fontSize: '10px', color: '#7a937c' })
      .setOrigin(0.5, 0.5);
    this.add.text(SCREEN_W / 2, 182, 'This game uses sound', { fontFamily: 'monospace', fontSize: '8px', color: '#3f5549' }).setOrigin(0.5, 0);
    this.tweens.add({ targets: hint, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });

    const go = () => {
      if (this.done) return;
      this.done = true;
      audio.unlock();
      touchUI.setSuspended(false);
      sfx.menuAccept();
      fadeTo(this, 'Title', undefined, 450);
    };
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
    this.input.gamepad?.once('down', go);
  }
}
