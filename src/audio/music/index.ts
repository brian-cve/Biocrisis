import { audio } from '../engine';
import { sfx } from '../sfx';

type MusicMode = 'off' | 'menu' | 'explore';
type Layer = 'menu' | 'explore' | 'chase';

const FILES: Record<Layer, string> = { menu: 'music/menu.m4a', explore: 'music/explore.m4a', chase: 'music/chase.m4a' };
const LAYERS = Object.keys(FILES) as Layer[];
const SILENT = 0.005;

interface Playing {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

// Streams looped music tracks and crossfades them; the chase track fades in with the tension value.
class MusicEngine {
  mode: MusicMode = 'off';
  intensity = 0;
  private fadeSeconds = 2;
  private readonly level: Record<Layer, number> = { menu: 0, explore: 0, chase: 0 };
  private readonly playing: Partial<Record<Layer, Playing>> = {};
  private readonly starting = new Set<Layer>();
  private last = 0;

  play(mode: Exclude<MusicMode, 'off'>, fadeSeconds = 2): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.fadeSeconds = fadeSeconds;
  }

  stop(fadeSeconds = 1.5): void {
    this.mode = 'off';
    this.fadeSeconds = fadeSeconds;
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  sting(kind: 'gameover' | 'win'): void {
    this.stop(0.6);
    if (kind === 'gameover') sfx.gameOver();
    else sfx.victory();
  }

  private target(layer: Layer): number {
    const i = this.intensity;
    if (this.mode === 'menu') return layer === 'menu' ? 1 : 0;
    if (this.mode === 'explore') return layer === 'chase' ? Math.min(1, i * 1.25) : layer === 'explore' ? 1 - 0.7 * i : 0;
    return 0;
  }

  /** Called every frame: moves each layer toward its target level and starts or stops its source. */
  tick(): void {
    const ctx = audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const k = Math.min(1, dt / Math.max(0.1, this.fadeSeconds / 3));
    for (const layer of LAYERS) {
      const to = this.target(layer);
      const cur = (this.level[layer] += (to - this.level[layer]) * k);
      const p = this.playing[layer];
      if (!p) {
        if (to > 0) this.start(layer);
        continue;
      }
      p.gain.gain.value = cur;
      if (to === 0 && cur < SILENT) this.halt(layer, p);
    }
  }

  private start(layer: Layer): void {
    if (this.starting.has(layer)) return;
    this.starting.add(layer);
    void audio.load(FILES[layer]).then((b) => {
      this.starting.delete(layer);
      const ctx = audio.ctx;
      if (!b || !ctx || this.playing[layer] || this.target(layer) === 0) return;
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = this.level[layer];
      src.connect(gain);
      gain.connect(audio.buses.music);
      src.start();
      this.playing[layer] = { src, gain };
    });
  }

  private halt(layer: Layer, p: Playing): void {
    p.src.stop();
    p.src.disconnect();
    p.gain.disconnect();
    this.level[layer] = 0;
    delete this.playing[layer];
  }

  stats(): { mode: MusicMode; intensity: number; playing: Layer[] } {
    return { mode: this.mode, intensity: +this.intensity.toFixed(2), playing: LAYERS.filter((l) => this.playing[l]) };
  }
}

export const music = new MusicEngine();
