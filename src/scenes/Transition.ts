import Phaser from 'phaser';
import { KINGDOMS, KINGDOM_NAMES } from '../data/kingdoms';
import { KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { KingdomName } from '../data/palette';
import { territorySlot } from '../data/rounds';
import { SCREEN } from '../data/screen';
import { STORY } from '../data/story';
import { STRINGS } from '../data/strings';
import { revealKingdom } from '../sim/run';
import type { RunState } from '../sim/run';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary } from './platform';

export interface TransitionData {
  run: RunState;
  /** The opening card shows first, on the first campaign only (GDD 2.4). */
  step?: 'opening' | 'reveal';
}

/** Where each kingdom sits on the map of the five kingdoms. */
const MAP_POSITIONS: Readonly<Record<KingdomName, { x: number; y: number }>> = {
  Keldrath: { x: 180, y: 260 },
  Merovant: { x: 410, y: 150 },
  Orthelyn: { x: 640, y: 270 },
  Nymora: { x: 560, y: 480 },
  Myrathis: { x: 260, y: 480 },
};

const INK = hexToNumber(PALETTE.ink);
const BRASS = hexToNumber(PALETTE.brass);
const DANGER = hexToNumber(PALETTE.danger);
const REVEAL_MS = 900;

/**
 * The territory transition (GDD 5.8, steps 6 and 7): after preparation the
 * map of the five kingdoms reveals the next kingdom with its story card.
 * The player dismisses the card and the round begins in the new arena.
 * Every card is skippable (GDD 2.4).
 */
export class Transition extends Phaser.Scene {
  private run!: RunState;
  private step: 'opening' | 'reveal' = 'reveal';
  private advance: () => void = () => undefined;

  constructor() {
    super('Transition');
  }

