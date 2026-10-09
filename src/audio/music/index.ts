import { audio } from '../engine';
import { CHASE_BAR, ChaseComposer, DRONE_PERIOD, ExploreComposer, MENU_BAR, MenuComposer, NoteEvent, gameOverSting, winSting } from './composer';
import { Sink, makeImpulse, playEvent } from './synth';

type MusicMode = 'off' | 'menu' | 'explore';
type Layer = 'menu' | 'explore' | 'chase' | 'sting';

const LOOKAHEAD = 0.8;
const MAX_LAG = 0.4;

class MusicEngine {
  mode: MusicMode = 'off';
  intensity = 0;

  private graph: { layers: Record<Layer, GainNode>; sends: Record<Layer, GainNode>; sinks: Record<Layer, Sink>; reverb: ConvolverNode; send: GainNode } | null = null;
  private lastFade: Partial<Record<Layer, number>> = {};
  private seed = (Date.now() & 0xffff) + 1;

  private menuComposer!: MenuComposer;
  private menuT = 0;
  private menuBar = 0;
  private exploreComposer!: ExploreComposer;
  private exploreT = 0;
  private droneT = 0;
  private droneN = 0;
  private chaseComposer!: ChaseComposer;
  private chaseT = 0;
  private chaseBar = 0;
  private chaseActive = false;
  private scheduled = 0;

  setSeed(seed: number): void {
    this.seed = seed;
  }

