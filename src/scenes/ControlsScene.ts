import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { CONTROLS, TOUCH_BUTTONS, TouchButton, actionsForKey, actionsForTouch, touchLabel } from '../game/controls';
import { settings } from '../game/settings';
import { PadNav } from '../ui/pad';

const FONT = 'monospace';
const C = { bg: 0x050706, edge: 0x2e4038, dim: '#56705f', text: '#9ab49c', bright: '#d8d4c4', warn: '#c4b040' };
const GROUP_COLOR = { move: 0x3f6b4c, combat: 0x7a2824, use: 0x806b40, none: 0x16201c } as const;

function groupOf(keyName: string): keyof typeof GROUP_COLOR {
  const acts = actionsForKey(keyName).map((b) => b.action);
  if (acts.length === 0) return 'none';
  if (acts.some((a) => ['fire', 'reload', 'weapon1', 'weapon2', 'cycleWeapon'].includes(a))) return 'combat';
  if (acts.some((a) => ['forward', 'back', 'turnLeft', 'turnRight', 'strafeLeft', 'strafeRight'].includes(a))) return 'move';
  return 'use';
}

interface Data {
  from?: string;
  /** Primera vez: se muestra antes de la partida y al cerrar entra al juego. */
  first?: boolean;
}

/**
 * Pantalla de controles (escritorio / móvil). Todo se genera a partir de `game/controls.ts`: si cambia un atajo,
 * el diagrama y la tabla cambian solos. Reutilizable desde el título, la pausa y antes de la primera partida.
 */
export class ControlsScene extends Phaser.Scene {
  private from = 'Title';
  private first = false;
  private tab = 0;
  private pages: Phaser.GameObjects.Container[] = [];
  private tabTexts: Phaser.GameObjects.Text[] = [];
  private underline!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pad!: PadNav;
  private closing = false;

  constructor() {
    super('Controls');
  }

  init(data: Data): void {
    this.from = data.from ?? 'Title';
    this.first = data.first === true;
    this.closing = false;
    this.pages = [];
    this.tabTexts = [];
    // al abrirla por primera vez se recuerda que ya se vio
    if (this.first) settings.update({ controlsSeen: true });
  }

  create(): void {
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, C.bg, 1).setOrigin(0, 0).setInteractive();
    this.add.text(10, 6, 'CONTROLES', { fontFamily: FONT, fontSize: '10px', color: C.text });
    const names = ['ESCRITORIO', 'MÓVIL'];
    names.forEach((n, i) => {
      const t = this.add.text(118 + i * 88, 6, n, { fontFamily: FONT, fontSize: '10px', color: C.dim }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.setTab(i));
      this.tabTexts.push(t);
    });
    this.underline = this.add.rectangle(118, 18, 70, 1, 0xc4c4be).setOrigin(0, 0);
    this.add.rectangle(10, 22, SCREEN_W - 20, 1, C.edge).setOrigin(0, 0);

    this.pages = [this.buildDesktop(), this.buildMobile()];

