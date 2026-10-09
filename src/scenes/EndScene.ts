import Phaser from 'phaser';
import { music } from '../audio/music';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { RunStats, formatTime, rank } from '../game/rank';
import { MenuList } from '../ui/menu';
import { fadeIn, fadeTo } from '../ui/transition';

abstract class EndScene extends Phaser.Scene {
  protected stats!: RunStats;
  private menu!: MenuList;
  private flicker?: Phaser.GameObjects.Text;

  protected abstract readonly victory: boolean;

  init(data: RunStats): void {
    this.stats = data;
  }

  create(): void {
    const win = this.victory;
    this.cameras.main.setBackgroundColor(win ? 0x0a110e : 0x0c0404);
    const g = this.add.graphics();
    for (let y = 0; y < SCREEN_H; y += 4) {
      const t = y / SCREEN_H;
      const col = win ? Phaser.Display.Color.GetColor(10 + t * 18, 17 + t * 30, 14 + t * 26) : Phaser.Display.Color.GetColor(12 + t * 40, 4 + t * 6, 4 + t * 6);
      g.fillStyle(col, 1).fillRect(0, y, SCREEN_W, 4);
    }
    const title = this.add
      .text(SCREEN_W / 2, 14, win ? 'YOU ESCAPED' : 'YOU DIED', { fontFamily: 'monospace', fontSize: '22px', color: win ? '#9ab49c' : '#9a3a30', stroke: '#050706', strokeThickness: 4 })
      .setOrigin(0.5, 0);
    if (!win) this.flicker = title;
    this.add.text(SCREEN_W / 2, 44, win ? 'The door closes behind you. Dawn breaks.' : 'The house keeps one more body.', { fontFamily: 'monospace', fontSize: '8px', color: '#56705f' }).setOrigin(0.5, 0);

    const s = this.stats;
    const acc = s.shots > 0 ? Math.round((s.hits / s.shots) * 100) : 0;
    const rows: [string, string][] = [
      ['TIME', formatTime(s.seconds)],
      ['BULLETS USED', String(s.shots)],
      ['ACCURACY', `${acc}%`],
      ['ZOMBIES KILLED', `${s.kills} / ${s.zombies}`],
      ['TONICS USED', String(s.tonicsUsed)],
    ];
    rows.forEach(([k, v], i) => {
      this.add.text(70, 62 + i * 12, k, { fontFamily: 'monospace', fontSize: '10px', color: '#6f8a78' });
      this.add.text(SCREEN_W - 70, 62 + i * 12, v, { fontFamily: 'monospace', fontSize: '10px', color: '#d8d4c4' }).setOrigin(1, 0);
    });
    if (win) {
      const r = rank(s);
      this.add.text(SCREEN_W / 2, 126, `RANK ${r}`, { fontFamily: 'monospace', fontSize: '16px', color: r === 'A' ? '#c4b040' : r === 'B' ? '#9ab49c' : '#7a2824', stroke: '#050706', strokeThickness: 3 }).setOrigin(0.5, 0);
    }

    this.menu = new MenuList(
      this,
      win
        ? [
            { label: 'PLAY AGAIN', onSelect: () => this.go('Game') },
            { label: 'MAIN MENU', onSelect: () => this.go('Title') },
          ]
        : [
            { label: 'RETRY', onSelect: () => this.go('Game') },
            { label: 'MAIN MENU', onSelect: () => this.go('Title') },
          ],
      { x: SCREEN_W / 2, y: win ? 154 : 140, spacing: 16, fontSize: 10, align: 'center', colors: ['#d8d4c4', '#6f8a78'] },
    );
    music.sting(win ? 'win' : 'gameover');
    fadeIn(this, 700);
  }

  private go(key: 'Game' | 'Title'): void {
    this.menu.enabled = false;
    fadeTo(this, key, undefined, 350);
  }

  update(t: number, delta: number): void {
    this.menu.update(delta / 1000);
    if (this.flicker) this.flicker.setAlpha(Math.sin(t / 90) > -0.8 ? 1 : 0.5);
  }
}

export class GameOverScene extends EndScene {
  protected readonly victory = false;
  constructor() {
    super('GameOver');
  }
}

export class WinScene extends EndScene {
  protected readonly victory = true;
  constructor() {
    super('Win');
  }
}
