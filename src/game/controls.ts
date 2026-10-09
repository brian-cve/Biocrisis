
export type Action =
  | 'forward'
  | 'back'
  | 'turnLeft'
  | 'turnRight'
  | 'strafeLeft'
  | 'strafeRight'
  | 'fire'
  | 'reload'
  | 'interact'
  | 'weapon1'
  | 'weapon2'
  | 'weapon3'
  | 'cycleWeapon'
  | 'heal'
  | 'inventory'
  | 'pause';

export type TouchButton = 'up' | 'down' | 'left' | 'right' | 'A' | 'B' | 'START' | 'SELECT' | 'L' | 'R';
export const TOUCH_BUTTONS: readonly TouchButton[] = ['up', 'down', 'left', 'right', 'A', 'B', 'START', 'SELECT', 'L', 'R'];

export interface Binding {
  action: Action;
  label: string;
  keys: string[];
  keyLabels: string[];
  pad: string | null;
  padButton: number | null;
  touch: TouchButton | null;
  touchShared?: boolean;
}

export const CONTROLS: readonly Binding[] = [
  { action: 'forward', label: 'Avanzar', keys: ['W', 'UP'], keyLabels: ['W', '↑'], pad: 'Stick ↑', padButton: 12, touch: 'up' },
  { action: 'back', label: 'Retroceder', keys: ['S', 'DOWN'], keyLabels: ['S', '↓'], pad: 'Stick ↓', padButton: 13, touch: 'down' },
  { action: 'turnLeft', label: 'Girar izquierda', keys: ['A', 'LEFT'], keyLabels: ['A', '←'], pad: 'Stick ←', padButton: 14, touch: 'left' },
  { action: 'turnRight', label: 'Girar derecha', keys: ['D', 'RIGHT'], keyLabels: ['D', '→'], pad: 'Stick →', padButton: 15, touch: 'right' },
  { action: 'strafeLeft', label: 'Strafe izquierda', keys: ['Q'], keyLabels: ['Q'], pad: null, padButton: null, touch: null },
  { action: 'strafeRight', label: 'Strafe derecha', keys: ['E'], keyLabels: ['E'], pad: null, padButton: null, touch: null },
  { action: 'fire', label: 'Disparar', keys: ['SPACE'], keyLabels: ['ESPACIO / Clic'], pad: 'A', padButton: 0, touch: 'A' },
  { action: 'reload', label: 'Recargar', keys: ['R'], keyLabels: ['R'], pad: 'X', padButton: 2, touch: 'B', touchShared: true },
  { action: 'interact', label: 'Usar / abrir', keys: ['F'], keyLabels: ['F'], pad: 'B', padButton: 1, touch: 'B', touchShared: true },
  { action: 'weapon1', label: 'Pistola', keys: ['ONE'], keyLabels: ['1'], pad: null, padButton: null, touch: null },
  { action: 'weapon2', label: 'Escopeta', keys: ['TWO'], keyLabels: ['2'], pad: null, padButton: null, touch: null },
  { action: 'weapon3', label: 'Metralleta', keys: ['THREE'], keyLabels: ['3'], pad: null, padButton: null, touch: null },
  { action: 'cycleWeapon', label: 'Cambiar arma', keys: [], keyLabels: ['Rueda'], pad: 'LB', padButton: 4, touch: 'L' },
  { action: 'heal', label: 'Curarse (tónico)', keys: ['H'], keyLabels: ['H'], pad: 'Y / RB', padButton: 3, touch: 'R' },
  { action: 'inventory', label: 'Inventario', keys: ['I', 'TAB'], keyLabels: ['I', 'TAB'], pad: 'SELECT', padButton: 8, touch: 'SELECT' },
  { action: 'pause', label: 'Pausa', keys: ['P'], keyLabels: ['P'], pad: 'START', padButton: 9, touch: 'START' },
];

export function bindingFor(action: Action): Binding {
  const b = CONTROLS.find((c) => c.action === action);
  if (!b) throw new Error(`Acción sin binding: ${action}`);
  return b;
}

export function allKeyNames(): string[] {
  const set = new Set<string>();
  for (const b of CONTROLS) for (const k of b.keys) set.add(k);
  return [...set];
}

export function actionsForTouch(button: TouchButton): Binding[] {
  return CONTROLS.filter((c) => c.touch === button);
}

export function touchLabel(button: TouchButton): string {
  const acts = actionsForTouch(button);
  if (acts.length === 1) return acts[0].label;
  return acts.map((b) => b.label.split(' ')[0]).join(' / ');
}

export function actionsForKey(key: string): Binding[] {
  return CONTROLS.filter((c) => c.keys.includes(key));
}
