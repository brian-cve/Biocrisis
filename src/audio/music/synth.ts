import { audio } from '../engine';
import { NoteEvent } from './composer';
import { midiToHz } from './theory';

/** Tope de nodos fuente de música vivos a la vez (CPU móvil). Los stings lo ignoran. */
const MAX_MUSIC_SOURCES = 44;

export interface Sink {
  /** Entrada seca de la capa. */
  dry: AudioNode;
  /** Entrada de la reverb compartida. */
  send: AudioNode;
}

/** Respuesta al impulso sintética: ruido estéreo con caída exponencial y suavizado (cola oscura). */
export function makeImpulse(ctx: BaseAudioContext, seconds = 3.4, decay = 2.6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, decay);
      lp += (Math.random() * 2 - 1 - lp) * (0.35 - 0.25 * t); // la cola pierde agudos
      d[i] = lp * env;
    }
  }
  return buf;
}

interface Built {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  end: number;
}

/** Cuenta, arranca y programa la limpieza de todos los nodos de una voz (se desconectan al terminar la primera fuente). */
function run(b: Built, start: number): void {
  audio.musicNodes += b.sources.length;
  let remaining = b.sources.length;
  for (const s of b.sources) {
    s.onended = () => {
      remaining--;
      audio.musicNodes--;
      if (remaining === 0) for (const n of b.nodes) n.disconnect();
    };
    s.start(start);
    s.stop(b.end);
  }
}

/** Envolvente ADSR simplificada: ataque lineal, sostenido y relajación exponencial. */
function env(g: GainNode, t0: number, attack: number, hold: number, release: number, peak: number): number {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  return t0 + attack + hold + release;
}

function chainTo(ctx: AudioContext, nodes: AudioNode[], sink: Sink, send: number, pan?: number): void {
  const out = nodes[nodes.length - 1];
  let last: AudioNode = out;
  if (pan !== undefined && pan !== 0 && typeof ctx.createStereoPanner === 'function') {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    nodes.push(p);
    last = p;
  }
  last.connect(sink.dry);
  if (send > 0) {
    const s = ctx.createGain();
    s.gain.value = send;
    last.connect(s);
    s.connect(sink.send);
    nodes.push(s);
  }
}

function osc(ctx: AudioContext, type: OscillatorType, hz: number, detuneCents = 0): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.detune.value = detuneCents;
  return o;
}

