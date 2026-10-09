import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { SCREEN_H, SCREEN_W } from '../engine/renderer';
import { settings } from '../game/settings';
import { MenuList } from '../ui/menu';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const yn = (v: boolean) => (v ? 'SÍ' : 'NO');

export class OptionsScene extends Phaser.Scene {
  private from = 'Title';
  private menu!: MenuList;

  constructor() {
    super('Options');
  }

  init(data: { from?: string }): void {
    this.from = data.from ?? 'Title';
  }

  create(): void {
    this.add.rectangle(0, 0, SCREEN_W, SCREEN_H, 0x050706, 1).setOrigin(0, 0).setInteractive();
    this.add.text(SCREEN_W / 2, 12, 'OPCIONES', { fontFamily: 'monospace', fontSize: '12px', color: '#9ab49c' }).setOrigin(0.5, 0);
    const step = (key: 'musicVolume' | 'sfxVolume', d: number, test = false) => {
      settings.update({ [key]: Math.round((settings.value[key] + d) * 10) / 10 });
      if (test) sfx.pickup();
    };
    const sens = (d: number) => settings.update({ sensitivity: Math.round((settings.value.sensitivity + d) * 10) / 10 });
    const toggle = (key: 'muted' | 'aimAssist' | 'mouseLook' | 'minimap') => settings.update({ [key]: !settings.value[key] });
    const modes = ['auto', 'on', 'off'] as const;
    const cycleTouch = (d: number) => settings.update({ touchControls: modes[(modes.indexOf(settings.value.touchControls) + d + 3) % 3] });
    const row = (name: string, value: () => string) => () => `${name.padEnd(20, ' ')} ${value()}`;

    this.menu = new MenuList(
      this,
      [
        { label: row('MÚSICA', () => `◀ ${pct(settings.value.musicVolume)} ▶`), onLeft: () => step('musicVolume', -0.1), onRight: () => step('musicVolume', 0.1) },
        { label: row('EFECTOS', () => `◀ ${pct(settings.value.sfxVolume)} ▶`), onLeft: () => step('sfxVolume', -0.1, true), onRight: () => step('sfxVolume', 0.1, true) },
        { label: row('SILENCIAR TODO', () => yn(settings.value.muted)), onSelect: () => toggle('muted'), onLeft: () => toggle('muted'), onRight: () => toggle('muted') },
        { label: row('SENSIBILIDAD GIRO', () => `◀ ${settings.value.sensitivity.toFixed(1)} ▶`), onLeft: () => sens(-0.1), onRight: () => sens(0.1) },
        { label: row('AYUDA DE PUNTERÍA', () => yn(settings.value.aimAssist)), onSelect: () => toggle('aimAssist'), onLeft: () => toggle('aimAssist'), onRight: () => toggle('aimAssist') },
        { label: row('GIRO CON RATÓN', () => yn(settings.value.mouseLook)), onSelect: () => toggle('mouseLook'), onLeft: () => toggle('mouseLook'), onRight: () => toggle('mouseLook') },
        { label: row('MINIMAPA', () => yn(settings.value.minimap)), onSelect: () => toggle('minimap'), onLeft: () => toggle('minimap'), onRight: () => toggle('minimap') },
        { label: row('CONTROLES TÁCTILES', () => ({ auto: 'AUTO', on: 'SÍ', off: 'NO' }[settings.value.touchControls])), onSelect: () => cycleTouch(1), onLeft: () => cycleTouch(-1), onRight: () => cycleTouch(1) },
        { label: 'VOLVER', onSelect: () => this.close() },
      ],
      { x: 30, y: 34, spacing: 14, fontSize: 10, onBack: () => this.close() },
    );
    this.add.text(SCREEN_W / 2, SCREEN_H - 12, '← → ajustar   ESC volver', { fontFamily: 'monospace', fontSize: '8px', color: '#3f5549' }).setOrigin(0.5, 0);
  }

  update(_t: number, delta: number): void {
    this.menu.update(delta / 1000);
  }

  private close(): void {
    this.scene.resume(this.from);
    this.scene.stop();
  }
}
