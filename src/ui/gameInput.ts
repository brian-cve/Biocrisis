import Phaser from 'phaser';
import { Action, CONTROLS, TOUCH_BUTTONS, TouchButton, allKeyNames } from '../game/controls';
import { MoveInput } from '../game/player';
import { touchState } from './touchState';

const DEADZONE = 0.25;

export class GameInput {
  readonly move: MoveInput = { forward: 0, strafe: 0, turn: 0, look: 0 };
  doorAhead: () => boolean = () => false;

  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  private heldSet = new Set<Action>();
  private pressedSet = new Set<Action>();
  private queued = new Set<Action>();
  private touchSeen = touchState.snapshot();
  private touchTurnT = 0;
  private readonly touchEdge: Partial<Record<TouchButton, boolean>> = {};
  private padPrev: boolean[] = [];
  private lookAcc = 0;
  private offs: (() => void)[] = [];
  sensitivity = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.keys = scene.input.keyboard!.addKeys(allKeyNames().join(',')) as Record<string, Phaser.Input.Keyboard.Key>;
    const onDown = () => this.queued.add('fire');
    const onWheel = () => this.queued.add('cycleWeapon');
    const onMove = (p: Phaser.Input.Pointer) => {
      if (scene.input.mouse?.locked) this.lookAcc += p.movementX * 0.0035;
    };
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.mouseLook && !scene.input.mouse?.locked) {
        scene.input.mouse?.requestPointerLock();
        return;
      }
      if (!p.wasTouch || !this.touchActive) onDown();
    });
    scene.input.on('wheel', onWheel);
    scene.input.on('pointermove', onMove);
    this.offs.push(() => scene.input.off('pointerdown'), () => scene.input.off('wheel', onWheel), () => scene.input.off('pointermove', onMove));
  }

  touchActive = false;
  mouseLook = false;

  held(a: Action): boolean {
    return this.heldSet.has(a);
  }
  pressed(a: Action): boolean {
    return this.pressedSet.has(a);
  }

  update(): void {
    this.heldSet.clear();
    this.pressedSet.clear();
    const JD = Phaser.Input.Keyboard.JustDown;
    const pad = this.scene.input.gamepad?.pad1;

    const touchEdge = this.touchEdge;
    for (let i = 0; i < TOUCH_BUTTONS.length; i++) {
      const tb = TOUCH_BUTTONS[i];
      touchEdge[tb] = touchState.presses[tb] !== this.touchSeen[tb];
      this.touchSeen[tb] = touchState.presses[tb];
    }

    for (let ci = 0; ci < CONTROLS.length; ci++) {
      const b = CONTROLS[ci];
      let held = false;
      let pressed = false;
      for (let ki = 0; ki < b.keys.length; ki++) {
        const key = this.keys[b.keys[ki]];
        if (!key) continue;
        if (key.isDown) held = true;
        if (JD(key)) pressed = true;
      }
      if (pad && b.padButton !== null) {
        const down = pad.buttons[b.padButton]?.pressed === true;
        if (down) held = true;
        if (down && !this.padPrev[b.padButton]) pressed = true;
      }
      if (b.touch) {
        if (touchState.held[b.touch]) held = true;
        if (touchEdge[b.touch]) {
          const door = this.doorAhead();
          if (!b.touchShared || (b.action === 'interact' ? door : !door)) pressed = true;
        }
      }
      if (this.queued.has(b.action)) pressed = true;
      if (held) this.heldSet.add(b.action);
      if (pressed) this.pressedSet.add(b.action);
    }
    const ptr = this.scene.input.activePointer;
    if (ptr.isDown && !(ptr.wasTouch && this.touchActive) && (!this.mouseLook || this.scene.input.mouse?.locked)) this.heldSet.add('fire');
    if (this.queued.size > 0) {
      this.queued.forEach((q) => this.pressedSet.add(q));
      this.queued.clear();
    }
    if (pad) for (let i = 0; i < pad.buttons.length; i++) this.padPrev[i] = pad.buttons[i].pressed;

    const m = this.move;
    m.forward = (this.held('forward') ? 1 : 0) - (this.held('back') ? 1 : 0);
    m.turn = (this.held('turnRight') ? 1 : 0) - (this.held('turnLeft') ? 1 : 0);
    m.strafe = (this.held('strafeRight') ? 1 : 0) - (this.held('strafeLeft') ? 1 : 0);
    if (pad && pad.axes.length >= 2) {
      const lx = pad.axes[0].getValue();
      const ly = pad.axes[1].getValue();
      const rx = pad.axes.length >= 3 ? pad.axes[2].getValue() : 0;
      if (Math.abs(ly) > DEADZONE) m.forward = -ly;
      if (Math.abs(lx) > DEADZONE) m.turn = lx;
      if (Math.abs(rx) > DEADZONE) m.turn = rx;
    }
    const touchTurning = touchState.held.left !== touchState.held.right;
    this.touchTurnT = touchTurning ? this.touchTurnT + 1 / 60 : 0;
    if (touchTurning && Math.abs(m.turn) === 1) m.turn *= Math.min(1, 0.5 + (this.touchTurnT / 0.35) * 0.5);
    m.turn *= this.sensitivity;
    m.look = this.lookAcc * this.sensitivity;
    this.lookAcc = 0;
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.scene.input.off('pointerdown');
  }
}
