/** Modelo de inventario clásico (TS puro): ranuras limitadas; la munición no ocupa ranura. */

export const enum InvItem {
  Pistol = 0,
  Shotgun = 1,
  Tonic = 2,
  Key = 3,
}

export const INVENTORY_SLOTS = 8;
export const INVENTORY_COLS = 4;

export interface InvItemInfo {
  name: string;
  /** Verbo de la acción principal en el menú. */
  action: 'EQUIPAR' | 'USAR' | 'EXAMINAR';
  description: string;
  /** Un objeto clave no se consume ni se puede descartar. */
  key: boolean;
}

export const ITEM_INFO: Record<InvItem, InvItemInfo> = {
  [InvItem.Pistol]: {
    name: 'Pistola',
    action: 'EQUIPAR',
    description: 'Pistola semiautomática. Precisa y silenciosa para la casa, pero de poco daño. Ideal para ahorrar y para tiros lejanos.',
    key: false,
  },
  [InvItem.Shotgun]: {
    name: 'Escopeta',
    action: 'EQUIPAR',
    description: 'Escopeta de bombeo. Devastadora a corta distancia, casi inútil de lejos. Los cartuchos escasean.',
    key: false,
  },
  [InvItem.Tonic]: {
    name: 'Tónico',
    action: 'USAR',
    description: 'Frasco de tónico verde. Cura una cantidad fija de vida; no lo desperdicies con la vida llena.',
    key: false,
  },
  [InvItem.Key]: {
    name: 'Llave de latón',
    action: 'EXAMINAR',
    description: 'Una llave de latón pesada, con un símbolo grabado. Abre la puerta de salida de la casa.',
    key: true,
  },
};

/** Ranuras en cuadrícula. Cada objeto ocupa una ranura (los tónicos no se apilan). */
export class Inventory {
  readonly slots: (InvItem | null)[];

  constructor(readonly capacity = INVENTORY_SLOTS) {
    this.slots = new Array(capacity).fill(null);
  }

  get used(): number {
    return this.slots.filter((s) => s !== null).length;
  }

  get full(): boolean {
    return this.used >= this.capacity;
  }

  count(item: InvItem): number {
    return this.slots.filter((s) => s === item).length;
  }

  has(item: InvItem): boolean {
    return this.slots.includes(item);
  }

  /** Añade en la primera ranura libre. Devuelve false si no cabe. Las armas y la llave son únicas. */
  add(item: InvItem): boolean {
    if ((item !== InvItem.Tonic) && this.has(item)) return false;
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = item;
    return true;
  }

  /** Quita un objeto concreto (el primero de ese tipo). Devuelve true si estaba. */
  removeOne(item: InvItem): boolean {
    const i = this.slots.indexOf(item);
    if (i < 0) return false;
    this.slots[i] = null;
    return true;
  }
}
