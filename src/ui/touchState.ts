import { TOUCH_BUTTONS, TouchButton } from '../game/controls';

/**
 * Estado compartido del mando táctil. Cada botón guarda si está mantenido (`held`) y un contador de pulsaciones
 * (`presses`): los consumidores (juego, menús) comparan el contador con el último que vieron, así un toque más corto
 * que un frame no se pierde y varios consumidores pueden leer sin "robarse" los eventos.
 */
export class TouchState {
  readonly held = {} as Record<TouchButton, boolean>;
  readonly presses = {} as Record<TouchButton, number>;

  constructor() {
    for (const b of TOUCH_BUTTONS) {
      this.held[b] = false;
      this.presses[b] = 0;
    }
  }

  press(b: TouchButton): void {
    if (this.held[b]) return;
    this.held[b] = true;
    this.presses[b]++;
  }

  release(b: TouchButton): void {
    this.held[b] = false;
  }

  releaseAll(): void {
    for (const b of TOUCH_BUTTONS) this.held[b] = false;
  }

  /** Suma de todas las pulsaciones (para "pulsa cualquier botón"). */
  get total(): number {
    let n = 0;
    for (const b of TOUCH_BUTTONS) n += this.presses[b];
    return n;
  }

  /** Foto de los contadores actuales (para detectar pulsaciones nuevas). */
  snapshot(): Record<TouchButton, number> {
    return { ...this.presses };
  }
}

export const touchState = new TouchState();
