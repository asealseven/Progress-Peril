import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { DAMAGE_TYPE_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { STARTING_WEAPONS } from '../data/weapons';
import type { WeaponDef } from '../data/weapons';
import { newSeed, parseSeed } from '../sim/rng';
import { createArchive } from '../sim/archive';
import type { ArchiveState } from '../sim/archive';
import { createRun } from '../sim/run';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary, uiScale } from './platform';

const COLUMNS = 3;
const CARD_WIDTH = 372;
const CARD_HEIGHT = 216;
const CARD_GAP = 20;
const GRID_TOP = 176;
const HOVER_FILL = 0xe6d9bd;
const STICK_THRESHOLD = 0.5;

/**
 * Character selection (GDD 15.9). One character so far, The Inventor, with a
 * free choice of one starting weapon (CLAUDE.md "Characters"). Milestone 11
 * restyles the screen.
 */
export class CharacterSelect extends Phaser.Scene {
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;
  private padMoved = true;
  private padConfirmDown = true;

  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    const { width, height } = SCREEN;
    const centreX = width / 2;
    const s = uiScale();
    const touch = isTouchPrimary();
    const character = CHARACTERS.inventor;
    this.cards = [];
    this.selected = 0;
    this.padMoved = true;
    this.padConfirmDown = true;

    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height);

    addText(this, centreX, 74, STRINGS.select.heading, { role: 'heading', size: 52 }).setOrigin(0.5);
    addText(this, centreX, 128, STRINGS.select.character(character.name), {
      role: 'hand',
      size: 30,
      colour: PALETTE.brass,
    }).setOrigin(0.5);

    const gridWidth = COLUMNS * CARD_WIDTH + (COLUMNS - 1) * CARD_GAP;
    const left = centreX - gridWidth / 2;
    STARTING_WEAPONS.forEach((weapon, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = left + column * (CARD_WIDTH + CARD_GAP);
      const y = GRID_TOP + row * (CARD_HEIGHT + CARD_GAP);
      this.addCard(weapon, index, x, y, s);
    });

    addText(this, centreX, height - 50, touch ? STRINGS.select.hintTouch : STRINGS.select.hintKeyboard, {
      size: 17 * s,
      colour: PALETTE.brass,
      weight: '500',
    }).setOrigin(0.5);

    this.highlight();

    const keyboard = this.input.keyboard;
    const onKey = (event: KeyboardEvent): void => {
      const digit = Number.parseInt(event.key, 10);
      if (digit >= 1 && digit <= STARTING_WEAPONS.length) this.choose(digit - 1);
      else if (event.key === 'ArrowRight' || event.key === 'd') this.move(1, 0);
      else if (event.key === 'ArrowLeft' || event.key === 'a') this.move(-1, 0);
      else if (event.key === 'ArrowDown' || event.key === 's') this.move(0, 1);
      else if (event.key === 'ArrowUp' || event.key === 'w') this.move(0, -1);
      else if (event.key === 'Enter' || event.key === ' ') this.choose(this.selected);
      else if (event.key === 'Escape') this.scene.start('Boot');
    };
    keyboard?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown', onKey));
  }

  private addCard(weapon: WeaponDef, index: number, x: number, y: number, s: number): void {
    const parchment = hexToNumber(PALETTE.parchment);
    const card = this.add.rectangle(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, parchment, 1);
    card.setStrokeStyle(3, hexToNumber(PALETTE.ink), 1);
    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => {
      this.selected = index;
      this.highlight();
    });
    card.on('pointerup', () => this.choose(index));
    this.cards.push(card);

    // A swatch in the damage type colour, as on blueprint cards (GDD 15.1).
    const type = weapon.damageTypes[0] ?? 'Impact';
    const swatch = this.add.graphics();
    swatch.fillStyle(hexToNumber(DAMAGE_TYPE_COLOURS[type]), 1);
    swatch.fillCircle(x + CARD_WIDTH - 30, y + 32, 12);
    swatch.lineStyle(2, hexToNumber(PALETTE.ink), 1);
    swatch.strokeCircle(x + CARD_WIDTH - 30, y + 32, 12);

    addText(this, x + 18, y + 14, weapon.name, { role: 'heading', size: 30 });
    addText(this, x + 18, y + 54, `${weapon.family}  ·  ${weapon.damageTypes.join(' and ')}`, {
      size: 16 * s,
      colour: PALETTE.brass,
      weight: '700',
    });
    addText(this, x + 18, y + 84, weapon.description, { size: 17 * s, wrapWidth: CARD_WIDTH - 36 });
    addText(
      this,
      x + 18,
      y + CARD_HEIGHT - 16,
      STRINGS.select.stats(weapon.damage, weapon.attackSpeed, weapon.range, weapon.area),
      { size: 13 * s, weight: '500', wrapWidth: CARD_WIDTH - 60 },
    ).setOrigin(0, 1);
    addText(this, x + CARD_WIDTH - 16, y + CARD_HEIGHT - 12, `${index + 1}`, {
      role: 'hand',
      size: 26,
      colour: PALETTE.brass,
    }).setOrigin(1, 1);
  }

  private highlight(): void {
    this.cards.forEach((card, index) => {
      const active = index === this.selected;
      card.setFillStyle(active ? HOVER_FILL : hexToNumber(PALETTE.parchment), 1);
      card.setStrokeStyle(active ? 5 : 3, hexToNumber(active ? PALETTE.brass : PALETTE.ink), 1);
    });
  }

  private move(dx: number, dy: number): void {
    const rows = Math.ceil(STARTING_WEAPONS.length / COLUMNS);
    const column = (((this.selected % COLUMNS) + dx) % COLUMNS + COLUMNS) % COLUMNS;
    const row = ((Math.floor(this.selected / COLUMNS) + dy) % rows + rows) % rows;
    this.selected = Math.min(STARTING_WEAPONS.length - 1, row * COLUMNS + column);
    this.highlight();
  }

  private choose(index: number): void {
    const weapon = STARTING_WEAPONS[index];
    if (!weapon || !this.scene.isActive()) return;
    // A seed in the address (?seed=ABC123) replays a run, for reproducing bugs (GDD 15.14).
    const requested = new URLSearchParams(window.location.search).get('seed');
    const seed = (requested ? parseSeed(requested) : undefined) ?? newSeed();
    // One Archive lasts the whole session: mastery and hidden nodes carry between runs (GDD 8.13).
    // Milestone 9 moves the Archive into the save.
    let archive = this.registry.get('archive') as ArchiveState | undefined;
    if (!archive) {
      archive = createArchive();
      this.registry.set('archive', archive);
    }
    // The map reveals the first kingdom before Round 1 (GDD 5.7, 5.8).
    this.scene.start('Transition', { run: createRun(seed, CHARACTERS.inventor, weapon, archive) });
  }

  /** Controller: stick or D-pad moves the highlight, A confirms (GDD 3.5). */
  override update(): void {
    if (typeof navigator.getGamepads !== 'function') return;
    let x = 0;
    let y = 0;
    let confirm = false;
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      const stickX = pad.axes[0] ?? 0;
      const stickY = pad.axes[1] ?? 0;
      if (stickX > STICK_THRESHOLD || pad.buttons[15]?.pressed) x = 1;
      else if (stickX < -STICK_THRESHOLD || pad.buttons[14]?.pressed) x = -1;
      if (stickY > STICK_THRESHOLD || pad.buttons[13]?.pressed) y = 1;
      else if (stickY < -STICK_THRESHOLD || pad.buttons[12]?.pressed) y = -1;
      if (pad.buttons[0]?.pressed) confirm = true;
    }
    const moved = x !== 0 || y !== 0;
    if (moved && !this.padMoved) this.move(x, y);
    this.padMoved = moved;
    if (confirm && !this.padConfirmDown) this.choose(this.selected);
    this.padConfirmDown = confirm;
  }
}
