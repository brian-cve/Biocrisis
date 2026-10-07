import { CELL_EXIT, GridMap, cellAt, isDoorCell } from '../engine/raycast';

export const DOOR_SPEED = 1.8; // aperturas completas por segundo
/** La puerta de salida es pesada: tarda ~1 s en ser transitable, el tiempo justo para que se acerque un zombi. */
export const EXIT_DOOR_SPEED = 0.8;

export interface Door {
  x: number;
  y: number;
  locked: boolean;
  /** Puerta de salida (más lenta). */
  exit: boolean;
  open: number;
  target: 0 | 1;
}

export type DoorUse = 'opened' | 'closed' | 'locked' | 'blocked' | 'none';

/** Puertas de una partida: animación deslizante y estado compartido con el mapa (`doorOpen`). */
export class Doors {
  readonly list: Door[] = [];
  /** Se llama en cada uso (también de zombis): para sonido y efectos. */
  onUse: ((d: Door, r: DoorUse) => void) | null = null;
  private readonly byCell: Map<number, Door> = new Map();

  constructor(private readonly map: GridMap) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const c = cellAt(map, x, y);
        if (!isDoorCell(c)) continue;
        const d: Door = { x, y, locked: c === CELL_EXIT, exit: c === CELL_EXIT, open: 0, target: 0 };
        this.list.push(d);
        this.byCell.set(y * map.width + x, d);
      }
    }
  }

  at(cx: number, cy: number): Door | undefined {
    return this.byCell.get(cy * this.map.width + cx);
  }

  unlock(cx: number, cy: number): void {
    const d = this.at(cx, cy);
    if (d) d.locked = false;
  }

  /** Abre/cierra la puerta. No cierra si algo ocupa la celda (`occupied`). */
  use(cx: number, cy: number, occupied?: (cx: number, cy: number) => boolean): DoorUse {
    const d = this.at(cx, cy);
    if (!d) return 'none';
    let r: DoorUse;
    if (d.locked) r = 'locked';
    else if (d.target === 1) {
      if (occupied?.(cx, cy)) r = 'blocked';
      else {
        d.target = 0;
        r = 'closed';
      }
    } else {
      d.target = 1;
      r = 'opened';
    }
    this.onUse?.(d, r);
    return r;
  }

  update(dt: number): void {
    const arr = this.map.doorOpen!;
    for (const d of this.list) {
      if (d.open === d.target) continue;
      const step = (d.exit ? EXIT_DOOR_SPEED : DOOR_SPEED) * dt;
      d.open = d.target === 1 ? Math.min(1, d.open + step) : Math.max(0, d.open - step);
      arr[d.y * this.map.width + d.x] = d.open;
    }
  }

  /** Busca una puerta frente a (x,y) en la dirección (dx,dy) hasta `reach` celdas. */
  ahead(x: number, y: number, dx: number, dy: number, reach = 1.4): Door | undefined {
    for (let t = 0.3; t <= reach; t += 0.1) {
      const d = this.at(Math.floor(x + dx * t), Math.floor(y + dy * t));
      if (d) return d;
    }
    return undefined;
  }
}
