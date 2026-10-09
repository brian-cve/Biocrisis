import Phaser from 'phaser';
import { audio } from '../audio/engine';
import { TouchButton, touchLabel } from '../game/controls';
import { settings } from '../game/settings';
import { touchState } from './touchState';

const CSS = `
:root { --dp: clamp(148px, 38vmin, 210px); --ab: clamp(60px, 17vmin, 92px); --pill-w: clamp(76px, 17vmin, 120px); }
.tc-root { position: fixed; inset: 0; pointer-events: none; z-index: 10; user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none; touch-action: none; font-family: monospace; }
.tc-root[hidden], .tc-rotate[hidden] { display: none !important; }
.tc-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; touch-action: none; }
.tc-hit { position: absolute; pointer-events: auto; }

.tc-dpad { left: calc(env(safe-area-inset-left, 0px) + 3vmin); bottom: calc(env(safe-area-inset-bottom, 0px) + 5vmin);
  width: var(--dp); height: var(--dp); }
.tc-dpad .arm { position: absolute; background: rgba(5,7,6,.55); border: 2px solid #3f5549; color: #7a937c;
  display: flex; align-items: center; justify-content: center; font-size: calc(var(--dp) / 7); transition: background .04s; }
.tc-dpad .arm.on { background: rgba(122,147,124,.55); color: #050706; border-color: #9ab49c; }
.tc-dpad .up { left: 33.3%; top: 0; width: 33.4%; height: 33.4%; border-radius: 6px 6px 0 0; }
.tc-dpad .down { left: 33.3%; bottom: 0; width: 33.4%; height: 33.4%; border-radius: 0 0 6px 6px; }
.tc-dpad .left { left: 0; top: 33.3%; width: 33.4%; height: 33.4%; border-radius: 6px 0 0 6px; }
.tc-dpad .right { right: 0; top: 33.3%; width: 33.4%; height: 33.4%; border-radius: 0 6px 6px 0; }
.tc-dpad .mid { position: absolute; left: 33.3%; top: 33.3%; width: 33.4%; height: 33.4%; background: rgba(5,7,6,.55); border-top: 2px solid #3f5549; border-bottom: 2px solid #3f5549; }

.tc-btn { display: flex; align-items: center; justify-content: center; color: #d8d4c4; font-weight: bold;
  background: rgba(5,7,6,.55); border: 2px solid #3f5549; transition: background .04s; }
.tc-btn.on { background: rgba(154,180,156,.55); color: #050706; border-color: #c4c4be; }
.tc-btn small { position: absolute; font-weight: normal; font-size: max(9px, 2.4vmin); color: #9ab49c; white-space: nowrap; }

.tc-round { width: var(--ab); height: var(--ab); border-radius: 50%; font-size: calc(var(--ab) / 2.4); }
.tc-a { right: calc(env(safe-area-inset-right, 0px) + 3vmin); bottom: calc(env(safe-area-inset-bottom, 0px) + 33vmin); }
.tc-b { right: calc(env(safe-area-inset-right, 0px) + 3vmin + var(--ab) + 2vmin); bottom: calc(env(safe-area-inset-bottom, 0px) + 19vmin); }
.tc-a small { top: calc(-1 * max(11px, 3vmin)); }
.tc-b small { bottom: calc(-1 * max(11px, 3vmin)); }
.tc-a { background: rgba(122,40,36,.55); } .tc-b { background: rgba(128,107,64,.5); }

.tc-pill { width: var(--pill-w); height: 48px; background: transparent; border: none; }
.tc-pill i { display: block; width: 100%; height: 16px; border-radius: 8px; background: rgba(5,7,6,.6); border: 2px solid #3f5549; }
.tc-pill.on i { background: rgba(154,180,156,.6); border-color: #c4c4be; }
.tc-pill small { top: 22px; left: 50%; transform: translateX(-50%); }
.tc-select { left: calc(50% - var(--pill-w) - 1.5vmin); top: calc(env(safe-area-inset-top, 0px) + 1vmin); }
.tc-start { left: calc(50% + 1.5vmin); top: calc(env(safe-area-inset-top, 0px) + 1vmin); }
.tc-pill { flex-direction: column; justify-content: flex-start; }

.tc-shoulder { width: clamp(88px, 24vmin, 150px); height: clamp(48px, 12vmin, 72px); border-radius: 0 0 14px 14px; font-size: max(14px, 4vmin); }
.tc-l { left: calc(env(safe-area-inset-left, 0px) + 3vmin); top: env(safe-area-inset-top, 0px); }
.tc-r { right: calc(env(safe-area-inset-right, 0px) + 3vmin); top: env(safe-area-inset-top, 0px); }
.tc-shoulder small { top: 50%; transform: translateY(-50%); }
.tc-l small { left: calc(100% + 6px); } .tc-r small { right: calc(100% + 6px); }

.tc-rotate { position: fixed; inset: 0; z-index: 20; background: #050706; color: #9ab49c; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px; text-align: center; font-family: monospace; padding: 24px;
  user-select: none; touch-action: none; }
.tc-rotate .phone { width: 54px; height: 92px; border: 4px solid #9ab49c; border-radius: 10px; animation: tc-turn 2.4s ease-in-out infinite; position: relative; }
.tc-rotate .phone::after { content: ''; position: absolute; left: 50%; bottom: 6px; width: 14px; height: 3px; margin-left: -7px; background: #9ab49c; border-radius: 2px; }
.tc-rotate h1 { margin: 0; font-size: 20px; letter-spacing: 2px; color: #d8d4c4; }
.tc-rotate p { margin: 0; font-size: 14px; color: #56705f; max-width: 26ch; }
@keyframes tc-turn { 0%, 15% { transform: rotate(0deg); } 55%, 100% { transform: rotate(-90deg); } }
@media (max-aspect-ratio: 18/10) { .tc-btn small { display: none; } }
@media (max-height: 340px) { :root { --dp: 120px; --ab: 52px; } }
`;

