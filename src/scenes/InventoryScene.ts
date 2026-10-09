import Phaser from 'phaser';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { INVENTORY_COLS, INVENTORY_SLOTS, ITEM_INFO, InvItem } from '../game/inventory';
import { MAX_HP, TONIC_HEAL, World } from '../game/world';
import { iconKey, registerIcons } from '../ui/icons';
import { PadNav } from '../ui/pad';

const SLOT = 36;
const GAP = 4;
const GX = 10;
const GY = 34;
const FONT = 'monospace';

const COL_BG = 0x050706;
const COL_SLOT = 0x16201c;
const COL_EDGE = 0x2e4038;
const COL_SEL = 0x9ab49c;
const COL_TEXT = '#9ab49c';
const COL_DIM = '#56705f';

interface InvData {
  world: World;
}

export class InventoryScene extends Phaser.Scene {
  private world!: World;
  private cursor = 0;
  private status = '';
  private slotBg: Phaser.GameObjects.Rectangle[] = [];
  private slotIcon: Phaser.GameObjects.Image[] = [];
  private slotTag: Phaser.GameObjects.Text[] = [];
  private cursorBox!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private actionText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpLabel!: Phaser.GameObjects.Text;
  private tonicText!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pad!: PadNav;

  constructor() {
    super('Inventory');
  }

  init(data: InvData): void {
    this.world = data.world;
    this.cursor = 0;
    this.status = '';
    this.slotBg = [];
    this.slotIcon = [];
    this.slotTag = [];
    this.pad = new PadNav(this);
  }

