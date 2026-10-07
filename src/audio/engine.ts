/** Motor de audio procedural (Web Audio): buses, voces con limpieza garantizada, bucles ambientales. */

export type BusName = 'sfx' | 'ambient' | 'music';

export interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  /** Frecuencia final (rampa exponencial). */
  f1?: number;
  dur: number;
  gain?: number;
  attack?: number;
  delay?: number;
  bus?: BusName;
  pan?: number;
  /** Filtro opcional tras el oscilador. */
  filter?: { type: BiquadFilterType; freq: number; q?: number };
  /** Vibrato (Hz, profundidad en Hz). */
  vibrato?: { rate: number; depth: number };
}

export interface NoiseOpts {
  dur: number;
  gain?: number;
  attack?: number;
  delay?: number;
  bus?: BusName;
  pan?: number;
  filter?: { type: BiquadFilterType; f0: number; f1?: number; q?: number };
}

export interface LoopHandle {
  stop(): void;
}

export interface VolumeState {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const MAX_VOICES = 28;

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  buses!: Record<BusName, GainNode>;
  private noiseBuf: AudioBuffer | null = null;
  private vol: VolumeState = { musicVolume: 0.7, sfxVolume: 0.9, muted: false };
  private ducked = false;
  /** Voces cortas vivas (para pruebas de fugas y límite de CPU). */
  voices = 0;
  /** Bucles ambientales vivos. */
  loops = 0;
  /** Nodos de música vivos (los incrementa el motor de música). */
  musicNodes = 0;

  get noiseBuffer(): AudioBuffer | null {
    return this.noiseBuf;
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Crea/reanuda el contexto. Debe llamarse desde un gesto del usuario (política de autoplay). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.buses = { sfx: this.ctx.createGain(), ambient: this.ctx.createGain(), music: this.ctx.createGain() };
      for (const b of Object.values(this.buses)) b.connect(this.master);
      this.noiseBuf = this.makeNoise(this.ctx);
      this.applyGains(true);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setVolumes(v: VolumeState): void {
    this.vol = v;
    this.applyGains(false);
  }

  /** Pausa del juego: atenúa efectos y ambiente y baja la música. */
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

  private out(bus: BusName | undefined, pan: number | undefined, tail: AudioNode[]): void {
    const c = this.ctx!;
    let last = tail[tail.length - 1];
    if (pan !== undefined && pan !== 0 && typeof c.createStereoPanner === 'function') {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      last.connect(p);
      tail.push(p);
      last = p;
    }
    last.connect(this.buses[bus ?? 'sfx']);
  }

  private envelope(g: GainNode, t: number, dur: number, peak: number, attack: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.max(0.002, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  /** Oscilador con envolvente; se desconecta solo al terminar. */
  tone(o: ToneOpts): void {
    const c = this.ctx;
    if (!c || this.voices >= MAX_VOICES) return;
    const t = c.currentTime + (o.delay ?? 0);
    const osc = c.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    const g = c.createGain();
    this.envelope(g, t, o.dur, o.gain ?? 0.5, o.attack ?? 0.005);
    const nodes: AudioNode[] = [osc];
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (o.vibrato) {
      lfo = c.createOscillator();
      lfo.frequency.value = o.vibrato.rate;
      lfoGain = c.createGain();
      lfoGain.gain.value = o.vibrato.depth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + o.dur + 0.05);
    }
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.value = o.filter.freq;
      f.Q.value = o.filter.q ?? 1;
      osc.connect(f);
      nodes.push(f);
    }
    const last = nodes[nodes.length - 1];
    last.connect(g);
    nodes.push(g);
    this.out(o.bus, o.pan, nodes);
    this.voices++;
    osc.onended = () => {
      for (const n of nodes) n.disconnect();
      lfo?.disconnect();
      lfoGain?.disconnect();
      this.voices--;
    };
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  /** Ráfaga de ruido filtrado con envolvente. */
  noise(o: NoiseOpts): void {
    const c = this.ctx;
    if (!c || !this.noiseBuf || this.voices >= MAX_VOICES) return;
    const t = c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = c.createGain();
    this.envelope(g, t, o.dur, o.gain ?? 0.5, o.attack ?? 0.003);
    const nodes: AudioNode[] = [src];
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.setValueAtTime(o.filter.f0, t);
      if (o.filter.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.filter.f1), t + o.dur);
      f.Q.value = o.filter.q ?? 1;
      src.connect(f);
      nodes.push(f);
    }
    nodes[nodes.length - 1].connect(g);
    nodes.push(g);
    this.out(o.bus, o.pan, nodes);
    this.voices++;
    src.onended = () => {
      for (const n of nodes) n.disconnect();
      this.voices--;
    };
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.05);
  }

  /** Bucle continuo de ruido filtrado con modulación lenta (viento, lluvia). `stop()` lo libera. */
  loopNoise(o: { filter: { type: BiquadFilterType; freq: number; q?: number }; gain: number; lfoRate?: number; lfoDepth?: number; bus?: BusName }): LoopHandle {
    const c = this.ctx;
    if (!c || !this.noiseBuf) return { stop() {} };
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.filter.type;
    f.frequency.value = o.filter.freq;
    f.Q.value = o.filter.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(o.gain, c.currentTime + 1.5);
    src.connect(f);
    f.connect(g);
    g.connect(this.buses[o.bus ?? 'ambient']);
    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (o.lfoRate) {
      lfo = c.createOscillator();
      lfo.frequency.value = o.lfoRate;
      lfoGain = c.createGain();
      lfoGain.gain.value = o.lfoDepth ?? 100;
      lfo.connect(lfoGain);
      lfoGain.connect(f.frequency);
      lfo.start();
    }
    src.start();
    this.loops++;
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setTargetAtTime(0.0001, t, 0.15);
        window.setTimeout(() => {
          src.stop();
          lfo?.stop();
          src.disconnect();
          f.disconnect();
          g.disconnect();
          lfo?.disconnect();
          lfoGain?.disconnect();
          this.loops--;
        }, 700);
      },
    };
  }

  stats(): { voices: number; loops: number; musicNodes: number; state: string } {
    return { voices: this.voices, loops: this.loops, musicNodes: this.musicNodes, state: this.ctx?.state ?? 'none' };
  }
}

/** Instancia única compartida por todas las escenas. */
export const audio = new AudioEngine();