    // pie: objetivo, consejos y volver
    this.add.text(10, 175, 'OBJETIVO: encuentra la llave y escapa. La munición\nes escasa y los zombis oyen los disparos.', {
      fontFamily: FONT,
      fontSize: '8px',
      color: C.warn,
      lineSpacing: 2,
    });
    const back = this.add
      .text(SCREEN_W - 8, SCREEN_H - 12, this.first ? '[ENTER] CONTINUAR' : '[ESC] VOLVER', { fontFamily: FONT, fontSize: '10px', color: C.bright })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.close());

    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,TAB,ESC,ENTER,BACKSPACE,A,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.pad = new PadNav(this);
    // abre primero la página que corresponde al dispositivo detectado
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    this.setTab(coarse ? 1 : 0, true);
  }

  private setTab(i: number, silent = false): void {
    this.tab = i;
    this.pages.forEach((p, k) => p.setVisible(k === i));
    this.tabTexts.forEach((t, k) => t.setColor(k === i ? C.bright : C.dim));
    this.underline.setPosition(this.tabTexts[i].x, 18).setSize(this.tabTexts[i].width, 1);
    if (!silent) sfx.menuMove();
  }

  update(): void {
    const JD = Phaser.Input.Keyboard.JustDown;
    const k = this.keys;
    const p = this.pad.poll();
    if (JD(k.LEFT) || JD(k.A) || p.left || p.lb) this.setTab(0);
    if (JD(k.RIGHT) || JD(k.D) || p.right || p.rb) this.setTab(1);
    if (JD(k.TAB)) this.setTab(1 - this.tab);
    if (JD(k.ESC) || JD(k.BACKSPACE) || JD(k.ENTER) || p.b || p.a) this.close();
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    sfx.menuBack();
    if (this.first) {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
      return;
    }
    this.scene.resume(this.from);
    this.scene.stop();
  }

  // ---------- Escritorio ----------

  private buildDesktop(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    c.add(g);

    // teclado en miniatura con la distribución real; las teclas usadas se colorean por tipo de acción
    const rows: { y: number; x: number; keys: [string, string, number][] }[] = [
      { y: 28, x: 10, keys: [['ESC', 'Esc', 18], ['ONE', '1', 13], ['TWO', '2', 13]] },
      { y: 43, x: 10, keys: [['TAB', 'Tab', 20], ['Q', 'Q', 13], ['W', 'W', 13], ['E', 'E', 13], ['R', 'R', 13], ['T', 'T', 13], ['Y', 'Y', 13], ['U', 'U', 13], ['I', 'I', 13]] },
      { y: 58, x: 16, keys: [['A', 'A', 13], ['S', 'S', 13], ['D', 'D', 13], ['F', 'F', 13], ['G', 'G', 13], ['H', 'H', 13]] },
      { y: 73, x: 22, keys: [['SPACE', 'ESPACIO', 80]] },
    ];
    for (const r of rows) {
      let x = r.x;
      for (const [name, label, w] of r.keys) {
        this.drawKey(c, g, x, r.y, w, name, label);
        x += w + 2;
      }
    }
    // cursores (a la derecha de la barra espaciadora, sin tapar las filas de letras)
    const ax = 116;
    this.drawKey(c, g, ax + 15, 58, 13, 'UP', '↑');
    this.drawKey(c, g, ax, 73, 13, 'LEFT', '←');
    this.drawKey(c, g, ax + 15, 73, 13, 'DOWN', '↓');
    this.drawKey(c, g, ax + 30, 73, 13, 'RIGHT', '→');

    // leyenda de colores
    const legend: [number, string][] = [[GROUP_COLOR.move, 'mover'], [GROUP_COLOR.combat, 'combate'], [GROUP_COLOR.use, 'usar']];
    legend.forEach(([col, name], i) => {
      g.fillStyle(col, 1).fillRect(10 + i * 50, 93, 7, 7);
      c.add(this.add.text(20 + i * 50, 92, name, { fontFamily: FONT, fontSize: '8px', color: C.dim }));
    });

    // ratón
    g.lineStyle(1, 0x56705f, 1).strokeRoundedRect(12, 106, 20, 28, 8);
    g.fillStyle(GROUP_COLOR.combat, 1).fillRoundedRect(13, 107, 9, 11, { tl: 7, tr: 0, bl: 0, br: 0 });
    g.lineStyle(1, 0x56705f, 1).lineBetween(12, 119, 32, 119).lineBetween(22, 107, 22, 119);
    c.add(this.add.text(38, 106, 'Clic: disparar\nRueda: cambiar arma\nMover: girar (opcional)', { fontFamily: FONT, fontSize: '8px', color: C.text, lineSpacing: 2 }));
    // mando (derivado de la tabla)
    const padActions = ['fire', 'interact', 'reload', 'heal', 'cycleWeapon'];
    const pad = CONTROLS.filter((b) => padActions.includes(b.action) && b.pad).map((b) => `${b.pad}: ${b.label.split(' ')[0].toLowerCase()}`);
    c.add(this.add.text(10, 136, 'MANDO: stick mueve y gira · ' + pad.join(' · '), { fontFamily: FONT, fontSize: '8px', color: C.dim, wordWrap: { width: 152 }, lineSpacing: 1 }));

    // tabla de acciones (derivada de CONTROLS)
    const x0 = 172;
    CONTROLS.forEach((b, i) => {
      const y = 27 + i * 9.3;
      c.add(this.add.text(x0, y, b.label, { fontFamily: FONT, fontSize: '8px', color: C.dim }));
      c.add(this.add.text(SCREEN_W - 8, y, b.keyLabels.join(' / '), { fontFamily: FONT, fontSize: '8px', color: C.bright }).setOrigin(1, 0));
    });
    return c;
  }

  private drawKey(c: Phaser.GameObjects.Container, g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, name: string, label: string): void {
    const col = GROUP_COLOR[groupOf(name)];
    g.fillStyle(col, 1).fillRect(x, y, w, 13);
    g.lineStyle(1, 0x2e4038, 1).strokeRect(x + 0.5, y + 0.5, w - 1, 12);
    c.add(this.add.text(x + w / 2, y + 7, label, { fontFamily: FONT, fontSize: '8px', color: col === GROUP_COLOR.none ? '#3f5549' : '#e8e4d4' }).setOrigin(0.5, 0.5));
  }

  // ---------- Móvil ----------

  private buildMobile(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    c.add(g);
    const bx = 8;
    const by = 54;
    const bw = 160;
    const bh = 106;
    // cuerpo del mando (horizontal)
    g.fillStyle(0x16201c, 1).fillRoundedRect(bx, by, bw, bh, 10);
    g.lineStyle(1, 0x3f5549, 1).strokeRoundedRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 10);
    g.fillStyle(0x050706, 1).fillRect(bx + 50, by + 8, 60, 38); // pantalla
    g.lineStyle(1, 0x2e4038, 1).strokeRect(bx + 50.5, by + 8.5, 59, 37);
    // hombros
    const sh = { l: { x: bx + 4, y: by - 9 }, r: { x: bx + bw - 38, y: by - 9 } };
    g.fillStyle(0x3f5549, 1).fillRoundedRect(sh.l.x, sh.l.y, 34, 9, 3).fillRoundedRect(sh.r.x, sh.r.y, 34, 9, 3);
    // cruceta
    const dp = { x: bx + 28, y: by + 42 };
    g.fillStyle(0x050706, 1).fillRect(dp.x - 5, dp.y - 16, 10, 32).fillRect(dp.x - 16, dp.y - 5, 32, 10);
    // A y B
    const A = { x: bx + bw - 16, y: by + 30 };
    const B = { x: bx + bw - 40, y: by + 46 };
    g.fillStyle(GROUP_COLOR.combat, 1).fillCircle(A.x, A.y, 8);
    g.fillStyle(GROUP_COLOR.use, 1).fillCircle(B.x, B.y, 8);
    // SELECT / START
    const sel = { x: bx + 52, y: by + 78 };
    const sta = { x: bx + 108, y: by + 78 };
    g.fillStyle(0x3f5549, 1).fillRoundedRect(sel.x - 12, sel.y - 3, 24, 6, 3).fillRoundedRect(sta.x - 12, sta.y - 3, 24, 6, 3);

    // rótulos: letra del botón + acción, todos derivados de la tabla de controles
    const txt = (x: number, y: number, s: string, color: string, ox = 0.5, oy = 0.5) =>
      c.add(this.add.text(x, y, s, { fontFamily: FONT, fontSize: '8px', color, align: 'center', lineSpacing: 1 }).setOrigin(ox, oy));
    const wrap = (s: string) => s.replace(' / ', '\n/ ');
    txt(A.x, A.y, 'A', '#050706');
    txt(B.x, B.y, 'B', '#050706');
    txt(sh.l.x + 17, sh.l.y + 4.5, 'L', '#050706');
    txt(sh.r.x + 17, sh.r.y + 4.5, 'R', '#050706');
    txt(sh.l.x, sh.l.y - 6, touchLabel('L'), C.bright, 0, 0.5);
    txt(sh.r.x + 34, sh.r.y - 6, touchLabel('R'), C.bright, 1, 0.5);
    txt(A.x, A.y - 16, touchLabel('A'), C.bright);
    txt(B.x, B.y + 20, wrap(touchLabel('B')), C.bright);
    txt(sel.x, sel.y + 9, 'SELECT\n' + touchLabel('SELECT'), C.bright, 0.5, 0);
    txt(sta.x, sta.y + 9, 'START\n' + touchLabel('START'), C.bright, 0.5, 0);
    txt(dp.x, dp.y + 21, 'D-PAD', C.dim);
    txt(bx + 80, by + 27, 'HORIZONTAL', '#3f5549');
    txt(10, 165, 'Orientación recomendada: HORIZONTAL', C.dim, 0, 0);

    // lista derivada de la tabla (una fila por botón)
    const x0 = 176;
    let y = 27;
    const dpad = (['up', 'down', 'left', 'right'] as TouchButton[]).map((b) => actionsForTouch(b)[0]?.label ?? '');
    const rows: [string, string][] = [['D-PAD', dpad.join(' / ')]];
    for (const b of TOUCH_BUTTONS) {
      if (['up', 'down', 'left', 'right'].includes(b)) continue;
      rows.push([b, actionsForTouch(b).map((a) => a.label).join(' / ')]);
    }
    for (const [btn, acts] of rows) {
      c.add(this.add.text(x0, y, btn, { fontFamily: FONT, fontSize: '8px', color: C.warn }));
      const t = this.add.text(x0 + 46, y, acts, { fontFamily: FONT, fontSize: '8px', color: C.text, wordWrap: { width: SCREEN_W - x0 - 54 } });
      c.add(t);
      y += Math.max(12, t.height + 4);
    }
    return c;
  }
}

