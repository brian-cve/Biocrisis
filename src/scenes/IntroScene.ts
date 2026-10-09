import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { settings } from '../game/settings';
import { fadeIn } from '../ui/transition';
import { touchState } from '../ui/touchState';

const LINES = [
  'A stormy night.\nAn abandoned house.',
  'You lost your way.\nThere is only one exit.',
  'Find the key.\nOpen the door.',
  'Stay quiet.\nEvery bullet counts.',
];
const LINE_MS = 1900;

export class IntroScene extends Phaser.Scene {
  private text!: Phaser.GameObjects.Text;
  private skipped = false;
  private touchBase = 0;

  constructor() {
    super('Intro');
  }

  create(): void {
    this.skipped = false;
    this.touchBase = touchState.total;
    this.cameras.main.setBackgroundColor(0x000000);
    this.text = this.add.text(SCREEN_W / 2, SCREEN_H / 2 - 10, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9ab49c', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0.5).setAlpha(0);
    this.add.text(SCREEN_W - 6, SCREEN_H - 12, 'press to skip', { fontFamily: 'monospace', fontSize: '8px', color: '#3f5549' }).setOrigin(1, 0);

    LINES.forEach((line, i) => {
      this.time.delayedCall(i * LINE_MS, () => {
        this.text.setText(line);
        this.tweens.add({ targets: this.text, alpha: { from: 0, to: 1 }, duration: 450, yoyo: false });
        this.tweens.add({ targets: this.text, alpha: 0, delay: LINE_MS - 550, duration: 450 });
      });
    });
    this.time.delayedCall(LINES.length * LINE_MS, () => this.next());

    this.input.once('pointerdown', () => this.next());
    this.input.keyboard?.once('keydown', () => this.next());
    this.input.gamepad?.once('down', () => this.next());
    fadeIn(this, 400);
  }

  update(): void {
    if (touchState.total !== this.touchBase) this.next();
  }

  private next(): void {
    if (this.skipped) return;
    this.skipped = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!settings.value.controlsSeen) this.scene.start('Controls', { first: true });
      else this.scene.start('Game');
    });
  }
}
