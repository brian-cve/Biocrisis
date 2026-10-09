
export const enum InvItem {
  Pistol = 0,
  Shotgun = 1,
  Tonic = 2,
  Key = 3,
  Smg = 4,
}

export const INVENTORY_SLOTS = 8;
export const INVENTORY_COLS = 4;

export interface InvItemInfo {
  name: string;
  action: 'EQUIPAR' | 'USAR' | 'EXAMINAR';
  description: string;
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
  [InvItem.Smg]: {
    name: 'Metralleta',
    action: 'EQUIPAR',
    description: 'Metralleta compacta de fuego automático. Mantén el disparo para barrer: gasta las balas de la pistola muy deprisa.',
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

  add(item: InvItem): boolean {
    if ((item !== InvItem.Tonic) && this.has(item)) return false;
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = item;
    return true;
  }

  removeOne(item: InvItem): boolean {
    const i = this.slots.indexOf(item);
    if (i < 0) return false;
    this.slots[i] = null;
    return true;
  }
}
