import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { PadNav } from './pad';

interface MenuItem {
  label: string | (() => string);
  onSelect?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
}

interface MenuOpts {
  x: number;
  y: number;
  spacing?: number;
  fontSize?: number;
  align?: 'left' | 'center';
  onBack?: () => void;
  colors?: [string, string];
}

export class MenuList {
  index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private cursor: Phaser.GameObjects.Text;
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private pad: PadNav;
  private t = 0;
  private readonly spacing: number;
  private readonly colors: [string, string];
  enabled = true;

  constructor(scene: Phaser.Scene, private readonly items: MenuItem[], private readonly opts: MenuOpts) {
    this.spacing = opts.spacing ?? 16;
    this.colors = opts.colors ?? ['#c4c4be', '#56705f'];
    const size = `${opts.fontSize ?? 10}px`;
    const center = opts.align === 'center';
    items.forEach((_it, i) => {
      const t = scene.add
        .text(opts.x, opts.y + i * this.spacing, '', { fontFamily: 'monospace', fontSize: size, color: this.colors[1] })
        .setOrigin(center ? 0.5 : 0, 0)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => {
        if (this.enabled && this.index !== i) this.setIndex(i);
      });
      t.on('pointerdown', () => {
        if (!this.enabled) return;
        this.setIndex(i);
        this.accept();
      });
      this.texts.push(t);
    });
    this.cursor = scene.add.text(0, 0, '>', { fontFamily: 'monospace', fontSize: size, color: '#9a3a30' });
    this.keys = scene.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,S,A,D,ENTER,SPACE,ESC,BACKSPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.pad = new PadNav(scene);
    this.refresh();
  }

  setIndex(i: number): void {
    const n = this.items.length;
    this.index = (i + n) % n;
    sfx.menuMove();
    this.refresh();
  }

  refresh(): void {
    const center = this.opts.align === 'center';
    this.items.forEach((it, i) => {
      const t = this.texts[i];
      t.setText(typeof it.label === 'function' ? it.label() : it.label);
      t.setColor(i === this.index ? this.colors[0] : this.colors[1]);
    });
    const sel = this.texts[this.index];
    const cx = center ? sel.x - sel.width / 2 - 14 : sel.x - 12;
    this.cursor.setPosition(cx, sel.y);
  }

  private accept(): void {
    const it = this.items[this.index];
    if (!it.onSelect) return;
    sfx.menuAccept();
    it.onSelect();
  }

  private back(): void {
    if (!this.opts.onBack) return;
    sfx.menuBack();
    this.opts.onBack();
  }

  update(dt: number): void {
    if (!this.enabled) return;
    this.t += dt;
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    const p = this.pad.poll();
    if (JD(k.UP) || JD(k.W) || p.up) this.setIndex(this.index - 1);
    if (JD(k.DOWN) || JD(k.S) || p.down) this.setIndex(this.index + 1);
    const it = this.items[this.index];
    if (JD(k.LEFT) || JD(k.A) || p.left) {
      if (it.onLeft) {
        it.onLeft();
        sfx.menuMove();
        this.refresh();
      }
    }
    if (JD(k.RIGHT) || JD(k.D) || p.right) {
      if (it.onRight) {
        it.onRight();
        sfx.menuMove();
        this.refresh();
      }
    }
    if (JD(k.ENTER) || JD(k.SPACE) || p.a) {
      if (it.onSelect) this.accept();
      else if (it.onRight) {
        it.onRight();
        sfx.menuMove();
        this.refresh();
      }
    }
    if (JD(k.ESC) || JD(k.BACKSPACE) || p.b) this.back();
    this.cursor.setAlpha(Math.sin(this.t * 9) > -0.7 ? 1 : 0.25);
  }

  destroy(): void {
    for (const t of this.texts) t.destroy();
    this.cursor.destroy();
  }
}