  private build(): NonNullable<MusicEngine['graph']> | null {
    const ctx = audio.ctx;
    if (!ctx) return null;
    if (this.graph) return this.graph;
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx);
    const send = ctx.createGain();
    send.gain.value = 1;
    const ret = ctx.createGain();
    ret.gain.value = 0.9;
    send.connect(reverb);
    reverb.connect(ret);
    ret.connect(audio.buses.music);
    const layers = {} as Record<Layer, GainNode>;
    const sends = {} as Record<Layer, GainNode>;
    const sinks = {} as Record<Layer, Sink>;
    for (const l of ['menu', 'explore', 'chase', 'sting'] as Layer[]) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(audio.buses.music);
      const ls = ctx.createGain();
      ls.gain.value = 0;
      ls.connect(send);
      layers[l] = g;
      sends[l] = ls;
      sinks[l] = { dry: g, send: ls };
    }
    this.graph = { layers, sends, sinks, reverb, send };
    return this.graph;
  }

  private fade(layer: Layer, to: number, seconds: number, force = false): void {
    const gr = this.graph;
    if (!gr || !audio.ctx) return;
    const last = this.lastFade[layer];
    if (!force && last !== undefined && Math.abs(last - to) < 0.03) return;
    this.lastFade[layer] = to;
    const t = audio.ctx.currentTime;
    const tc = Math.max(0.05, seconds / 3);
    for (const g of [gr.layers[layer], gr.sends[layer]]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(to, t, tc);
    }
  }

  play(mode: Exclude<MusicMode, 'off'>, fadeSeconds = 2): void {
    if (this.mode === mode) return;
    const g = this.build();
    this.mode = mode;
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    this.fade('sting', 0, 0.5, true);
    if (!g || !audio.ctx) return;
    this.startMode(mode, fadeSeconds);
  }

  private startMode(mode: Exclude<MusicMode, 'off'>, fadeSeconds: number): void {
    const now = audio.ctx!.currentTime;
    if (mode === 'menu') {
      this.menuComposer = new MenuComposer(this.seed);
      this.menuBar = 0;
      this.menuT = now + 0.3;
      this.fade('menu', 1, fadeSeconds, true);
      this.fade('explore', 0, fadeSeconds, true);
      this.fade('chase', 0, fadeSeconds, true);
    } else {
      this.exploreComposer = new ExploreComposer(this.seed);
      this.chaseComposer = new ChaseComposer(this.seed ^ 0x9e37);
      this.exploreT = now + 5;
      this.droneT = now + 0.2;
      this.droneN = 0;
      this.chaseActive = false;
      this.chaseBar = 0;
      this.fade('explore', 1, fadeSeconds, true);
      this.fade('menu', 0, fadeSeconds, true);
      this.fade('chase', 0, 0.3, true);
    }
    this.started = mode;
  }
  private started: MusicMode = 'off';

  stop(fadeSeconds = 1.5): void {
    if (this.mode === 'off') return;
    this.mode = 'off';
    this.started = 'off';
    for (const l of ['menu', 'explore', 'chase'] as Layer[]) this.fade(l, 0, fadeSeconds, true);
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  sting(kind: 'gameover' | 'win'): void {
    const g = this.build();
    if (!g || !audio.ctx) return;
    this.mode = 'off';
    this.started = 'off';
    for (const l of ['menu', 'explore', 'chase'] as Layer[]) this.fade(l, 0, 0.6, true);
    for (const n of [g.layers.sting, g.sends.sting]) {
      n.gain.cancelScheduledValues(audio.ctx.currentTime);
      n.gain.value = 1;
    }
    this.lastFade.sting = 1;
    const t0 = audio.ctx.currentTime + 0.15;
    for (const ev of kind === 'gameover' ? gameOverSting() : winSting()) playEvent(audio.ctx, ev, t0 + ev.t, g.sinks.sting, true);
  }

  tick(): void {
    const ctx = audio.ctx;
    if (!ctx || ctx.state !== 'running' || this.mode === 'off') return;
    const g = this.build();
    if (!g) return;
    if (this.started !== this.mode) this.startMode(this.mode as Exclude<MusicMode, 'off'>, 2);
    const now = ctx.currentTime;
    const horizon = now + LOOKAHEAD;

    if (this.mode === 'menu') {
      if (this.menuT < now - MAX_LAG) this.menuT = now + 0.1;
      while (this.menuT < horizon) {
        for (const ev of this.menuComposer.bar(this.menuBar)) this.emit(ev, this.menuT + ev.t, 'menu');
        this.menuT += MENU_BAR;
        this.menuBar++;
      }
    } else {
      const i = this.intensity;
      this.fade('chase', Math.min(1, i * 1.25), 0.9);
      this.fade('explore', 1 - 0.7 * i, 0.9);

      if (this.droneT < now - MAX_LAG) this.droneT = now + 0.1;
      while (this.droneT < horizon) {
        for (const ev of this.exploreComposer.drone(this.droneN)) this.emit(ev, this.droneT + ev.t, 'explore');
        this.droneT += DRONE_PERIOD;
        this.droneN++;
      }
      if (this.exploreT < now - MAX_LAG * 4) this.exploreT = now + 3;
      while (this.exploreT < horizon) {
        const n = this.exploreComposer.next();
        for (const ev of n.events) this.emit(ev, this.exploreT + ev.t, 'explore');
        this.exploreT += n.gap;
      }

      if (i > 0.08) {
        if (!this.chaseActive) {
          this.chaseActive = true;
          this.chaseT = now + 0.15;
        }
        if (this.chaseT < now - MAX_LAG) this.chaseT = now + 0.1;
        while (this.chaseT < horizon) {
          for (const ev of this.chaseComposer.bar(this.chaseBar, i)) this.emit(ev, this.chaseT + ev.t, 'chase');
          this.chaseT += CHASE_BAR;
          this.chaseBar++;
        }
      } else this.chaseActive = false;
    }
  }

  private emit(ev: NoteEvent, t: number, layer: Layer): void {
    const ctx = audio.ctx!;
    if (playEvent(ctx, ev, Math.max(t, ctx.currentTime), this.graph!.sinks[layer])) this.scheduled++;
  }

  stats(): { mode: MusicMode; intensity: number; musicNodes: number; scheduled: number } {
    return { mode: this.mode, intensity: +this.intensity.toFixed(2), musicNodes: audio.musicNodes, scheduled: this.scheduled };
  }
}

export const music = new MusicEngine();
