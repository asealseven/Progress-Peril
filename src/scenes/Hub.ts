import Phaser from 'phaser';
import { music } from '../audio/music';
import { CHALLENGES, CHALLENGE_IDS, GRANDMASTER_TITLE, MASTER_MECHANICS, MASTERY_OPENS, PERMANENT_UPGRADES, SPECIALISATION_COST, UPGRADE_IDS } from '../data/archive';
import { ENEMY_LIST } from '../data/enemies';
import { KINGDOMS, KINGDOM_NAMES } from '../data/kingdoms';
import { PALETTE, hexToNumber } from '../data/palette';
import { RELIC_LIST } from '../data/relics';
import { DISCIPLINES, RESEARCH_NODES } from '../data/research';
import type { ResearchNodeDef } from '../data/research';
import { SCREEN } from '../data/screen';
import { SPECIALISATION_LIST } from '../data/specialisations';
import { REACTIONS, REACTION_DEFS, STATUS_EFFECTS } from '../data/statusEffects';
import type { StatusEffect } from '../data/statusEffects';
import { STORY } from '../data/story';
import { STRINGS } from '../data/strings';
import { SYNERGY_LIST } from '../data/synergies';
import {
  buySpecialisation,
  buyUpgrade,
  discoverNode,
  discoveryCost,
  discoveryProblem,
  hasRank,
  masteryRank,
  nextRank,
  refundSpecialisation,
  refundUpgrade,
  specialisationSlots,
  toggleSpecialisation,
  upgradeStepCost,
} from '../sim/archive';
import { assetKey } from '../data/assets';
import { hasImage } from '../render/images';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary } from './platform';
import { archive, inSandbox, profile, saveNow } from './session';
import { DEV_TOOLS } from './devTools';

type View = 'hall' | 'archive' | 'codex' | 'trophies';
type ArchiveTab = 'discoveries' | 'upgrades' | 'specialisations';
type CodexTab = 'enemies' | 'synergies' | 'reactions' | 'relics' | 'lore' | 'endings';
/** The six research areas of the Grand Archive (GDD 11.1). */
type Area = (typeof DISCIPLINES)[number] | 'Interdisciplinary';

interface HubView {
  view: View;
  archiveTab: ArchiveTab;
  codexTab: CodexTab;
  area: Area;
  page: number;
  message?: string;
}

export interface HubData {
  view?: HubView;
}

const INK = hexToNumber(PALETTE.ink);
const HALL_KEY = assetKey('hub', 'grand-archive');
const BRASS = hexToNumber(PALETTE.brass);
const PANEL = 0xe9dfc8;
const ROWS = 7;
const ROW_HEIGHT = 64;
const LIST_TOP = 186;

/**
 * The main menu: the Grand Archive's library hall (GDD 15.6). Each object is a
 * hotspot. Phones add a list menu along the side. The Archive, the Codex and
 * the trophy cabinet open as panels in this scene.
 */
export class Hub extends Phaser.Scene {
  private state!: HubView;

  constructor() {
    super('Hub');
  }

  init(data: HubData): void {
    this.state = data.view ?? { view: 'hall', archiveTab: 'discoveries', codexTab: 'enemies', area: 'Chemistry', page: 0 };
  }

