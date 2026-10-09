import { TOUCH_BUTTONS, TouchButton } from '../game/controls';

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

  get total(): number {
    let n = 0;
    for (const b of TOUCH_BUTTONS) n += this.presses[b];
    return n;
  }

  snapshot(): Record<TouchButton, number> {
    return { ...this.presses };
  }
}

export const touchState = new TouchState();