  init(data: TransitionData): void {
    this.run = data.run;
    this.step = data.step ?? (data.run.round === 1 && data.run.firstCampaign ? 'opening' : 'reveal');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), SCREEN.width, SCREEN.height, 14);
    if (this.step === 'opening') this.drawOpening();
    else this.drawReveal();

    const keyboard = this.input.keyboard;
    const onKey = (): void => this.advance();
    keyboard?.on('keydown-ENTER', onKey);
    keyboard?.on('keydown-SPACE', onKey);
    keyboard?.on('keydown-ESC', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ENTER', onKey);
      keyboard?.off('keydown-SPACE', onKey);
      keyboard?.off('keydown-ESC', onKey);
    });
  }

  private hint(): void {
    addText(this, SCREEN.width / 2, SCREEN.height - 44, isTouchPrimary() ? STRINGS.transition.hintTouch : STRINGS.transition.hintKeyboard, {
      size: 16,
      colour: PALETTE.brass,
    }).setOrigin(0.5);
  }

  /** The opening card, first campaign only (GDD 2.4). */
  private drawOpening(): void {
    const centreX = SCREEN.width / 2;
    addText(this, centreX, 120, STRINGS.transition.openingTitle, { role: 'heading', size: 54 }).setOrigin(0.5);
    addText(this, centreX, 200, STORY.premise, { size: 20, align: 'center', wrapWidth: 900, colour: PALETTE.brass }).setOrigin(0.5, 0);
    addText(this, centreX, 360, STORY.opening, { role: 'hand', size: 34, align: 'center', wrapWidth: 940 }).setOrigin(0.5, 0);
    this.advance = () => this.scene.restart({ run: this.run, step: 'reveal' });
    new Button(this, centreX, SCREEN.height - 110, {
      label: STRINGS.transition.continue,
      width: 300,
      height: 60,
      textSize: 26,
      onClick: () => this.advance(),
    });
    this.hint();
  }

  /** The map reveals the next kingdom, then its story card (GDD 5.8). */
  private drawReveal(): void {
    const run = this.run;
    const kingdom = revealKingdom(run);
    const territory = territorySlot(run.round);
    const centreX = SCREEN.width / 2;

    addText(this, centreX, 60, STRINGS.transition.mapTitle, { role: 'heading', size: 40 }).setOrigin(0.5);
    addText(this, centreX, 104, run.endless ? STRINGS.transition.endlessTerritory(territory + 1) : STRINGS.transition.territory(territory + 1), {
      size: 18,
      colour: PALETTE.brass,
      weight: '700',
    }).setOrigin(0.5);
    // Endless mode shows a short card at each new loop (GDD 2.4).
    if (run.endless && territory % 5 === 0) {
      addText(this, centreX, 650, `${STRINGS.modes.endlessLoop}: ${STORY.endlessLoop}`, { role: 'hand', size: 24, colour: PALETTE.brass }).setOrigin(0.5);
    }

    // The route so far, in the order visited.
    const map = this.add.graphics();
    map.lineStyle(3, BRASS, 0.8);
    const route = run.kingdoms.slice(0, territory + 1).filter((name): name is KingdomName => name !== undefined);
    for (let index = 1; index < route.length; index++) {
      const from = MAP_POSITIONS[route[index - 1] ?? kingdom];
      const to = MAP_POSITIONS[route[index] ?? kingdom];
      map.lineBetween(from.x, from.y, to.x, to.y);
    }

    for (const name of KINGDOM_NAMES) {
      const point = MAP_POSITIONS[name];
      const colour = hexToNumber(KINGDOM_COLOURS[name]);
      const visited = run.kingdoms.slice(0, territory).includes(name);
      const next = name === kingdom;
      map.fillStyle(colour, next || visited ? 1 : 0.35);
      map.fillCircle(point.x, point.y, 46);
      map.lineStyle(3, INK, 1);
      map.strokeCircle(point.x, point.y, 46);
      addText(this, point.x, point.y + 56, name, { role: 'heading', size: 22, colour: next ? PALETTE.ink : PALETTE.brass }).setOrigin(0.5, 0);
      if (visited) {
        // A beaten kingdom carries an ink cross.
        map.lineStyle(5, INK, 0.9);
        map.lineBetween(point.x - 22, point.y - 22, point.x + 22, point.y + 22);
        map.lineBetween(point.x + 22, point.y - 22, point.x - 22, point.y + 22);
      }
    }

    // The reveal: a ring closes on the next kingdom.
    const target = MAP_POSITIONS[kingdom];
    const ring = this.add.circle(target.x, target.y, 140).setStrokeStyle(5, DANGER, 1).setFillStyle(0, 0);
    this.tweens.add({ targets: ring, radius: 58, duration: REVEAL_MS, ease: 'Cubic.easeOut' });

    // The story card (GDD 2.4).
    const def = KINGDOMS[kingdom];
    const cardX = 1010;
    const card = this.add.graphics();
    card.fillStyle(0xe9dfc8, 1);
    card.fillRect(cardX - 230, 150, 460, 420);
    card.lineStyle(3, INK, 1);
    card.strokeRect(cardX - 230, 150, 460, 420);
    card.fillStyle(hexToNumber(KINGDOM_COLOURS[kingdom]), 1);
    card.fillRect(cardX - 230, 150, 460, 14);
    const parts = [
      addText(this, cardX, 184, def.title, { role: 'heading', size: 28, align: 'center', wrapWidth: 420 }).setOrigin(0.5, 0),
      addText(this, cardX, 270, STORY.reveal[kingdom], { role: 'hand', size: 28, align: 'center', wrapWidth: 410 }).setOrigin(0.5, 0),
      addText(this, cardX, 470, STRINGS.transition.specialisation(def.specialisation), {
        size: 16,
        colour: PALETTE.brass,
        weight: '700',
        align: 'center',
        wrapWidth: 410,
      }).setOrigin(0.5, 0),
    ];
    for (const part of parts) {
      part.setAlpha(0);
      this.tweens.add({ targets: part, alpha: 1, delay: REVEAL_MS * 0.6, duration: 400 });
    }

    this.advance = () => this.scene.start('Combat', { run });
    new Button(this, cardX, 620, {
      label: STRINGS.transition.begin(run.round),
      width: 340,
      height: 60,
      textSize: 26,
      onClick: () => this.advance(),
    });
    this.hint();
  }
}
