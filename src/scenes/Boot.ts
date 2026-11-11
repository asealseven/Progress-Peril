import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { PALETTE, hexToNumber } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { WEAPONS } from '../data/weapons';
import { newSeed, parseSeed } from '../sim/rng';
import { createRun } from '../sim/run';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary, uiScale } from './platform';

/** Ignores input for a moment, so a held key or a stray tap never skips the title. */
const START_GUARD_MS = 350;

/** Title screen: "Progress & Peril" on parchment. Any input starts a run. */
export class Boot extends Phaser.Scene {
  private readyAt = 0;

  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = SCREEN;
    const centreX = width / 2;
    const touch = isTouchPrimary();
    const s = uiScale();

    this.cameras.main.setBackgroundColor(PALETTE.parchment);

    const frame = this.add.graphics();
    drawPageFrame(frame, width, height);

    addText(this, centreX, 210, STRINGS.setting, {
      role: 'hand',
      size: 34,
      colour: PALETTE.brass,
    }).setOrigin(0.5);

    addText(this, centreX, 290, STRINGS.title, {
      role: 'heading',
      size: 96,
    }).setOrigin(0.5);

    const rule = this.add.graphics();
    rule.lineStyle(2, hexToNumber(PALETTE.brass), 1);
    rule.lineBetween(centreX - 260, 360, centreX + 260, 360);
    rule.fillStyle(hexToNumber(PALETTE.brass), 1);
    rule.fillCircle(centreX, 360, 5);

    addText(this, centreX, 400, STRINGS.tagline, {
      role: 'body',
      size: 26,
    }).setOrigin(0.5);

    const prompt = addText(this, centreX, 520, touch ? STRINGS.boot.startTouch : STRINGS.boot.startKeyboard, {
      role: 'heading',
      size: 34 * s,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    addText(this, centreX, 610, touch ? STRINGS.boot.controlsTouch : STRINGS.boot.controlsKeyboard, {
      size: 17 * s,
      colour: PALETTE.brass,
      weight: '500',
      align: 'center',
      wrapWidth: 900,
    }).setOrigin(0.5);

    this.readyAt = this.time.now + START_GUARD_MS;
    this.time.delayedCall(START_GUARD_MS, () => {
      this.input.once('pointerup', this.startRun, this);
      this.input.keyboard?.once('keydown', this.startRun, this);
    });
  }

  /** Controller: any face button starts a run. */
  override update(time: number): void {
    if (time < this.readyAt || typeof navigator.getGamepads !== 'function') return;
    for (const pad of navigator.getGamepads()) {
      if (pad && pad.buttons.slice(0, 4).some((button) => button.pressed)) {
        this.startRun();
        return;
      }
    }
  }

  private startRun(): void {
    if (!this.scene.isActive()) return;
    // A seed in the address (?seed=ABC123) replays a run, for reproducing bugs (GDD 15.14).
    const requested = new URLSearchParams(window.location.search).get('seed');
    const seed = (requested ? parseSeed(requested) : undefined) ?? newSeed();
    const run = createRun(seed, CHARACTERS.inventor, WEAPONS.crossbow);
    this.scene.start('Combat', { run });
  }
}
