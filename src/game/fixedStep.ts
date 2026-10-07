/** Acumulador de paso fijo: la lógica corre a `hz` independientemente del framerate. */
export class FixedStep {
  private acc = 0;
  readonly dt: number;
  constructor(hz = 60, private readonly maxSteps = 5) {
    this.dt = 1 / hz;
  }

  /** Consume `frameSeconds` y llama a `step(dt)` las veces necesarias. Devuelve pasos ejecutados. */
  advance(frameSeconds: number, step: (dt: number) => void): number {
    this.acc += Math.min(frameSeconds, 0.25);
    let n = 0;
    while (this.acc >= this.dt && n < this.maxSteps) {
      step(this.dt);
      this.acc -= this.dt;
      n++;
    }
    if (n === this.maxSteps) this.acc = 0; // evita la espiral de la muerte
    return n;
  }
}
