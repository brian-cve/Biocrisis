import { Camera } from '../engine/raycast';
import { GridMap } from '../engine/raycast';
import { circleHitsWall, moveWithCollision } from './collision';

export interface Blocker {
  x: number;
  y: number;
  radius: number;
  dead: boolean;
}

export const FOV_PLANE = 0.66;
export const PLAYER_RADIUS = 0.25;
export const MOVE_SPEED = 2.1; // celdas/s
/** Retroceder y desplazarse de lado es más lento que avanzar: no se puede 'kitear' a un zombi andando hacia atrás. */
export const BACK_FACTOR = 0.6;
export const STRAFE_FACTOR = 0.85;
export const TURN_SPEED = 2.4; // rad/s

export interface MoveInput {
  forward: number; // -1..1
  strafe: number; // -1..1
  turn: number; // -1..1 (positivo = derecha)
  /** Giro directo en radianes este paso (ratón con Pointer Lock). */
  look?: number;
}

export class Player {
  x: number;
  y: number;
  angle: number;
  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }

  /** Avanza la simulación `dt` segundos. `blockers`: círculos sólidos (zombis vivos) que no se pueden atravesar. */
  update(map: GridMap, input: MoveInput, dt: number, blockers?: readonly Blocker[]): void {
    this.angle += input.turn * TURN_SPEED * dt + (input.look ?? 0);
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    const fwd = input.forward < 0 ? input.forward * BACK_FACTOR : input.forward;
    const str = input.strafe * STRAFE_FACTOR;
    let mx = dx * fwd - dy * str;
    let my = dy * fwd + dx * str;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const stepX = mx * MOVE_SPEED * dt;
    const stepY = my * MOVE_SPEED * dt;
    if (!blockers) {
      moveWithCollision(map, this, stepX, stepY, PLAYER_RADIUS);
      return;
    }
    // ejes por separado (deslizamiento); un zombi vivo es un círculo sólido que no se puede atravesar
    if (this.canStand(map, blockers, this.x + stepX, this.y)) this.x += stepX;
    if (this.canStand(map, blockers, this.x, this.y + stepY)) this.y += stepY;
  }

  private canStand(map: GridMap, blockers: readonly Blocker[], x: number, y: number): boolean {
    if (circleHitsWall(map, x, y, PLAYER_RADIUS)) return false;
    for (const b of blockers) {
      if (b.dead) continue;
      const min = PLAYER_RADIUS + b.radius;
      const nd = (x - b.x) * (x - b.x) + (y - b.y) * (y - b.y);
      if (nd >= min * min) continue;
      // ya solapado (p. ej. el zombi se le echó encima): solo se permite alejarse
      const cd = (this.x - b.x) * (this.x - b.x) + (this.y - b.y) * (this.y - b.y);
      if (nd <= cd) return false;
    }
    return true;
  }

  fillCamera(cam: Camera): void {
    cam.x = this.x;
    cam.y = this.y;
    cam.dirX = Math.cos(this.angle);
    cam.dirY = Math.sin(this.angle);
    cam.planeX = -cam.dirY * FOV_PLANE;
    cam.planeY = cam.dirX * FOV_PLANE;
  }
}
