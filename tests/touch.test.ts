import { describe, expect, it } from 'vitest';
import { TOUCH_BUTTONS } from '../src/game/controls';
import { sanitize } from '../src/game/settings';
import { TouchState } from '../src/ui/touchState';

describe('estado del mando táctil', () => {
  it('press marca el botón y cuenta la pulsación; repetir mientras está mantenido no cuenta', () => {
    const t = new TouchState();
    t.press('A');
    t.press('A');
    expect(t.held.A).toBe(true);
    expect(t.presses.A).toBe(1);
    t.release('A');
    t.press('A');
    expect(t.presses.A).toBe(2);
  });
  it('un toque más corto que un frame no se pierde: el contador cambia aunque held ya sea false', () => {
    const t = new TouchState();
    const seen = t.snapshot();
    t.press('B');
    t.release('B');
    expect(t.held.B).toBe(false);
    expect(t.presses.B).not.toBe(seen.B);
  });
  it('varios consumidores leen sin robarse los eventos', () => {
    const t = new TouchState();
    const a = t.snapshot();
    const b = t.snapshot();
    t.press('START');
    expect(t.presses.START !== a.START).toBe(true);
    expect(t.presses.START !== b.START).toBe(true);
  });
  it('multitouch: botones independientes a la vez; releaseAll no deja ninguno pegado', () => {
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

describe('ajuste de controles táctiles', () => {
  it('acepta auto/on/off y reemplaza valores inválidos por auto', () => {
    expect(sanitize({ touchControls: 'on' }).touchControls).toBe('on');
    expect(sanitize({ touchControls: 'off' }).touchControls).toBe('off');
    expect(sanitize({ touchControls: 'siempre' }).touchControls).toBe('auto');
    expect(sanitize(null).touchControls).toBe('auto');
  });
});
