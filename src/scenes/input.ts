// Movement and manual focus input for combat: keyboard, mouse, controller and touch (GDD 3.5).

import type Phaser from 'phaser';
import { DEFAULT_SETTINGS } from '../data/modes';
import type { GameSettings } from '../data/modes';
import { SCREEN } from '../data/screen';

type MoveKey = 'up' | 'down' | 'left' | 'right' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface JoystickState {
  active: boolean;
  pointerId: number;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
}

/** Radius of the floating joystick, logical pixels. */
export const JOYSTICK_RADIUS = 70;
const STICK_DEADZONE = 0.2;
const GAMEPAD_START = 9;
/** Distance of the focus point from the player for the controller's right stick. */
const STICK_FOCUS_DISTANCE = 260;

export interface FocusPoint {
  x: number;
  y: number;
}
const DPAD = { up: 12, down: 13, left: 14, right: 15 } as const;

export class CombatInput {
  readonly joystick: JoystickState = { active: false, pointerId: -1, baseX: 0, baseY: 0, knobX: 0, knobY: 0 };
  /** False while the game is paused: touches no longer start the joystick. */
  enabled = true;
  private readonly keys: Partial<Record<MoveKey, Phaser.Input.Keyboard.Key>>;
  private startWasDown = false;
  private speedWasDown = false;
  /** The touch holding manual focus on the free side. -1 means none. */
  private focusPointerId = -1;
  /** Toggle focus mode: focus stays on until the next press (GDD 3.10). */
  private focusLatched = false;
  private lastTouch: { x: number; y: number } | undefined;
  /** Joystick radius after the size setting. */
  readonly radius: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly prefs: GameSettings = DEFAULT_SETTINGS,
  ) {
    const keyboard = scene.input.keyboard;
    const keys = prefs.keys;
    // Remapped movement keys, with the arrow keys always on (GDD 3.10).
    this.keys = keyboard
      ? (keyboard.addKeys({ up: keys.up, down: keys.down, left: keys.left, right: keys.right, UP: 'UP', DOWN: 'DOWN', LEFT: 'LEFT', RIGHT: 'RIGHT' }) as Partial<
          Record<MoveKey, Phaser.Input.Keyboard.Key>
        >)
      : {};
    this.radius = JOYSTICK_RADIUS * prefs.joystickScale;
    if (keyboard && prefs.focusMode === 'toggle') keyboard.on(`keydown-${keys.focusToggle}`, this.toggleFocus, this);
    if (prefs.focusMode === 'toggle') scene.input.on('pointerdown', this.onMouseToggle, this);

    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('pointerupoutside', this.onPointerUp, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off(`keydown-${this.prefs.keys.focusToggle}`, this.toggleFocus, this);
    this.scene.input.off('pointerdown', this.onMouseToggle, this);
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerupoutside', this.onPointerUp, this);
  }

  private toggleFocus(): void {
    if (this.enabled) this.focusLatched = !this.focusLatched;
  }

  private onMouseToggle(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) this.toggleFocus();
  }

  /** True when a screen x lies on the joystick side. Left-handed players move on the right (GDD 3.10). */
  private onStickSide(x: number): boolean {
    return this.prefs.handedness === 'left' ? x >= SCREEN.width / 2 : x < SCREEN.width / 2;
  }

  /** The fixed joystick's centre, near the bottom corner of its side. */
  fixedBase(): { x: number; y: number } {
    const margin = 60 + this.radius;
    const x = this.prefs.handedness === 'left' ? SCREEN.width - margin : margin;
    return { x, y: SCREEN.height - margin };
  }

  /** A floating joystick appears where a touch lands on its side. A fixed one sits in the corner. */
  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled || !pointer.wasTouch) return;
    if (!this.onStickSide(pointer.x)) {
      // A touch on the free side of the screen holds manual focus (GDD 3.5). In toggle mode it switches focus.
      this.lastTouch = { x: pointer.x, y: pointer.y };
      if (this.prefs.focusMode === 'toggle') this.toggleFocus();
      else if (this.focusPointerId < 0) this.focusPointerId = pointer.id;
      return;
    }
    if (this.joystick.active) return;
    const base = this.prefs.joystickFixed ? this.fixedBase() : { x: pointer.x, y: pointer.y };
    this.joystick.active = true;
    this.joystick.pointerId = pointer.id;
    this.joystick.baseX = base.x;
    this.joystick.baseY = base.y;
    this.joystick.knobX = pointer.x;
    this.joystick.knobY = pointer.y;
    this.onPointerMove(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const joystick = this.joystick;
    if (!joystick.active || pointer.id !== joystick.pointerId) return;
    const dx = pointer.x - joystick.baseX;
    const dy = pointer.y - joystick.baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scale = distance > this.radius ? this.radius / distance : 1;
    joystick.knobX = joystick.baseX + dx * scale;
    joystick.knobY = joystick.baseY + dy * scale;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystick.pointerId) this.releaseJoystick();
    if (pointer.id === this.focusPointerId) this.focusPointerId = -1;
  }

  releaseJoystick(): void {
    this.joystick.active = false;
    this.joystick.pointerId = -1;
  }

  /** Drops every held touch, for pause and round end. */
  releaseAll(): void {
    this.releaseJoystick();
    this.focusPointerId = -1;
    this.focusLatched = false;
  }

  /**
   * Manual focus (GDD 3.4): a held mouse button, a second touch on the right
   * half, or the controller's right stick. Returns a point in arena pixels.
   */
  readFocus(camera: Phaser.Cameras.Scene2D.Camera, playerX: number, playerY: number): FocusPoint | undefined {
    if (!this.enabled) return undefined;

    // Toggle mode: focus stays on the pointer or the last touch until the next press (GDD 3.10).
    if (this.focusLatched) {
      const mouse = this.scene.input.mousePointer;
      const screen = this.lastTouch ?? (mouse ? { x: mouse.x, y: mouse.y } : undefined);
      if (screen) {
        const point = camera.getWorldPoint(screen.x, screen.y);
        return { x: point.x, y: point.y };
      }
    }

    if (this.focusPointerId >= 0) {
      const touch = this.scene.input.manager.pointers.find((pointer) => pointer.id === this.focusPointerId);
      if (touch && touch.isDown) {
        const point = camera.getWorldPoint(touch.x, touch.y);
        return { x: point.x, y: point.y };
      }
      this.focusPointerId = -1;
    }

    const mouse = this.scene.input.mousePointer;
    if (this.prefs.focusMode === 'hold' && mouse && mouse.isDown && !mouse.wasTouch) {
      const point = camera.getWorldPoint(mouse.x, mouse.y);
      return { x: point.x, y: point.y };
    }

    const pad = this.gamepad();
    if (pad) {
      const stickX = pad.axes[2] ?? 0;
      const stickY = pad.axes[3] ?? 0;
      const length = Math.hypot(stickX, stickY);
      if (length > STICK_DEADZONE) {
        return {
          x: playerX + (stickX / length) * STICK_FOCUS_DISTANCE,
          y: playerY + (stickY / length) * STICK_FOCUS_DISTANCE,
        };
      }
    }
    return undefined;
  }

  private gamepad(): Gamepad | undefined {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return undefined;
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.connected) return pad;
    }
    return undefined;
  }

  /** Movement direction with length 0 to 1. */
  readMove(): { moveX: number; moveY: number } {
    let x = 0;
    let y = 0;

    const joystick = this.joystick;
    if (joystick.active) {
      x = (joystick.knobX - joystick.baseX) / this.radius;
      y = (joystick.knobY - joystick.baseY) / this.radius;
    } else {
      const keys = this.keys;
      if (keys.left?.isDown || keys.LEFT?.isDown) x -= 1;
      if (keys.right?.isDown || keys.RIGHT?.isDown) x += 1;
      if (keys.up?.isDown || keys.UP?.isDown) y -= 1;
      if (keys.down?.isDown || keys.DOWN?.isDown) y += 1;

      const pad = this.gamepad();
      if (pad && x === 0 && y === 0) {
        const stickX = pad.axes[0] ?? 0;
        const stickY = pad.axes[1] ?? 0;
        if (Math.hypot(stickX, stickY) > STICK_DEADZONE) {
          x = stickX;
          y = stickY;
        } else {
          if (pad.buttons[DPAD.left]?.pressed) x -= 1;
          if (pad.buttons[DPAD.right]?.pressed) x += 1;
          if (pad.buttons[DPAD.up]?.pressed) y -= 1;
          if (pad.buttons[DPAD.down]?.pressed) y += 1;
        }
      }
    }

    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { moveX: x, moveY: y };
  }

  /** True on the frame the controller's pause button goes down. Start by default, remappable (GDD 3.10). */
  pausePressed(): boolean {
    const down = this.gamepad()?.buttons[this.prefs.pad.pause ?? GAMEPAD_START]?.pressed ?? false;
    const pressed = down && !this.startWasDown;
    this.startWasDown = down;
    return pressed;
  }

  /** True on the frame the controller's fast-forward button goes down. Select by default (GDD 3.5). */
  speedPressed(): boolean {
    const down = this.gamepad()?.buttons[this.prefs.pad.fastForward]?.pressed ?? false;
    const pressed = down && !this.speedWasDown;
    this.speedWasDown = down;
    return pressed;
  }
}
