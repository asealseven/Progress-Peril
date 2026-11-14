import Phaser from 'phaser';
import { music } from '../audio/music';
import { CHARACTERS } from '../data/characters';
import type { CharacterDef } from '../data/characters';
import { DISCIPLINES } from '../data/research';
import { masteryRank } from '../sim/archive';
import { fitImage, hasImage } from '../render/images';
import { PLAYER_KEY, ensurePlayerTexture } from '../render/placeholders';
import { PALETTE, hexToNumber } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { STARTING_WEAPONS } from '../data/weapons';
import type { WeaponDef } from '../data/weapons';
import { newSeed, parseSeed } from '../sim/rng';
import { archive, saveNow, saveRun, settings } from './session';
import { ASSIST_RATE, TIER_RATES, leversAt } from '../data/modes';
import { drawDamageIcon } from '../render/damageIcons';
import { Button } from '../ui/button';
import { weaponIcon } from '../ui/icons';
import { createRun } from '../sim/run';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary, uiScale } from './platform';

const COLUMNS = 3;
const CARD_WIDTH = 372;
const CARD_HEIGHT = 190;
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
    // The quiet Archive theme plays in menus (GDD 15.10).
    music.play({ kind: 'menu' });
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

    this.drawPortrait(character, 120, 96);

    const gridWidth = COLUMNS * CARD_WIDTH + (COLUMNS - 1) * CARD_GAP;
    const left = centreX - gridWidth / 2;
    STARTING_WEAPONS.forEach((weapon, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = left + column * (CARD_WIDTH + CARD_GAP);
      const y = GRID_TOP + row * (CARD_HEIGHT + CARD_GAP);
      this.addCard(weapon, index, x, y, s);
    });

    this.drawModeBar(centreX, 612);

    addText(this, centreX, height - 34, touch ? STRINGS.select.hintTouch : STRINGS.select.hintKeyboard, {
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
      else if (event.key === 'Escape') this.scene.start('Hub');
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

    // The weapon as a blueprint icon, with one shape per damage type (GDD 15.1).
    weaponIcon(this, weapon, x + 44, y + 44, 56);
    const shapes = this.add.graphics();
    weapon.damageTypes.forEach((type, typeIndex) => drawDamageIcon(shapes, type, x + CARD_WIDTH - 28 - typeIndex * 30, y + 30, 11));

    const title = addText(this, x + 84, y + 14, weapon.name, { role: 'heading', size: 30 });
    const room = CARD_WIDTH - 84 - 16 - weapon.damageTypes.length * 30;
    if (title.width > room) title.setScale(room / title.width);
    addText(this, x + 84, y + 54, `${weapon.family}  ·  ${weapon.damageTypes.join(' and ')}`, {
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

  /**
   * The character's portrait beside the map table (GDD 15.9), with the
   * highest mastery rank and the endless best. GDD 16.7 lists no traits yet.
   */
  private drawPortrait(character: CharacterDef, x: number, y: number): void {
    const ring = this.add.graphics();
    ring.fillStyle(hexToNumber(PALETTE.parchment), 1);
    ring.fillCircle(x, y, 46);
    ring.lineStyle(3, hexToNumber(PALETTE.brass), 1);
    ring.strokeCircle(x, y, 46);
    ensurePlayerTexture(this);
    fitImage(this.add.image(x, y, PLAYER_KEY), hasImage(PLAYER_KEY) ? 84 : 60);
    const saved = archive(this);
    const best = DISCIPLINES.reduce((top, discipline) => Math.max(top, saved.mastery[discipline]), 0);
    const endless = saved.bests.byCharacter[character.id] ?? 0;
    addText(this, x, y + 52, STRINGS.select.rank(masteryRank(best)), { size: 13, weight: '700', colour: PALETTE.brass }).setOrigin(0.5, 0);
    if (endless > 0) addText(this, x, y + 68, STRINGS.select.endlessBest(endless), { size: 13, colour: PALETTE.brass }).setOrigin(0.5, 0);
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

  /**
   * Assist mode and the Challenge Tier for this campaign (GDD 3.9), and the
   * Apprentice Trial on the first campaign (GDD 3.11). The choice stays for the next campaign.
   */
  private drawModeBar(centreX: number, y: number): void {
    const book = archive(this);
    const mode = book.lastMode;
    mode.tier = Math.min(mode.tier, book.tierUnlocked);
    const redraw = (): void => {
      this.scene.restart();
    };
    new Button(this, centreX - 400, y, {
      label: STRINGS.modes.assist(mode.assist),
      width: 230,
      height: 46,
      textSize: 18,
      selected: mode.assist,
      onClick: () => {
        mode.assist = !mode.assist;
        redraw();
      },
    });
    const tierLabel = mode.assist ? STRINGS.modes.tier(0) : STRINGS.modes.tier(mode.tier);
    new Button(this, centreX - 180, y, { label: '<', width: 46, height: 46, textSize: 22, enabled: !mode.assist && mode.tier > 0, onClick: () => ((mode.tier -= 1), redraw()) });
    addText(this, centreX - 40, y, tierLabel, { role: 'heading', size: 20 }).setOrigin(0.5);
    new Button(this, centreX + 100, y, {
      label: '>',
      width: 46,
      height: 46,
      textSize: 22,
      enabled: !mode.assist && mode.tier < book.tierUnlocked,
      onClick: () => ((mode.tier += 1), redraw()),
    });
    const levers = leversAt(mode.assist ? 0 : mode.tier).map((lever) => STRINGS.modes.lever[lever]).join(', ');
    const rate = mode.assist ? ASSIST_RATE : (TIER_RATES[mode.tier] ?? 1);
    addText(this, centreX - 40, y + 32, `${STRINGS.modes.rate(rate)}. ${mode.assist ? STRINGS.modes.assistNote : STRINGS.modes.levers(levers)}`, {
      size: 13,
      colour: PALETTE.brass,
      align: 'center',
      wrapWidth: 560,
    }).setOrigin(0.5, 0);
    // The Apprentice Trial opens the first campaign. Players can skip it (GDD 3.11).
    if (book.campaigns === 0) {
      const prefs = settings(this);
      new Button(this, centreX + 360, y, {
        label: STRINGS.trial.toggle(prefs.trial),
        width: 280,
        height: 46,
        textSize: 18,
        selected: prefs.trial,
        onClick: () => {
          prefs.trial = !prefs.trial;
          saveNow(this);
          redraw();
        },
      });
    }
  }

  private choose(index: number): void {
    const weapon = STARTING_WEAPONS[index];
    if (!weapon || !this.scene.isActive()) return;
    // A seed in the address (?seed=ABC123) replays a run, for reproducing bugs (GDD 15.14).
    const requested = new URLSearchParams(window.location.search).get('seed');
    const seed = (requested ? parseSeed(requested) : undefined) ?? newSeed();
    // The profile's Grand Archive goes with the run (GDD 15.13). A new campaign replaces a saved run.
    const book = archive(this);
    const mode = book.lastMode.assist ? { assist: true, tier: 0 } : { assist: false, tier: Math.min(book.lastMode.tier, book.tierUnlocked) };
    const run = createRun(seed, CHARACTERS.inventor, weapon, book, { mode, trial: settings(this).trial });
    saveRun(this, run);
    // The map reveals the first kingdom before Round 1 (GDD 5.7, 5.8).
    this.scene.start('Transition', { run });
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
