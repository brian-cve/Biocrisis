import Phaser from 'phaser';
import { touchState } from './touchState';

export interface PadEdges {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  start: boolean;
  select: boolean;
  lb: boolean;
  rb: boolean;
}

/** Detecta flancos (pulsaciones nuevas) del primer gamepad, para navegar menús. */
export class PadNav {
  private prev: Record<string, boolean> = {};
  private seen = touchState.snapshot();

  constructor(private readonly scene: Phaser.Scene) {}

  /** Flancos del primer gamepad y del mando táctil Game Boy (mismos botones en los menús del móvil). */
  poll(): PadEdges {
    const t = touchState.presses;
    const tEdge = (b: keyof typeof t) => {
      const e = t[b] !== this.seen[b];
      this.seen[b] = t[b];
      return e;
    };
    const tp = {
      up: tEdge('up'),
      down: tEdge('down'),
      left: tEdge('left'),
      right: tEdge('right'),
      a: tEdge('A'),
      b: tEdge('B'),
      start: tEdge('START'),
      select: tEdge('SELECT'),
      lb: tEdge('L'),
      rb: tEdge('R'),
    };
    const pad = this.scene.input.gamepad?.pad1;
    if (!pad) return tp;
    const ax = pad.axes.length > 1 ? pad.axes[0].getValue() : 0;
    const ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
    const edge = (name: string, down: boolean): boolean => {
      const was = this.prev[name] === true;
      this.prev[name] = down;
      return down && !was;
    };
    const btn = (i: number) => pad.buttons[i]?.pressed === true;
    return {
      up: edge('up', pad.up || ay < -0.6) || tp.up,
      down: edge('down', pad.down || ay > 0.6) || tp.down,
      left: edge('left', pad.left || ax < -0.6) || tp.left,
      right: edge('right', pad.right || ax > 0.6) || tp.right,
      a: edge('a', btn(0)) || tp.a,
      b: edge('b', btn(1)) || tp.b,
      start: edge('start', btn(9)) || tp.start,
      select: edge('select', btn(8)) || tp.select,
      lb: edge('lb', btn(4)) || tp.lb,
      rb: edge('rb', btn(5)) || tp.rb,
    };
  }
}
