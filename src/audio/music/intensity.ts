
interface ThreatInfo {
  state: 'alert' | 'chase' | 'attack';
  dist: number;
}

export function rawIntensity(threats: readonly ThreatInfo[], hp: number, maxHp = 100): number {
  let v = 0;
  for (const t of threats) {
    const near = 1 - Math.min(1, t.dist / 10);
    if (t.state === 'alert') v += 0.12;
    else if (t.state === 'chase') v += 0.3 + 0.35 * near;
    else v += 0.6 + 0.2 * near;
  }
  if (threats.length > 0 && hp / maxHp <= 0.3) v += 0.15;
  return Math.max(0, Math.min(1, v));
}

export class IntensityTracker {
  value = 0;
  constructor(private readonly riseSeconds = 1.6, private readonly fallSeconds = 8) {}

  update(raw: number, dt: number): number {
    if (raw > this.value) this.value = Math.min(raw, this.value + dt / this.riseSeconds);
    else this.value = Math.max(raw, this.value - dt / this.fallSeconds);
    return this.value;
  }
}

export function worldIntensity(w: {
  hp: number;
  player: { x: number; y: number };
  zombies: readonly { x: number; y: number; state: number }[];
}): number {
  let v = 0;
  let any = false;
  for (const z of w.zombies) {
    if (z.state < 1 || z.state > 3) continue;
    any = true;
    const near = 1 - Math.min(1, Math.hypot(z.x - w.player.x, z.y - w.player.y) / 10);
    v += z.state === 1 ? 0.12 : z.state === 2 ? 0.3 + 0.35 * near : 0.6 + 0.2 * near;
  }
  if (any && w.hp <= 30) v += 0.15;
  return Math.max(0, Math.min(1, v));
}
