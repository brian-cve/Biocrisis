
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
  action: 'EQUIP' | 'USE' | 'EXAMINE';
  description: string;
  key: boolean;
}

export const ITEM_INFO: Record<InvItem, InvItemInfo> = {
  [InvItem.Pistol]: {
    name: 'Pistol',
    action: 'EQUIP',
    description: 'Semi-automatic pistol. Accurate and quiet, but low damage. Good for saving ammo and long shots.',
    key: false,
  },
  [InvItem.Shotgun]: {
    name: 'Shotgun',
    action: 'EQUIP',
    description: 'Pump-action shotgun. Devastating up close, nearly useless at range. Shells are scarce.',
    key: false,
  },
  [InvItem.Smg]: {
    name: 'Submachine gun',
    action: 'EQUIP',
    description: 'Compact automatic submachine gun. Hold fire to sweep: burns through pistol bullets very fast.',
    key: false,
  },
  [InvItem.Tonic]: {
    name: 'Tonic',
    action: 'USE',
    description: 'Bottle of green tonic. Heals a fixed amount of health; do not waste it at full health.',
    key: false,
  },
  [InvItem.Key]: {
    name: 'Brass key',
    action: 'EXAMINE',
    description: 'A heavy brass key with an engraved symbol. Opens the exit door of the house.',
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
