import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { MenuList } from '../ui/menu';

/** Pausa (Esc / START). Congela la partida (la escena Game está pausada) y atenúa el audio. */
export class PauseScene extends Phaser.Scene {
  private menu!: MenuList;
  private title!: Phaser.GameObjects.Text;
  private confirming = false;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.confirming = false;
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x050706, 0.78).setOrigin(0, 0).setInteractive();
    this.title = this.add.text(SCREEN_W / 2, 34, 'PAUSA', { fontFamily: 'monospace', fontSize: '14px', color: '#9ab49c' }).setOrigin(0.5, 0);
    this.showMain();
    this.events.on('resume', () => {
      this.input.keyboard?.resetKeys();
      if (this.menu) this.menu.enabled = true;
    });
  }

  private showMain(): void {
    this.menu?.destroy();
    this.confirming = false;
    this.title.setText('PAUSA');
    this.menu = new MenuList(
      this,
      [
        { label: 'REANUDAR', onSelect: () => this.resume() },
        { label: 'CONTROLES', onSelect: () => this.openOverlay('Controls') },
        { label: 'OPCIONES', onSelect: () => this.openOverlay('Options') },
        { label: 'REINICIAR', onSelect: () => this.restart() },
        { label: 'VOLVER AL MENÚ PRINCIPAL', onSelect: () => this.showConfirm() },
      ],
      { x: SCREEN_W / 2, y: 70, spacing: 16, fontSize: 10, align: 'center', onBack: () => this.resume(), colors: ['#d8d4c4', '#6f8a78'] },
    );
  }

  private showConfirm(): void {
    this.menu.destroy();
    this.confirming = true;
    this.title.setText('¿ABANDONAR PARTIDA?');
    this.menu = new MenuList(
      this,
      [
        { label: 'NO, SEGUIR JUGANDO', onSelect: () => this.showMain() },
        { label: 'SÍ, VOLVER AL MENÚ', onSelect: () => this.toMenu() },
      ],
      { x: SCREEN_W / 2, y: 80, spacing: 18, fontSize: 10, align: 'center', onBack: () => this.showMain(), colors: ['#d8d4c4', '#6f8a78'] },
    );
  }

  update(_t: number, delta: number): void {
    this.menu.update(delta / 1000);
  }

  private resume(): void {
    this.scene.resume('Game');
    this.scene.stop();
  }

  private openOverlay(key: 'Controls' | 'Options'): void {
    this.menu.enabled = false;
    this.scene.launch(key, { from: 'Pause' });
    this.scene.pause();
  }

  private restart(): void {
    this.scene.stop('Game');
    this.scene.start('Game');
  }

  private toMenu(): void {
    this.scene.stop('Game');
    this.scene.start('Title');
  }

  get isConfirming(): boolean {
    return this.confirming;
  }
}