  create(): void {
    // The quiet Archive theme plays in menus (GDD 15.10).
    music.play({ kind: 'menu' });
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), SCREEN.width, SCREEN.height, 14);
    if (this.state.view === 'hall') this.drawHall();
    else {
      this.drawHeader();
      if (this.state.view === 'archive') this.drawArchive();
      else if (this.state.view === 'codex') this.drawCodex();
      else this.drawTrophies();
    }
    const keyboard = this.input.keyboard;
    const back = (): void => {
      if (this.state.view !== 'hall') this.go((next) => (next.view = 'hall'));
    };
    keyboard?.on('keydown-ESC', back);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-ESC', back));
  }

  private go(change: (next: HubView) => void): void {
    const view = this.state.view;
    change(this.state);
    // A message belongs to the panel that made it.
    if (this.state.view !== view) this.state.message = undefined;
    this.scene.restart({ view: this.state });
  }

  /** Runs an Archive action, saves and redraws with a line about the result. */
  private act(done: boolean, success: string, failure: string): void {
    if (done) saveNow(this);
    this.go((next) => (next.message = done ? success : failure));
  }

  // --- The hall ----------------------------------------------------------------

  private drawHall(): void {
    const g = this.add.graphics();
    const saved = profile(this);
    const hasRun = saved.run !== undefined && saved.run.status === 'active';
    // The library hall illustration (ART_PROMPTS.md: hub/grand-archive.png), or a placeholder of boxes.
    const painted = hasImage(HALL_KEY);
    if (painted) {
      this.add.image(SCREEN.width / 2, SCREEN.height / 2, HALL_KEY).setDisplaySize(SCREEN.width, SCREEN.height);
    } else {
      g.fillStyle(0xe2d4b6, 1);
      g.fillRect(40, 110, SCREEN.width - 80, 560);
      g.fillStyle(0xcdb98f, 1);
      g.fillTriangle(140, 110, 640, 40, 1140, 110);
    }

    addText(this, SCREEN.width / 2, 58, STRINGS.title, { role: 'heading', size: 48 }).setOrigin(0.5);
    addText(this, 60, 30, `${saved.name}  ·  ${STRINGS.hub.points(archive(this).points)}`, { size: 17, weight: '700', colour: PALETTE.brass });

    const hotspots: Array<{ x: number; y: number; w: number; h: number; colour: number; label: string; open: () => void; show: boolean }> = [
      { x: 470, y: 420, w: 340, h: 150, colour: 0x8c6a46, label: STRINGS.hub.mapTable, open: () => this.scene.start('CharacterSelect'), show: true },
      { x: 860, y: 430, w: 110, h: 110, colour: 0xb3262e, label: STRINGS.hub.continueSeal, open: () => this.continueRun(), show: hasRun },
      { x: 80, y: 150, w: 260, h: 360, colour: 0x6b4e2e, label: STRINGS.hub.shelves, open: () => this.go((next) => ((next.view = 'archive'), (next.page = 0), (next.message = undefined))), show: true },
      { x: 120, y: 540, w: 200, h: 110, colour: 0x8c6a36, label: STRINGS.hub.lectern, open: () => this.go((next) => ((next.view = 'codex'), (next.page = 0))), show: true },
      { x: 940, y: 150, w: 260, h: 260, colour: 0x7a6a52, label: STRINGS.hub.trophies, open: () => this.go((next) => (next.view = 'trophies')), show: true },
      { x: 1040, y: 470, w: 160, h: 170, colour: 0xc8902a, label: STRINGS.hub.lamp, open: () => this.scene.start('Settings'), show: true },
    ];
    for (const spot of hotspots) {
      if (!spot.show) continue;
      // Over the illustration, hotspots are clear until the pointer finds them (GDD 15.6).
      const zone = this.add.rectangle(spot.x, spot.y, spot.w, spot.h, spot.colour, painted ? 0.001 : 0.85).setOrigin(0);
      const rest = painted ? 0 : 1;
      zone.setStrokeStyle(4, INK, rest);
      zone.setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => zone.setStrokeStyle(6, hexToNumber(PALETTE.playerEffects), 1));
      zone.on('pointerout', () => zone.setStrokeStyle(4, INK, rest));
      zone.on('pointerup', spot.open);
      addText(this, spot.x + spot.w / 2, spot.y + spot.h / 2, spot.label, {
        role: 'heading',
        size: 24,
        colour: PALETTE.parchment,
        align: 'center',
        wrapWidth: spot.w - 16,
      })
        .setOrigin(0.5)
        .setStroke(PALETTE.ink, 4);
    }

    // Dev tools only: the Test Lab, for jumping to any kingdom, round or screen.
    if (DEV_TOOLS) {
      new Button(this, SCREEN.width - 150, 52, {
        label: inSandbox(this) ? STRINGS.lab.openSandbox : STRINGS.lab.open,
        width: 240,
        height: 44,
        textSize: 18,
        onClick: () => this.scene.start('TestLab'),
      }).setDepth(20);
      const keyboard = this.input.keyboard;
      const open = (): void => {
        this.scene.start('TestLab');
      };
      keyboard?.once('keydown-T', open);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-T', open));
    }

    // Phones add a list menu along the side (GDD 15.6). PC keys: Enter starts, C continues.
    if (isTouchPrimary()) {
      const items = hotspots.filter((spot) => spot.show);
      const panel = this.add.rectangle(SCREEN.width - 300, 100, 290, 90 + items.length * 74, PANEL, 0.97).setOrigin(0).setDepth(9);
      panel.setStrokeStyle(3, INK, 1);
      items.forEach((spot, index) => {
        new Button(this, SCREEN.width - 150, 150 + index * 74, { label: spot.label, width: 260, height: 64, textSize: 22, onClick: spot.open }).setDepth(10);
      });
    } else {
      addText(this, SCREEN.width / 2, SCREEN.height - 34, hasRun ? STRINGS.hub.keysContinue : STRINGS.hub.keys, { size: 16, colour: PALETTE.brass }).setOrigin(0.5);
      const keyboard = this.input.keyboard;
      const start = (): void => {
        this.scene.start('CharacterSelect');
      };
      const resume = (): void => {
        if (hasRun) this.continueRun();
      };
      keyboard?.once('keydown-ENTER', start);
      keyboard?.once('keydown-C', resume);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        keyboard?.off('keydown-ENTER', start);
        keyboard?.off('keydown-C', resume);
      });
    }
  }

  /** Resumes the saved run at its last preparation phase (GDD 15.13). */
  private continueRun(): void {
    const run = profile(this).run;
    if (!run || run.status !== 'active') return;
    if (run.history.length === 0) this.scene.start('Transition', { run });
    else this.scene.start('Preparation', { run });
  }

  // --- Panels ------------------------------------------------------------------

  private drawHeader(): void {
    const titles: Record<Exclude<View, 'hall'>, string> = {
      archive: STRINGS.hub.shelves,
      codex: STRINGS.hub.lectern,
      trophies: STRINGS.hub.trophies,
    };
    const view = this.state.view as Exclude<View, 'hall'>;
    addText(this, 60, 40, titles[view], { role: 'heading', size: 40 });
    addText(this, SCREEN.width - 230, 50, STRINGS.hub.points(archive(this).points), { size: 20, weight: '700', colour: PALETTE.brass }).setOrigin(1, 0);
    new Button(this, SCREEN.width - 120, 62, { label: STRINGS.hub.back, width: 160, height: 50, textSize: 22, onClick: () => this.go((next) => (next.view = 'hall')) });
    if (this.state.message) addText(this, SCREEN.width / 2, SCREEN.height - 36, this.state.message, { size: 17, weight: '700', colour: PALETTE.danger }).setOrigin(0.5);
  }

  private tabs<T extends string>(entries: ReadonlyArray<readonly [T, string]>, current: T, y: number, pick: (tab: T) => void, width = 190): void {
    entries.forEach(([tab, label], index) => {
      new Button(this, 60 + width / 2 + index * (width + 8), y, {
        label,
        width,
        height: 44,
        textSize: 18,
        selected: tab === current,
        onClick: () => pick(tab),
      });
    });
  }

  private pager(total: number): number {
    const pages = Math.max(1, Math.ceil(total / ROWS));
    const page = Math.min(this.state.page, pages - 1);
    if (pages > 1) {
      const y = LIST_TOP + ROWS * ROW_HEIGHT + 24;
      new Button(this, SCREEN.width / 2 - 120, y, { label: '<', width: 60, height: 40, textSize: 22, enabled: page > 0, onClick: () => this.go((next) => (next.page = page - 1)) });
      addText(this, SCREEN.width / 2, y, STRINGS.prep.page(page + 1, pages), { size: 17 }).setOrigin(0.5);
      new Button(this, SCREEN.width / 2 + 120, y, { label: '>', width: 60, height: 40, textSize: 22, enabled: page < pages - 1, onClick: () => this.go((next) => (next.page = page + 1)) });
    }
    return page;
  }

  /** One list row: a title, a line of detail and an optional action on the right. */
  private row(index: number, title: string, detail: string, action?: { label: string; enabled: boolean; onClick: () => void }, known = true): void {
    const y = LIST_TOP + index * ROW_HEIGHT;
    const g = this.add.graphics();
    g.fillStyle(PANEL, known ? 1 : 0.5);
    g.fillRect(60, y, SCREEN.width - 120, ROW_HEIGHT - 6);
    g.lineStyle(2, INK, known ? 1 : 0.4);
    g.strokeRect(60, y, SCREEN.width - 120, ROW_HEIGHT - 6);
    addText(this, 76, y + 6, title, { role: 'heading', size: 20 });
    addText(this, 76, y + 32, detail, { size: 14, colour: PALETTE.brass, weight: '500', wrapWidth: action ? 820 : 1100 });
    if (action) new Button(this, SCREEN.width - 190, y + (ROW_HEIGHT - 6) / 2, { label: action.label, width: 240, height: 44, textSize: 17, enabled: action.enabled, onClick: action.onClick });
  }

  // --- Archive: discoveries, permanent upgrades, specialisations (GDD 11.10 to 11.12) ---

  private drawArchive(): void {
    const state = this.state;
    this.tabs<ArchiveTab>(
      [
        ['discoveries', STRINGS.hub.discoveries],
        ['upgrades', STRINGS.hub.upgrades],
        ['specialisations', STRINGS.hub.specialisations],
      ],
      state.archiveTab,
      118,
      (tab) => this.go((next) => ((next.archiveTab = tab), (next.page = 0), (next.message = undefined))),
      220,
    );
    if (state.archiveTab === 'discoveries') this.drawDiscoveries();
    else if (state.archiveTab === 'upgrades') this.drawUpgrades();
    else this.drawSpecialisations();
  }

  private drawDiscoveries(): void {
    const state = this.state;
    const areas: Area[] = [...DISCIPLINES, 'Interdisciplinary'];
    areas.forEach((area, index) => {
      new Button(this, 60 + 88 + index * 184, 156, {
        label: area,
        width: 176,
        height: 30,
        textSize: 15,
        selected: state.area === area,
        onClick: () => this.go((next) => ((next.area = area), (next.page = 0))),
      });
    });
    const nodes = RESEARCH_NODES.filter((node) => {
      if (node.ring === 'Centre' || node.ring === 'Hidden') return false;
      if (state.area === 'Interdisciplinary') return node.ring === 'Cross';
      return node.ring !== 'Cross' && node.disciplines[0] === state.area;
    });
    const page = this.pager(nodes.length);
    nodes.slice(page * ROWS, page * ROWS + ROWS).forEach((node, index) => this.discoveryRow(index, node));
  }

  private discoveryRow(index: number, node: ResearchNodeDef): void {
    const book = archive(this);
    const known = book.discovered.has(node.id);
    const problem = discoveryProblem(book, node);
    const cost = discoveryCost(node) ?? 0;
    const detail = `${STRINGS.research.rings[node.ring]}  ·  ${node.effect}`;
    if (known) {
      this.row(index, node.name, detail, { label: STRINGS.hub.discovered, enabled: false, onClick: () => undefined });
      return;
    }
    const label = problem === 'mastery' ? STRINGS.hub.needsMastery(node.ring === 'Outer' ? 'Expert' : 'Practitioner') : problem === 'requirements' ? STRINGS.hub.needsRequired : STRINGS.hub.discover(cost);
    this.row(
      index,
      node.name,
      node.requires.length > 0 ? `${detail}  ·  ${STRINGS.research.requires}: ${node.requires.join(', ')}` : detail,
      {
        label,
        enabled: problem === undefined,
        onClick: () => this.act(discoverNode(book, node) === undefined, STRINGS.hub.discoveredNode(node.name), STRINGS.hub.notEnough),
      },
      false,
    );
  }

  private drawUpgrades(): void {
    const book = archive(this);
    UPGRADE_IDS.forEach((id, index) => {
      const def = PERMANENT_UPGRADES[id];
      const steps = book.upgrades[id];
      const cost = upgradeStepCost(book, id);
      const detail = STRINGS.hub.upgradeLine(steps, def.costs.length, STRINGS.hub.upgradeValue(def.unit, steps * def.perStep));
      this.row(index, def.name, detail, {
        label: cost === undefined ? STRINGS.hub.maxed : STRINGS.hub.buyStep(cost),
        enabled: cost !== undefined && book.points >= cost,
        onClick: () => this.act(buyUpgrade(book, id), STRINGS.hub.bought(def.name), STRINGS.hub.notEnough),
      });
      if (steps > 0) {
        // Resets refund 90 per cent (GDD 11.8).
        new Button(this, SCREEN.width - 380, LIST_TOP + index * ROW_HEIGHT + (ROW_HEIGHT - 6) / 2, {
          label: STRINGS.hub.reset(Math.floor(book.upgradeSpent[id] * 0.9)),
          width: 130,
          height: 44,
          textSize: 15,
          onClick: () => this.act(refundUpgrade(book, id) >= 0, STRINGS.hub.refunded(def.name), ''),
        });
      }
    });
  }

  private drawSpecialisations(): void {
    const book = archive(this);
    const slots = specialisationSlots(book);
    addText(this, 760, 100, STRINGS.hub.slots(book.equipped.length, slots), { size: 18, weight: '700' });
    addText(this, 760, 128, STRINGS.hub.slotsNote, { size: 14, colour: PALETTE.brass, wrapWidth: 460 });
    const columnWidth = (SCREEN.width - 140) / 2;
    SPECIALISATION_LIST.forEach((def, index) => {
      const column = index % 2;
      const rowIndex = Math.floor(index / 2);
      const x = 60 + column * (columnWidth + 20);
      const y = 170 + rowIndex * 92;
      const owned = book.specialisations.has(def.id);
      const equipped = book.equipped.includes(def.id);
      const g = this.add.graphics();
      g.fillStyle(PANEL, owned ? 1 : 0.6);
      g.fillRect(x, y, columnWidth, 84);
      g.lineStyle(equipped ? 4 : 2, equipped ? hexToNumber(PALETTE.playerEffects) : INK, 1);
      g.strokeRect(x, y, columnWidth, 84);
      addText(this, x + 12, y + 6, `${def.name}  ·  ${def.discipline}`, { role: 'heading', size: 19 });
      addText(this, x + 12, y + 32, `+ ${def.bonus}`, { size: 14, weight: '700', wrapWidth: columnWidth - 190 });
      addText(this, x + 12, y + 56, `- ${def.drawback}`, { size: 14, colour: PALETTE.danger, wrapWidth: columnWidth - 190 });
      const buttonX = x + columnWidth - 86;
      if (!owned) {
        new Button(this, buttonX, y + 42, {
          label: STRINGS.hub.buyStep(SPECIALISATION_COST),
          width: 156,
          height: 40,
          textSize: 15,
          enabled: book.points >= SPECIALISATION_COST,
          onClick: () => this.act(buySpecialisation(book, def.id), STRINGS.hub.bought(def.name), STRINGS.hub.notEnough),
        });
      } else {
        new Button(this, buttonX, y + 22, {
          label: equipped ? STRINGS.hub.unequip : STRINGS.hub.equip,
          width: 156,
          height: 36,
          textSize: 15,
          selected: equipped,
          onClick: () => this.act(toggleSpecialisation(book, def.id), equipped ? STRINGS.hub.unequipped(def.name) : STRINGS.hub.equipped(def.name), STRINGS.hub.slotsFull),
        });
        new Button(this, buttonX, y + 62, {
          label: STRINGS.hub.sell(SPECIALISATION_COST),
          width: 156,
          height: 32,
          textSize: 14,
          onClick: () => this.act(refundSpecialisation(book, def.id) > 0, STRINGS.hub.refunded(def.name), ''),
        });
      }
    });
  }

  // --- Codex (GDD 15.6) --------------------------------------------------------

  private drawCodex(): void {
    const state = this.state;
    const codex = archive(this).codex;
    this.tabs<CodexTab>(
      [
        ['enemies', STRINGS.hub.codexTabs.enemies],
        ['synergies', STRINGS.hub.codexTabs.synergies],
        ['reactions', STRINGS.hub.codexTabs.reactions],
        ['relics', STRINGS.hub.codexTabs.relics],
        ['lore', STRINGS.hub.codexTabs.lore],
        ['endings', STRINGS.hub.codexTabs.endings],
      ],
      state.codexTab,
      118,
      (tab) => this.go((next) => ((next.codexTab = tab), (next.page = 0))),
      186,
    );
    const unknown = STRINGS.hub.unknown;
    let entries: Array<{ title: string; detail: string; known: boolean }> = [];
    switch (state.codexTab) {
      case 'enemies':
        entries = ENEMY_LIST.map((enemy) => {
          const known = codex.enemies.has(enemy.id);
          return { title: known ? enemy.name : unknown, detail: known ? `${enemy.faction}  ·  ${enemy.behaviour}` : STRINGS.hub.notMet, known };
        });
        break;
      case 'synergies':
        entries = SYNERGY_LIST.map((entry) => {
          const known = codex.synergies.has(entry.id);
          return { title: known ? entry.name : unknown, detail: known ? `${entry.requires}  ·  ${entry.effect}` : STRINGS.hub.notActivated, known };
        });
        break;
      case 'reactions':
        entries = REACTIONS.map((reaction) => {
          const known = codex.reactions.has(reaction);
          const def = REACTION_DEFS[reaction];
          return { title: known ? def.name : unknown, detail: known ? `${def.trigger}  ·  ${def.effect}` : STRINGS.hub.notSeen, known };
        });
        break;
      case 'relics':
        entries = RELIC_LIST.map((relic) => {
          const known = codex.relics.has(relic.id);
          return { title: known ? relic.name : unknown, detail: known ? `${relic.kingdom}  ·  ${relic.effect}` : STRINGS.hub.notTaken, known };
        });
        break;
      case 'lore':
        entries = KINGDOM_NAMES.map((name) => {
          const known = codex.kingdoms.has(name);
          return { title: known ? KINGDOMS[name].title : unknown, detail: known ? KINGDOMS[name].lore : STRINGS.hub.notVisited, known };
        });
        break;
      default:
        entries = KINGDOM_NAMES.map((name) => {
          const known = codex.endings.has(name);
          return { title: known ? STRINGS.victory.ending(name) : unknown, detail: known ? STORY.ending[name] : STRINGS.hub.notEnded, known };
        });
    }
    const page = this.pager(entries.length);
    entries.slice(page * ROWS, page * ROWS + ROWS).forEach((entry, index) => this.row(index, entry.title, entry.detail, undefined, entry.known));
  }

  // --- Trophy cabinet: challenges, mastery, personal bests (GDD 15.6) -----------

  private drawTrophies(): void {
    const book = archive(this);
    addText(this, 60, 100, STRINGS.hub.challenges, { role: 'hand', size: 28, colour: PALETTE.brass });
    CHALLENGE_IDS.forEach((id, index) => {
      const def = CHALLENGES[id];
      const done = book.completed.has(id);
      const y = 140 + index * 56;
      const g = this.add.graphics();
      g.fillStyle(PANEL, 1);
      g.fillRect(60, y, 560, 50);
      g.lineStyle(done ? 4 : 2, done ? hexToNumber(PALETTE.playerEffects) : INK, 1);
      g.strokeRect(60, y, 560, 50);
      addText(this, 72, y + 4, `${def.name}  ·  ${def.band}, ${def.points} AP`, { role: 'heading', size: 17 });
      addText(this, 72, y + 27, `${def.text} ${STRINGS.hub.progress(book.challenges[id], def.target)}`, { size: 13, colour: PALETTE.brass, wrapWidth: 540 });
      g.fillStyle(BRASS, 0.8);
      g.fillRect(60, y + 46, 560 * (book.challenges[id] / def.target), 4);
    });
    addText(this, 60, 380, STRINGS.hub.records, { role: 'hand', size: 28, colour: PALETTE.brass });
    const records = [
      STRINGS.hub.earned(book.earned),
      STRINGS.hub.campaigns(book.campaigns),
      STRINGS.hub.endless(book.bests.endlessRound),
    ];
    records.forEach((line, index) => addText(this, 72, 420 + index * 28, line, { size: 17 }));

    addText(this, 660, 100, STRINGS.hub.mastery, { role: 'hand', size: 28, colour: PALETTE.brass });
    DISCIPLINES.forEach((discipline, index) => {
      const points = book.mastery[discipline];
      const rank = masteryRank(points);
      const next = nextRank(points);
      const y = 140 + index * 86;
      const g = this.add.graphics();
      g.fillStyle(PANEL, 1);
      g.fillRect(660, y, 560, 80);
      g.lineStyle(2, INK, 1);
      g.strokeRect(660, y, 560, 80);
      const title = hasRank(book, discipline, 'Grandmaster') ? GRANDMASTER_TITLE(discipline) : `${discipline}: ${rank}`;
      addText(this, 672, y + 4, title, { role: 'heading', size: 18 });
      addText(this, 1208, y + 6, next ? STRINGS.hub.toNext(points, next.points, next.name) : `${points}`, { size: 13, weight: '700' }).setOrigin(1, 0);
      const opens = hasRank(book, discipline, 'Master') ? `${STRINGS.hub.masterOn}: ${MASTER_MECHANICS[discipline]}` : `${STRINGS.hub.atMaster}: ${MASTER_MECHANICS[discipline]}`;
      addText(this, 672, y + 28, opens, { size: 12, colour: PALETTE.brass, wrapWidth: 520 });
      addText(this, 672, y + 60, MASTERY_OPENS[rank], { size: 12, colour: PALETTE.ink, wrapWidth: 420 });
      if (discipline === 'Chemistry') {
        // The Chemistry Master status is the player's choice (GDD 8.13).
        new Button(this, 1150, y + 50, {
          label: book.masterStatus,
          width: 120,
          height: 34,
          textSize: 13,
          onClick: () => {
            const choices: StatusEffect[] = STATUS_EFFECTS.filter((status) => status !== 'Stunned' && status !== 'Short-circuited');
            const index = choices.indexOf(book.masterStatus);
            book.masterStatus = choices[(index + 1) % choices.length] ?? 'Burning';
            this.act(true, STRINGS.hub.statusChosen(book.masterStatus), '');
          },
        });
      }
    });
  }
}
