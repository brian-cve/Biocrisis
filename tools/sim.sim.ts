import { describe, it } from 'vitest';
import { BotResult, Policy, playBot } from './bot';

const N = Number(process.env.SIM_N ?? 40);
const pct = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

describe('balance con jugador automático', () => {
  it('simula', () => {
    const out: string[] = [];
    for (const policy of (process.env.POLICIES ?? 'huida,sigilo,agresivo,tactico').split(',') as Policy[]) {
      const rs: BotResult[] = [];
      for (let s = 1; s <= N; s++) rs.push(playBot(s, policy));
      const won = rs.filter((r) => r.won);
      const dead = rs.filter((r) => r.dead);
      const to = rs.filter((r) => r.timedOut);
      const f = (xs: number[]) => (xs.length ? mean(xs).toFixed(1) : '-');
      out.push(
        `${policy.padEnd(9)} victoria ${((won.length / N) * 100).toFixed(0)}% · muerte ${((dead.length / N) * 100).toFixed(0)}% · sin acabar ${((to.length / N) * 100).toFixed(0)}%` +
          ` | t(victoria) p10/p50/p90 = ${won.length ? [pct(won.map((r) => r.seconds), 0.1), pct(won.map((r) => r.seconds), 0.5), pct(won.map((r) => r.seconds), 0.9)].map((v) => v.toFixed(0)).join('/') : '-'} s` +
          ` | balas ${f(rs.map((r) => r.shots))} (acierto ${(mean(rs.map((r) => (r.shots ? r.hits / r.shots : 0))) * 100).toFixed(0)}%)` +
          ` | bajas ${f(rs.map((r) => r.kills))}/6 | tónicos ${f(rs.map((r) => r.tonicsUsed))} | PV final(vic.) ${f(won.map((r) => r.hpEnd))}` +
          ` | munición sobrante(vic.) ${f(won.map((r) => r.bulletsLeft))}b/${f(won.map((r) => r.shellsLeft))}c`,
      );
    }
    process.stdout.write('\n' + out.join('\n') + '\n');
  });
});
