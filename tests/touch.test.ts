import { describe, expect, it } from 'vitest';
import { TOUCH_BUTTONS } from '../src/game/controls';
import { sanitize } from '../src/game/settings';
import { TouchState } from '../src/ui/touchState';

describe('touch pad state', () => {
  it('press marks the button and counts the press; repeating while held does not count', () => {
    const t = new TouchState();
    t.press('A');
    t.press('A');
    expect(t.held.A).toBe(true);
    expect(t.presses.A).toBe(1);
    t.release('A');
    t.press('A');
    expect(t.presses.A).toBe(2);
  });
  it('a tap shorter than a frame is not lost: the counter changes even if held is already false', () => {
    const t = new TouchState();
    const seen = t.snapshot();
    t.press('B');
    t.release('B');
    expect(t.held.B).toBe(false);
    expect(t.presses.B).not.toBe(seen.B);
  });
  it('several consumers read without stealing events', () => {
    const t = new TouchState();
    const a = t.snapshot();
    const b = t.snapshot();
    t.press('START');
    expect(t.presses.START !== a.START).toBe(true);
    expect(t.presses.START !== b.START).toBe(true);
  });
  it('multitouch: independent buttons at once; releaseAll leaves none stuck', () => {
    const t = new TouchState();
    t.press('up');
    t.press('left');
    t.press('A');
    expect(TOUCH_BUTTONS.filter((b) => t.held[b]).sort()).toEqual(['A', 'left', 'up']);
    t.releaseAll();
    expect(TOUCH_BUTTONS.some((b) => t.held[b])).toBe(false);
    expect(t.total).toBe(3);
  });
});

describe('touch controls setting', () => {
  it('accepts auto/on/off and replaces invalid values with auto', () => {
    expect(sanitize({ touchControls: 'on' }).touchControls).toBe('on');
    expect(sanitize({ touchControls: 'off' }).touchControls).toBe('off');
    expect(sanitize({ touchControls: 'siempre' }).touchControls).toBe('auto');
    expect(sanitize(null).touchControls).toBe('auto');
  });
});