  create(): void {
    registerIcons(this.textures);
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, COL_BG, 0.94).setOrigin(0, 0).setInteractive();
    this.add.text(10, 8, 'INVENTARIO', { fontFamily: FONT, fontSize: '12px', color: COL_TEXT });
    this.add.rectangle(10, 24, SCREEN_W - 20, 1, COL_EDGE).setOrigin(0, 0);

    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const x = GX + (i % INVENTORY_COLS) * (SLOT + GAP);
      const y = GY + Math.floor(i / INVENTORY_COLS) * (SLOT + GAP);
      const bg = this.add.rectangle(x, y, SLOT, SLOT, COL_SLOT).setOrigin(0, 0).setStrokeStyle(1, COL_EDGE).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onSlotTap(i));
      this.slotBg.push(bg);
      this.slotIcon.push(this.add.image(x + SLOT / 2, y + SLOT / 2, iconKey(InvItem.Key)).setVisible(false));
      this.slotTag.push(this.add.text(x + 2, y + 1, '', { fontFamily: FONT, fontSize: '8px', color: '#c4b040' }));
    }
    this.cursorBox = this.add.rectangle(0, 0, SLOT + 4, SLOT + 4).setOrigin(0, 0).setStrokeStyle(2, COL_SEL);

    const rx = 182;
    this.nameText = this.add.text(rx, 34, '', { fontFamily: FONT, fontSize: '10px', color: '#c4c4be' });
    this.actionText = this.add.text(rx, 48, '', { fontFamily: FONT, fontSize: '8px', color: '#c4b040' });
    this.descText = this.add.text(rx, 62, '', { fontFamily: FONT, fontSize: '8px', color: COL_TEXT, wordWrap: { width: SCREEN_W - rx - 10 }, lineSpacing: 2 });
    this.ammoText = this.add.text(rx, 132, '', { fontFamily: FONT, fontSize: '8px', color: COL_TEXT });

    this.add.text(GX, 124, 'SALUD', { fontFamily: FONT, fontSize: '8px', color: COL_DIM });
    this.add.rectangle(GX, 135, 156, 8, COL_SLOT).setOrigin(0, 0).setStrokeStyle(1, COL_EDGE);
    this.hpBar = this.add.rectangle(GX + 1, 136, 154, 6, 0x3f5549).setOrigin(0, 0);
    this.hpLabel = this.add.text(GX, 146, '', { fontFamily: FONT, fontSize: '10px', color: COL_TEXT });
    this.tonicText = this.add.text(GX + 90, 148, '', { fontFamily: FONT, fontSize: '8px', color: COL_DIM });

    this.statusText = this.add.text(GX, 168, '', { fontFamily: FONT, fontSize: '8px', color: '#c4b040', wordWrap: { width: SCREEN_W - 20 } });
    this.add.text(GX, SCREEN_H - 12, '←↑↓→ mover   ENTER usar   ESC cerrar', { fontFamily: FONT, fontSize: '8px', color: COL_DIM });
    const close = this.add.text(SCREEN_W - 10, SCREEN_H - 12, '[CERRAR]', { fontFamily: FONT, fontSize: '8px', color: COL_TEXT }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.close());

    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,ENTER,SPACE,F,ESC,I,TAB,BACKSPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.refresh();
  }

  update(): void {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(k.LEFT) || JD(k.A)) this.move(-1, 0);
    if (JD(k.RIGHT) || JD(k.D)) this.move(1, 0);
    if (JD(k.UP) || JD(k.W)) this.move(0, -1);
    if (JD(k.DOWN) || JD(k.S)) this.move(0, 1);
    if (JD(k.ENTER) || JD(k.SPACE) || JD(k.F)) this.activate();
    if (JD(k.ESC) || JD(k.I) || JD(k.TAB) || JD(k.BACKSPACE)) this.close();
    this.pollGamepad();
    this.cursorBox.setAlpha(0.65 + 0.35 * Math.sin(this.time.now / 140));
  }

  private pollGamepad(): void {
    const p = this.pad.poll();
    if (p.left) this.move(-1, 0);
    if (p.right) this.move(1, 0);
    if (p.up) this.move(0, -1);
    if (p.down) this.move(0, 1);
    if (p.a) this.activate();
    if (p.b || p.select || p.start) this.close();
  }

  private move(dx: number, dy: number): void {
    const cols = INVENTORY_COLS;
    const rows = INVENTORY_SLOTS / cols;
    let c = this.cursor % cols;
    let r = Math.floor(this.cursor / cols);
    c = (c + dx + cols) % cols;
    r = (r + dy + rows) % rows;
    this.cursor = r * cols + c;
    this.status = '';
    this.refresh();
  }

  private onSlotTap(i: number): void {
    if (i === this.cursor) this.activate();
    else {
      this.cursor = i;
      this.status = '';
      this.refresh();
    }
  }

  private activate(): void {
    const item = this.world.inventory.slots[this.cursor];
    if (item === null) return;
    const w = this.world;
    switch (item) {
      case InvItem.Pistol:
      case InvItem.Shotgun:
      case InvItem.Smg: {
        const id = item === InvItem.Pistol ? 'pistol' : item === InvItem.Shotgun ? 'shotgun' : 'smg';
        if (w.equipped === id) this.status = `${ITEM_INFO[item].name} ya equipada`;
        else this.status = w.switchTo(id) ? `${ITEM_INFO[item].name} equipada` : 'No se puede equipar ahora';
        break;
      }
      case InvItem.Tonic: {
        const r = w.useTonic(true);
        this.status = r === 'healed' ? `Te sientes mejor (+${TONIC_HEAL})` : r === 'full' ? 'Vida llena: el tónico no se gasta' : 'No se puede usar ahora';
        break;
      }
      case InvItem.Key:
        this.status = 'Pesa más de lo que parece. Seguro que abre la puerta de salida.';
        break;
    }
    this.refresh();
  }

  private close(): void {
    this.scene.resume('Game');
    this.scene.stop();
  }

  private refresh(): void {
    const w = this.world;
    const inv = w.inventory;
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const item = inv.slots[i];
      const icon = this.slotIcon[i];
      if (item === null) {
        icon.setVisible(false);
        this.slotTag[i].setText('');
      } else {
        icon.setTexture(iconKey(item)).setVisible(true);
        const equipped = (item === InvItem.Pistol && w.equipped === 'pistol') || (item === InvItem.Shotgun && w.equipped === 'shotgun') || (item === InvItem.Smg && w.equipped === 'smg');
        this.slotTag[i].setText(equipped ? 'E' : '');
      }
    }
    const x = GX + (this.cursor % INVENTORY_COLS) * (SLOT + GAP) - 2;
    const y = GY + Math.floor(this.cursor / INVENTORY_COLS) * (SLOT + GAP) - 2;
    this.cursorBox.setPosition(x, y);

    const sel = inv.slots[this.cursor];
    if (sel === null) {
      this.nameText.setText('Ranura vacía');
      this.actionText.setText('');
      this.descText.setText('');
      this.ammoText.setText('');
    } else {
      const info = ITEM_INFO[sel];
      this.nameText.setText(info.name);
      this.actionText.setText(`[ENTER] ${info.action}`);
      this.descText.setText(info.description);
      if (sel === InvItem.Pistol) this.ammoText.setText(`Cargador ${w.weapons.pistol.mag}/${w.weapons.pistol.def.magSize}\nBalas ${w.ammo.bullets}${w.equipped === 'pistol' ? '\nEQUIPADA' : ''}`);
      else if (sel === InvItem.Shotgun) this.ammoText.setText(`Cargador ${w.weapons.shotgun.mag}/${w.weapons.shotgun.def.magSize}\nCartuchos ${w.ammo.shells}${w.equipped === 'shotgun' ? '\nEQUIPADA' : ''}`);
      else if (sel === InvItem.Smg) this.ammoText.setText(`Cargador ${w.weapons.smg.mag}/${w.weapons.smg.def.magSize}\nBalas ${w.ammo.bullets}${w.equipped === 'smg' ? '\nEQUIPADA' : ''}`);
      else if (sel === InvItem.Tonic) this.ammoText.setText(`Unidades: ${inv.count(InvItem.Tonic)}`);
      else this.ammoText.setText('Objeto clave');
    }

    const frac = w.hp / MAX_HP;
    this.hpBar.width = Math.max(0, Math.round(154 * frac));
    const label = w.healthLabel;
    const color = label === 'Bien' ? 0x56a05f : label === 'Precaución' ? 0xc4b040 : 0xb02a24;
    this.hpBar.setFillStyle(color);
    this.hpLabel.setText(label.toUpperCase()).setColor(label === 'Bien' ? '#7ac080' : label === 'Precaución' ? '#c4b040' : '#d05048');
    this.tonicText.setText(`${w.hp}/${MAX_HP}`);
    this.statusText.setText(this.status);
  }
}
