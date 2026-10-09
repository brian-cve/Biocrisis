export interface RunStats {
  seconds: number;
  shots: number;
  hits: number;
  kills: number;
  tonicsUsed: number;
  zombies: number;
}

export function rank(s: RunStats): 'A' | 'B' | 'C' {
  const time = s.seconds <= 240 ? 3 : s.seconds <= 420 ? 2 : s.seconds <= 600 ? 1 : 0;
  const ammo = s.shots <= 30 ? 3 : s.shots <= 45 ? 2 : s.shots <= 60 ? 1 : 0;
  const med = s.tonicsUsed === 0 ? 2 : s.tonicsUsed === 1 ? 1 : 0;
  const total = time + ammo + med;
  return total >= 6 ? 'A' : total >= 3 ? 'B' : 'C';
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