class TouchUI {
  private root!: HTMLDivElement;
  private rotate!: HTMLDivElement;
  private game: Phaser.Game | null = null;
  private suspended = false;
  private mq: MediaQueryList | null = null;
  private portrait: MediaQueryList | null = null;
  private asleep = false;
  visible = false;
  private armEls: Partial<Record<TouchButton, HTMLElement>> = {};

  init(game: Phaser.Game): void {
    this.game = game;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'tc-root';
    this.root.hidden = true;
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(this.root);

    this.buildDpad();
    this.buildButton('A', 'tc-hit tc-btn tc-round tc-a');
    this.buildButton('B', 'tc-hit tc-btn tc-round tc-b');
    this.buildButton('SELECT', 'tc-hit tc-btn tc-pill tc-select', true);
    this.buildButton('START', 'tc-hit tc-btn tc-pill tc-start', true);
    this.buildButton('L', 'tc-hit tc-btn tc-shoulder tc-l');
    this.buildButton('R', 'tc-hit tc-btn tc-shoulder tc-r');

    this.rotate = document.createElement('div');
    this.rotate.className = 'tc-rotate';
    this.rotate.hidden = true;
    this.rotate.innerHTML = '<div class="phone"></div><h1>ROTATE YOUR DEVICE</h1><p>BioCrisis is played in landscape</p>';
    this.rotate.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(this.rotate);

    this.mq = matchMedia('(pointer: coarse)');
    this.portrait = matchMedia('(orientation: portrait)');
    const refresh = () => this.refresh();
    this.mq.addEventListener?.('change', refresh);
    this.portrait.addEventListener?.('change', refresh);
    addEventListener('resize', refresh);
    settings.onChange(refresh);
    addEventListener('blur', () => touchState.releaseAll());
    this.refresh();
  }

  setSuspended(s: boolean): void {
    this.suspended = s;
    this.refresh();
  }

  private enabled(): boolean {
    const mode = settings.value.touchControls;
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return this.mq?.matches === true;
  }

  private refresh(): void {
    const en = this.enabled();
    this.visible = en && !this.suspended;
    this.root.hidden = !this.visible;
    if (!this.visible) touchState.releaseAll();
    const portraitNow = en && this.portrait?.matches === true && innerHeight > innerWidth;
    this.rotate.hidden = !portraitNow;
    if (portraitNow !== this.asleep) {
      this.asleep = portraitNow;
      if (portraitNow) {
        this.game?.loop.sleep();
        void audio.ctx?.suspend();
      } else {
        this.game?.loop.wake();
        if (audio.ctx) void audio.ctx.resume();
      }
    }
  }

  haptic(pattern: number | number[]): void {
    if (this.visible && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  }

  private buildButton(b: TouchButton, cls: string, pill = false): void {
    const el = document.createElement('div');
    el.className = cls;
    el.dataset.btn = b;
    el.innerHTML = pill ? `<i></i><small>${b}</small>` : `${b}<small>${touchLabel(b)}</small>`;
    if (pill) el.querySelector('small')!.textContent = `${b} ${touchLabel(b)}`;
    this.root.appendChild(el);
    const ids = new Set<number>();
    const up = (e: PointerEvent) => {
      if (!ids.delete(e.pointerId)) return;
      if (ids.size === 0) {
        touchState.release(b);
        el.classList.remove('on');
      }
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
      }
      ids.add(e.pointerId);
      if (ids.size === 1) {
        touchState.press(b);
        el.classList.add('on');
        this.haptic(8);
      }
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  private buildDpad(): void {
    const el = document.createElement('div');
    el.className = 'tc-hit tc-dpad';
    const mid = document.createElement('div');
    mid.className = 'mid';
    el.appendChild(mid);
    const arrows: Record<string, string> = { up: '^', down: 'v', left: '<', right: '>' };
    for (const d of ['up', 'down', 'left', 'right'] as const) {
      const a = document.createElement('div');
      a.className = `arm ${d}`;
      a.textContent = arrows[d];
      el.appendChild(a);
      this.armEls[d] = a;
    }
    this.root.appendChild(el);

    let active: number | null = null;
    const set = (d: 'up' | 'down' | 'left' | 'right', on: boolean) => {
      if (on) {
        if (!touchState.held[d]) this.haptic(6);
        touchState.press(d);
      } else touchState.release(d);
      this.armEls[d]!.classList.toggle('on', on);
    };
    const update = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const dead = Math.hypot(dx, dy) < 0.16;
      set('left', !dead && dx < -0.34);
      set('right', !dead && dx > 0.34);
      set('up', !dead && dy < -0.34);
      set('down', !dead && dy > 0.34);
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      for (const d of ['up', 'down', 'left', 'right'] as const) set(d, false);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (active !== null) return;
      active = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
      }
      update(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId === active) update(e);
    });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }
}

export const touchUI = new TouchUI();
