type BusName = 'sfx' | 'ambient' | 'music';

export interface PlayOpts {
  gain?: number;
  // Playback speed; also shifts pitch.
  rate?: number;
  pan?: number;
  delay?: number;
  // Cut the sample after this many seconds (with a short fade).
  dur?: number;
  bus?: BusName;
}

export interface LoopHandle {
  stop(): void;
}

interface VolumeState {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const MAX_VOICES = 28;
const BASE = import.meta.env.BASE_URL;

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  buses!: Record<BusName, GainNode>;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<AudioBuffer | null>>();
  private vol: VolumeState = { musicVolume: 0.7, sfxVolume: 0.9, muted: false };
  private ducked = false;
  voices = 0;
  loops = 0;

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  // Creates the context (suspended until a user gesture) so samples can be decoded early.
  init(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.buses = { sfx: this.ctx.createGain(), ambient: this.ctx.createGain(), music: this.ctx.createGain() };
    for (const b of Object.values(this.buses)) b.connect(this.master);
    this.applyGains(true);
  }

  unlock(): void {
    this.init();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  // Fetches and decodes a file under public/audio once; resolves null if it cannot be loaded.
  load(file: string): Promise<AudioBuffer | null> {
    const hit = this.loading.get(file);
    if (hit) return hit;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const p = fetch(`${BASE}audio/${file}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => {
        this.buffers.set(file, buf);
        return buf;
      })
      .catch(() => null);
    this.loading.set(file, p);
    return p;
  }

  has(file: string): boolean {
    return this.buffers.has(file);
  }

  setVolumes(v: VolumeState): void {
    this.vol = v;
    this.applyGains(false);
  }

  setDucked(on: boolean): void {
    this.ducked = on;
    this.applyGains(false);
  }

  private applyGains(immediate: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (g: GainNode, v: number) => (immediate ? (g.gain.value = v) : g.gain.setTargetAtTime(v, t, 0.06));
    set(this.master, this.vol.muted ? 0 : 1);
    set(this.buses.sfx, this.vol.sfxVolume * (this.ducked ? 0.12 : 1));
    set(this.buses.ambient, this.vol.sfxVolume * 0.6 * (this.ducked ? 0.25 : 1));
    set(this.buses.music, this.vol.musicVolume * (this.ducked ? 0.3 : 1));
  }

  // One-shot playback of a loaded sample. Silently ignored until the file has loaded.
  play(file: string, o: PlayOpts = {}): void {
    const c = this.ctx;
    const buf = this.buffers.get(file);
    if (!c || !buf || this.voices >= MAX_VOICES) return;
    const t = c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(o.gain ?? 1, t);
    const nodes: AudioNode[] = [src, g];
    src.connect(g);
    let end = t + buf.duration / (o.rate ?? 1);
    if (o.dur !== undefined && o.dur < end - t) {
      end = t + o.dur;
      g.gain.setValueAtTime(o.gain ?? 1, Math.max(t, end - 0.04));
      g.gain.linearRampToValueAtTime(0, end);
    }
    let last: AudioNode = g;
    if (o.pan && typeof c.createStereoPanner === 'function') {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      g.connect(p);
      nodes.push(p);
      last = p;
    }
    last.connect(this.buses[o.bus ?? 'sfx']);
    this.voices++;
    src.onended = () => {
      for (const n of nodes) n.disconnect();
      this.voices--;
    };
    src.start(t);
    src.stop(end + 0.02);
  }

  // Looping playback with a fade-in; starts as soon as the file is available.
  loop(file: string, o: { gain: number; bus?: BusName; fade?: number }): LoopHandle {
    let stopped = false;
    let stopNow: (() => void) | null = null;
    void this.load(file).then((buf) => {
      const c = this.ctx;
      if (stopped || !c || !buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.linearRampToValueAtTime(o.gain, c.currentTime + (o.fade ?? 1.5));
      src.connect(g);
      g.connect(this.buses[o.bus ?? 'ambient']);
      src.start();
      this.loops++;
      stopNow = () => {
        const t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0.0001, t, 0.15);
        window.setTimeout(() => {
          src.stop();
          src.disconnect();
          g.disconnect();
          this.loops--;
        }, 700);
      };
    });
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        stopNow?.();
      },
    };
  }

  stats(): { voices: number; loops: number; loaded: number; state: string } {
    return { voices: this.voices, loops: this.loops, loaded: this.buffers.size, state: this.ctx?.state ?? 'none' };
  }
}

export const audio = new AudioEngine();
