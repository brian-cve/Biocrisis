import { describe, expect, it } from 'vitest';
import { CONTROLS, actionsForKey, actionsForTouch, allKeyNames, bindingFor, touchLabel } from '../src/game/controls';
import { DEFAULT_SETTINGS, SettingsStore, sanitize } from '../src/game/settings';
import { formatTime, rank } from '../src/game/rank';

describe('controls (single source)', () => {
  it('each action appears once and keyLabels matches keys', () => {
    const names = CONTROLS.map((c) => c.action);
    expect(new Set(names).size).toBe(names.length);
    for (const c of CONTROLS) if (c.keys.length) expect(c.keyLabels.length).toBe(c.keys.length);
  });
  it('B is contextual (reload / use) and L/R switch weapon / heal', () => {
    expect(actionsForTouch('B').map((b) => b.action).sort()).toEqual(['interact', 'reload']);
    expect(actionsForTouch('L')[0].action).toBe('cycleWeapon');
    expect(actionsForTouch('R')[0].action).toBe('heal');
    expect(actionsForTouch('SELECT')[0].action).toBe('inventory');
    expect(actionsForTouch('START')[0].action).toBe('pause');
    expect(actionsForTouch('A')[0].action).toBe('fire');
  });
  it('all game actions are reachable on mobile except strafe and direct weapon keys', () => {
    const noTouch = CONTROLS.filter((c) => c.touch === null).map((c) => c.action).sort();
    expect(noTouch).toEqual(['strafeLeft', 'strafeRight', 'weapon1', 'weapon2', 'weapon3']);
  });
  it('a key change is reflected in derived queries', () => {
    expect(actionsForKey('H')[0].action).toBe('heal');
    expect(allKeyNames()).toContain('TAB');
    expect(bindingFor('pause').keys).toEqual(['P']);
    expect(touchLabel('A')).toBe('Fire');
  });
});

describe('settings', () => {
  it('sanitize rejects corrupt data and fills in defaults', () => {
    expect(sanitize(null)).toEqual(DEFAULT_SETTINGS);
    const s = sanitize({ musicVolume: 9, sfxVolume: 'x', sensitivity: -5, muted: 'si', aimAssist: false });
    expect(s.musicVolume).toBe(1);
    expect(s.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(s.sensitivity).toBe(0.5);
    expect(s.muted).toBe(false);
    expect(s.aimAssist).toBe(false);
  });
  it('persists and reloads from storage', () => {
    const mem = new Map<string, string>();
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const a = new SettingsStore(st);
    a.update({ musicVolume: 0.3, controlsSeen: true });
    const b = new SettingsStore(st);
    expect(b.value.musicVolume).toBe(0.3);
    expect(b.value.controlsSeen).toBe(true);
  });
  it('works without localStorage or if writing/reading fails', () => {
    const none = new SettingsStore(null);
    none.update({ sfxVolume: 0.1 });
    expect(none.value.sfxVolume).toBe(0.1);
    const broken = { getItem: () => { throw new Error('denegado'); }, setItem: () => { throw new Error('lleno'); } };
    const b = new SettingsStore(broken);
    expect(b.value).toEqual(DEFAULT_SETTINGS);
    expect(() => b.update({ muted: true })).not.toThrow();
    expect(b.value.muted).toBe(true);
  });
  it('notifies changes and allows unsubscribing', () => {
    const st = new SettingsStore(null);
    let n = 0;
    const off = st.onChange(() => n++);
    st.update({ muted: true });
    off();
    st.update({ muted: false });
    expect(n).toBe(1);
  });
});

describe('rank and time', () => {
  const base = { seconds: 200, shots: 20, hits: 18, kills: 4, tonicsUsed: 0, zombies: 6 };
  it('A for a fast, economical run; C for a slow, wasteful one', () => {
    expect(rank(base)).toBe('A');
    expect(rank({ ...base, seconds: 500, shots: 50, tonicsUsed: 1 })).toBe('B');
    expect(rank({ ...base, seconds: 900, shots: 99, tonicsUsed: 3 })).toBe('C');
  });
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.9)).toBe('1:15');
  });
});