/** Reproduce un evento en el instante absoluto `t0` (reloj de AudioContext). Devuelve false si se omitió por el tope de voces. */
export function playEvent(ctx: AudioContext, ev: NoteEvent, t0: number, sink: Sink, force = false): boolean {
  if (!force && audio.musicNodes >= MAX_MUSIC_SOURCES) return false;
  const hz = midiToHz(ev.midi);
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [];
  const g = ctx.createGain();
  let end = t0 + ev.dur;
  let send = 0.4;

  switch (ev.voice) {
    case 'pad':
    case 'warmPad': {
      // dos sierras desafinadas + triángulo filtradas: cuerpo sin aspereza; ataque largo
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = ev.voice === 'warmPad' ? 1400 : 650 + ev.vel * 500;
      lp.Q.value = 0.4;
      for (const [type, c] of [['sawtooth', -8], ['sawtooth', 8], ['triangle', 0]] as [OscillatorType, number][]) {
        const o = osc(ctx, type, hz, c);
        o.connect(lp);
        sources.push(o);
      }
      lp.connect(g);
      nodes.push(lp, g);
      const a = ev.attack ?? 1.6;
      end = env(g, t0, a, Math.max(0, ev.dur - a), 2.4, 0.045 * ev.vel);
      send = 0.7;
      break;
    }
    case 'drone': {
      // dos senos a ~0.4 Hz de batido + una sierra muy filtrada que respira
      const o1 = osc(ctx, 'sine', hz);
      const o2 = osc(ctx, 'sine', hz + 0.4);
      const o3 = osc(ctx, 'sawtooth', hz);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 140;
      const lfo = osc(ctx, 'sine', 0.07);
      const lfoG = ctx.createGain();
      lfoG.gain.value = 50;
      lfo.connect(lfoG);
      lfoG.connect(lp.frequency);
      const sawG = ctx.createGain();
      sawG.gain.value = 0.25;
      o3.connect(lp);
      lp.connect(sawG);
      sawG.connect(g);
      o1.connect(g);
      o2.connect(g);
      sources.push(o1, o2, o3, lfo);
      nodes.push(lp, lfoG, sawG, g);
      const fade = ev.dur * 0.28;
      end = env(g, t0, fade, ev.dur - 2 * fade, fade, 0.11 * ev.vel);
      send = 0.25;
      break;
    }
    case 'bell': {
      // parciales inarmónicos con caída rápida: timbre de campana/celesta
      for (const [mul, amp] of [[1, 1], [2.76, 0.32], [5.4, 0.1]] as [number, number][]) {
        const o = osc(ctx, 'sine', hz * mul);
        const pg = ctx.createGain();
        pg.gain.value = amp;
        o.connect(pg);
        pg.connect(g);
        sources.push(o);
        nodes.push(pg);
      }
      nodes.push(g);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.1 * ev.vel, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ev.dur);
      send = 0.85;
      break;
    }
    case 'piano': {
      const o1 = osc(ctx, 'triangle', hz);
      const o2 = osc(ctx, 'sine', hz * 2.003);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t0);
      lp.frequency.exponentialRampToValueAtTime(380, t0 + ev.dur);
      const g2 = ctx.createGain();
      g2.gain.value = 0.35;
      o1.connect(lp);
      o2.connect(g2);
      g2.connect(lp);
      lp.connect(g);
      sources.push(o1, o2);
      nodes.push(lp, g2, g);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.16 * ev.vel, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ev.dur);
      send = 0.75;
      break;
    }
    case 'cluster': {
      const o = osc(ctx, 'sine', hz);
      const o2 = osc(ctx, 'triangle', hz * 2, 3);
      const g2 = ctx.createGain();
      g2.gain.value = 0.18;
      o.connect(g);
      o2.connect(g2);
      g2.connect(g);
      sources.push(o, o2);
      nodes.push(g2, g);
      const a = ev.attack ?? ev.dur * 0.4;
      end = env(g, t0, a, Math.max(0, ev.dur - a - 2.2), 2.2, 0.07 * ev.vel);
      send = 0.8;
      break;
    }
    case 'creak': {
      const buf = audio.noiseBuffer;
      if (!buf) return false;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 7;
      bp.frequency.setValueAtTime(260, t0);
      bp.frequency.exponentialRampToValueAtTime(820, t0 + ev.dur);
      src.connect(bp);
      bp.connect(g);
      sources.push(src);
      nodes.push(bp, g);
      end = env(g, t0, ev.dur * 0.3, 0, ev.dur * 0.7, 0.05 * ev.vel);
      send = 0.5;
      break;
    }
    case 'kick': {
      const o = osc(ctx, 'sine', 95);
      o.frequency.setValueAtTime(95, t0);
      o.frequency.exponentialRampToValueAtTime(38, t0 + 0.16);
      o.connect(g);
      sources.push(o);
      nodes.push(g);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.85 * ev.vel, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ev.dur);
      send = 0.08;
      break;
    }
    case 'hat':
    case 'tom': {
      const buf = audio.noiseBuffer;
      if (!buf) return false;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      if (ev.voice === 'hat') {
        f.type = 'highpass';
        f.frequency.value = 7000;
      } else {
        f.type = 'lowpass';
        f.frequency.value = 600;
      }
      src.connect(f);
      f.connect(g);
      sources.push(src);
      nodes.push(f, g);
      if (ev.voice === 'tom') {
        const o = osc(ctx, 'sine', hz * 2);
        o.frequency.setValueAtTime(hz * 2.6, t0);
        o.frequency.exponentialRampToValueAtTime(hz * 1.4, t0 + ev.dur);
        o.connect(g);
        sources.push(o);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime((ev.voice === 'hat' ? 0.11 : 0.5) * ev.vel, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ev.dur);
      send = ev.voice === 'hat' ? 0.1 : 0.3;
      break;
    }
    case 'strings': {
      // dos sierras desafinadas con vibrato y trémolo, filtradas: cuerda aguda tensa
      const o1 = osc(ctx, 'sawtooth', hz, -9);
      const o2 = osc(ctx, 'sawtooth', hz, 9);
      const vib = osc(ctx, 'sine', 5.5);
      const vibG = ctx.createGain();
      vibG.gain.value = hz * 0.006;
      vib.connect(vibG);
      vibG.connect(o1.frequency);
      vibG.connect(o2.frequency);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = Math.min(5000, hz * 2.2);
      bp.Q.value = 0.9;
      const trem = osc(ctx, 'sine', 7.5);
      const tremG = ctx.createGain();
      tremG.gain.value = 0.35;
      const amp = ctx.createGain();
      amp.gain.value = 0.65;
      trem.connect(tremG);
      tremG.connect(amp.gain);
      o1.connect(bp);
      o2.connect(bp);
      bp.connect(amp);
      amp.connect(g);
      sources.push(o1, o2, vib, trem);
      nodes.push(vibG, bp, tremG, amp, g);
      end = env(g, t0, 0.18, Math.max(0, ev.dur - 0.5), 0.32, 0.075 * ev.vel);
      send = 0.45;
      break;
    }
    case 'hit': {
      const buf = audio.noiseBuffer;
      if (!buf) return false;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1800, t0);
      lp.frequency.exponentialRampToValueAtTime(90, t0 + ev.dur);
      const o = osc(ctx, 'sine', 80);
      o.frequency.setValueAtTime(80, t0);
      o.frequency.exponentialRampToValueAtTime(28, t0 + ev.dur);
      src.connect(lp);
      lp.connect(g);
      o.connect(g);
      sources.push(src, o);
      nodes.push(lp, g);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.5 * ev.vel, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ev.dur);
      send = 0.6;
      break;
    }
    case 'fall': {
      const o = osc(ctx, 'sawtooth', hz);
      o.frequency.setValueAtTime(hz, t0);
      o.frequency.exponentialRampToValueAtTime(hz / 4, t0 + ev.dur);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t0);
      lp.frequency.exponentialRampToValueAtTime(90, t0 + ev.dur);
      o.connect(lp);
      lp.connect(g);
      sources.push(o);
      nodes.push(lp, g);
      end = env(g, t0, 0.1, 0, ev.dur, 0.09 * ev.vel);
      send = 0.5;
      break;
    }
  }

  const all: Built = { sources, nodes: [...sources, ...nodes], end: end + 0.1 };
  chainTo(ctx, nodes, sink, send, ev.pan);
  all.nodes = [...sources, ...nodes];
  run(all, t0);
  return true;
}
