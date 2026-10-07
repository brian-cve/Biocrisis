import Phaser from 'phaser';
import { audio } from '../audio/engine';
import { LoopHandle } from '../audio/engine';
import { music } from '../audio/music';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { MenuList } from '../ui/menu';
import { LOGO_KEY, buildLogo } from '../ui/logo';
import { TitleArt } from '../ui/titleArt';
import { fadeIn, fadeTo } from '../ui/transition';

/** Menú de título: casa en la tormenta dibujada por código, logo desgastado, lista vertical de opciones. */
export class TitleScene extends Phaser.Scene {
  private art!: TitleArt;
  private menu!: MenuList;
  private rain: LoopHandle | null = null;
  private credits!: Phaser.GameObjects.Container;
  private showingCredits = false;

  constructor() {
    super('Title');
  }

  create(): void {
    buildLogo(this.textures);
    this.art = new TitleArt(this);
    this.add.image(SCREEN_W / 2, 18, LOGO_KEY).setOrigin(0.5, 0);
    this.add
      .text(SCREEN_W / 2, 66, 'UN HOMENAJE AL HORROR DE SUPERVIVENCIA', { fontFamily: 'monospace', fontSize: '8px', color: '#56705f' })
      .setOrigin(0.5, 0);

    this.menu = new MenuList(
      this,
      [
        { label: 'NUEVA PARTIDA', onSelect: () => this.startGame() },
        { label: 'CONTROLES', onSelect: () => this.openOverlay('Controls') },
        { label: 'OPCIONES', onSelect: () => this.openOverlay('Options') },
        { label: 'CRÉDITOS', onSelect: () => this.toggleCredits(true) },
      ],
      { x: 40, y: 118, spacing: 15, fontSize: 10, colors: ['#d8d4c4', '#6f8a78'] },
    );
    this.add.text(6, SCREEN_H - 10, 'Arte y audio 100 % procedurales', { fontFamily: 'monospace', fontSize: '8px', color: '#3f5549' });

    const bg = this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x050706, 0.92).setOrigin(0, 0);
    const lines = this.add.text(SCREEN_W / 2, 50, 'BIOCRISIS\n\nDiseño, código, arte y sonido\ngenerados proceduralmente.\n\nHomenaje original al survival-horror\nclásico en primera persona.\nNo contiene material de terceros.\n\n[ Esc / clic para volver ]', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#9ab49c',
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5, 0);
    this.credits = this.add.container(0, 0, [bg, lines]).setVisible(false).setDepth(20);
    bg.setInteractive().on('pointerdown', () => this.toggleCredits(false));
    this.input.keyboard?.on('keydown-ESC', this.onEsc, this);

    this.events.on('resume', () => {
      this.menu.enabled = true;
      this.input.keyboard?.resetKeys();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.rain?.stop();
      this.rain = null;
      this.art.destroy();
      this.input.keyboard?.off('keydown-ESC', this.onEsc, this);
    });
    this.rain = audio.loopNoise({ filter: { type: 'highpass', freq: 2400, q: 0.4 }, gain: 0.07 });
    music.play('menu');
    fadeIn(this, 600);
  }

  private onEsc = (): void => {
    if (this.showingCredits) this.toggleCredits(false);
  };

  private toggleCredits(on: boolean): void {
    this.showingCredits = on;
    this.credits.setVisible(on);
    this.menu.enabled = !on;
  }

  private startGame(): void {
    this.menu.enabled = false;
    fadeTo(this, 'Intro', undefined, 500);
  }

  private openOverlay(key: 'Controls' | 'Options'): void {
    this.menu.enabled = false;
    this.scene.launch(key, { from: 'Title' });
    this.scene.pause();
  }

  update(_t: number, delta: number): void {
    const dt = delta / 1000;
    this.art.update(dt);
    this.menu.update(dt);
  }
}
