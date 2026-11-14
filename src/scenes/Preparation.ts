import Phaser from 'phaser';
import { kingdomForRound } from '../sim/run';
import { music } from '../audio/music';
import { playSound } from '../audio/sfx';
import { saveRun } from './session';
import { SLOT_TYPES } from '../data/components';
import type { ComponentDef, SlotType } from '../data/components';
import {
  GRADE_NUMERALS,
  MATERIALS,
  MERGE_COST,
  UPGRADE_CATEGORY,
  UPGRADE_LABELS,
} from '../data/economy';
import type { UpgradeStat } from '../data/economy';
import { PALETTE, hexToNumber } from '../data/palette';
import { DISCIPLINES, MASTERY_POINTS, RESEARCH_NODES, researchNode } from '../data/research';
import type { ResearchNodeDef } from '../data/research';
import { SCREEN } from '../data/screen';
import { QUALITY_COLOURS, SHOPS, SHOP_IDS } from '../data/shop';
import type { ShopId } from '../data/shop';
import { STRINGS } from '../data/strings';
import {
  buildComponent,
  buildProblem,
  buyItem,
  buyProblem,
  dismantleComponent,
  dismantleReturn,
  dismantleWeapon,
  equipFromReserve,
  installFromInventory,
  itemName,
  lockedBy,
  mergeProblem,
  mergeWeapons,
  openShop,
  previewShops,
  recipeCost,
  recipes,
  removeToInventory,
  rerollShop,
  shopRerollCost,
  unequipWeapon,
  upgradeChoices,
  upgradeCost,
  upgradeProblem,
  upgradeWeapon,
  visitFee,
  weaponDismantleReturn,
} from '../sim/economy';
import type { ShopItem, ShopProblem, WorkbenchProblem } from '../sim/economy';
import { WEAPON_SLOTS, auxiliaryOpen, installProblem, resolveLoadout } from '../sim/loadout';
import type { ComponentInstance, ResolvedWeapon, WeaponInstance } from '../sim/loadout';
import { masteryRank, nextRank } from '../sim/archive';
import {
  captureChoices,
  captureNode,
  gradeOpen,
  nodeCost,
  nodeState,
  refundNode,
  refundPreview,
  researchNodeNow,
  researchProblem,
  resolveResearch,
} from '../sim/research';
import { resolvePlayerStats, revealPending } from '../sim/run';
import type { RunState } from '../sim/run';
import { Button } from '../ui/button';
import { componentIcon, keeperIcon, weaponIcon } from '../ui/icons';
import { ResearchWeb, fitCamera } from '../ui/researchWeb';
import type { WebCamera, WebViewport } from '../ui/researchWeb';
import { addText } from '../ui/text';

type Selection =
  | { readonly kind: 'component'; readonly component: ComponentInstance }
  | { readonly kind: 'reserve'; readonly weapon: WeaponInstance }
  | { readonly kind: 'recipe'; readonly def: ComponentDef };

type TrayTab = 'components' | 'weapons' | 'recipes';

/** What the screen shows. The scene redraws from this after every action. */
interface PrepView {
  tab: 'workbench' | 'shop' | 'research';
  /** The node picked on the research web, and the web's pan and zoom. */
  node?: string;
  web?: WebCamera;
  /** The shop behind the open door. Undefined shows the three doors. */
  shop?: ShopId;
  tray: TrayTab;
  page: number;
  selected?: Selection;
  /** The weapon whose next grade the player is choosing. */
  upgrade?: WeaponInstance;
  /** The keeper's last line, or the last refusal. */
  message?: string;
  debug: boolean;
}

export interface PreparationData {
  run: RunState;
  view?: PrepView;
}

const INK = hexToNumber(PALETTE.ink);
const PARCHMENT = hexToNumber(PALETTE.parchment);
const GOLD = hexToNumber(PALETTE.playerEffects);
const DANGER = hexToNumber(PALETTE.danger);
const PANEL = 0xe9dfc8;

const BAR_HEIGHT = 64;
const MARGIN = 16;
const CARD_TOP = 76;
const CARD_WIDTH = 300;
const CARD_GAP = 10;
const CARD_HEIGHT = 500;
const SOCKET_HEIGHT = 60;
const SIDE_LEFT = MARGIN + WEAPON_SLOTS * (CARD_WIDTH + CARD_GAP);
const TRAY_TOP = CARD_TOP + CARD_HEIGHT + 8;
const TRAY_PER_PAGE = 6;
const CHIP_WIDTH = 200;
const CHIP_HEIGHT = 84;
const CHIP_ICON = 40;
const CHIP_GAP = 8;
const SHOP_CARD_WIDTH = 170;
const SHOP_CARD_GAP = 8;
const WEB_VIEW: WebViewport = { x: 0, y: BAR_HEIGHT + 4, width: 856, height: SCREEN.height - BAR_HEIGHT - 4 };
const NODE_PANEL_LEFT = 864;

/**
 * The preparation screen (GDD 3.3, 15.8): Workbench and Shop tabs, a resource
 * bar and a large Start button. Untimed: the round starts when the player
 * presses Start. The Research tab shows the research web (GDD 8, 15.8).
 */
interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pixels a mouse moves before a press becomes a drag. */
const DRAG_START = 8;

export class Preparation extends Phaser.Scene {
  private run!: RunState;
  private view!: PrepView;

  constructor() {
    super('Preparation');
  }

  /** The run saved when this preparation phase began. Redraws reuse the scene and skip the save. */
  private saved = false;
  /** Sockets and tray components on screen, for dragging on PC. */
  private sockets: Array<Area & { weapon: WeaponInstance; slot: SlotType }> = [];
  private dragSources: Array<Area & { component: ComponentInstance }> = [];
  private drag: { component: ComponentInstance; startX: number; startY: number; moved: boolean; ghost: Phaser.GameObjects.GameObject[] } | undefined;

  init(data: PreparationData): void {
    this.run = data.run;
    this.saved = data.view !== undefined;
    // A free visit opens on the Shop tab, so the choice of door comes first.
    this.view = data.view ?? {
      tab: data.run.freeVisit ? 'shop' : 'workbench',
      tray: 'components',
      page: 0,
      debug: false,
    };
  }

  create(): void {
    // Between rounds the kingdom theme falls back to its calm layer (GDD 15.10).
    music.play({ kind: 'kingdom', kingdom: kingdomForRound(this.run) });
    music.setThreat(0);
    // The run saves at the start of every preparation phase (GDD 15.13).
    if (this.view.tab !== undefined && !this.saved) {
      this.saved = true;
      saveRun(this, this.run);
    }
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    // The Apprentice Trial guides each preparation phase (GDD 3.11).
    const trialHint = this.run.trial ? STRINGS.trial.prep[this.run.round - 2] : undefined;
    if (trialHint) {
      addText(this, SCREEN.width / 2, SCREEN.height - 8, trialHint, { size: 17, weight: '700', colour: PALETTE.danger, align: 'center', wrapWidth: 1100 })
        .setOrigin(0.5, 1)
        .setDepth(90)
        .setStroke(PALETTE.parchment, 5);
    }
    this.sockets = [];
    this.dragSources = [];
    this.drag = undefined;
    this.listenForDrags();
    // The research web draws first, so the bar and the node card cover its edges.
    if (this.view.tab === 'research') this.drawResearch();
    this.drawBar();
    if (this.view.tab === 'workbench') this.drawWorkbench();
    else if (this.view.tab === 'shop') this.drawShop();

    const keyboard = this.input.keyboard;
    const start = (): void => this.startRound();
    const debug = (): void => this.redraw((view) => (view.debug = !view.debug));
    keyboard?.on('keydown-ENTER', start);
    keyboard?.on('keydown-F3', debug);
    keyboard?.addCapture('F3');
    const onPointer = (): void => {
      let touches = 0;
      for (const pointer of this.input.manager.pointers) {
        if (pointer.isDown && pointer.wasTouch) touches++;
      }
      if (touches >= 3) debug();
    };
    this.input.on('pointerdown', onPointer);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ENTER', start);
      keyboard?.off('keydown-F3', debug);
      this.input.off('pointerdown', onPointer);
    });
  }

  // --- Plumbing ----------------------------------------------------------------------

  /** Applies a change to the view and redraws the screen. */
  private redraw(change?: (view: PrepView) => void): void {
    change?.(this.view);
    this.scene.restart({ run: this.run, view: this.view });
  }

  /** Runs an economy action. A refusal shows as a message. */
  private act(problem: WorkbenchProblem | ShopProblem | undefined, change?: (view: PrepView) => void): void {
    // Purchases ring the till. Workbench changes scratch the quill (GDD 15.10).
    if (!problem) playSound(this.view.tab === 'shop' ? 'purchase' : 'quill');
    this.redraw((view) => {
      view.message = problem ? STRINGS.prep.problems[problem] : undefined;
      if (!problem) change?.(view);
    });
  }

  private startRound(): void {
    // After a boss the next kingdom stays hidden until Start (GDD 5.8).
    this.scene.start(revealPending(this.run) ? 'Transition' : 'Combat', { run: this.run });
  }

  // --- Dragging on PC (GDD 15.8) --------------------------------------------------------

  /** A mouse drags a tray component onto a socket. Touch keeps tap, then tap the socket. */
  private listenForDrags(): void {
    const inside = (area: Area, x: number, y: number): boolean => x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
    const down = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.wasTouch) return;
      const source = this.dragSources.find((area) => inside(area, pointer.x, pointer.y));
      this.drag = source ? { component: source.component, startX: pointer.x, startY: pointer.y, moved: false, ghost: [] } : undefined;
    };
    const move = (pointer: Phaser.Input.Pointer): void => {
      const drag = this.drag;
      if (!drag || !pointer.isDown) return;
      if (!drag.moved && Math.hypot(pointer.x - drag.startX, pointer.y - drag.startY) > DRAG_START) {
        drag.moved = true;
        drag.ghost = componentIcon(this, drag.component.def, pointer.x, pointer.y, 56);
        for (const part of drag.ghost) (part as unknown as Phaser.GameObjects.Components.Depth).setDepth(100);
        for (const area of this.sockets) {
          if (area.slot === drag.component.def.slot && installProblem(area.weapon, drag.component.def) === undefined) {
            drag.ghost.push(this.add.rectangle(area.x, area.y, area.w, area.h).setOrigin(0).setStrokeStyle(5, GOLD, 1).setDepth(99));
          }
        }
      }
      if (drag.moved) {
        for (const part of drag.ghost) {
          if (part instanceof Phaser.GameObjects.Rectangle) continue;
          (part as unknown as Phaser.GameObjects.Components.Transform).setPosition(pointer.x, pointer.y);
        }
      }
    };
    const up = (pointer: Phaser.Input.Pointer): void => {
      const drag = this.drag;
      this.drag = undefined;
      if (!drag?.moved) return;
      for (const part of drag.ghost) part.destroy();
      const socket = this.sockets.find((area) => inside(area, pointer.x, pointer.y));
      if (socket && socket.slot === drag.component.def.slot) {
        this.act(installFromInventory(this.run, socket.weapon, drag.component), (next) => (next.selected = undefined));
      }
    };
    this.input.on('pointerdown', down);
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', down);
      this.input.off('pointermove', move);
      this.input.off('pointerup', up);
    });
  }

  /** A clickable panel with an ink border. */
  private panel(
    x: number,
    y: number,
    width: number,
    height: number,
    options: { fill?: number; stroke?: number; strokeWidth?: number; alpha?: number; onClick?: () => void } = {},
  ): Phaser.GameObjects.Rectangle {
    const panel = this.add.rectangle(x, y, width, height, options.fill ?? PARCHMENT, options.alpha ?? 1).setOrigin(0);
    panel.setStrokeStyle(options.strokeWidth ?? 2, options.stroke ?? INK, 1);
    const onClick = options.onClick;
    if (onClick) {
      panel.setInteractive({ useHandCursor: true });
      // A finished drag is a drop, never a click on the panel under the pointer.
      panel.on('pointerup', () => {
        if (!this.drag?.moved) onClick();
      });
    }
    return panel;
  }

  // --- Top bar -----------------------------------------------------------------------

  /** Tabs on the left, resources in the middle, the Start button on the right. */
  private drawBar(): void {
    const run = this.run;
    const view = this.view;
    this.add.rectangle(0, 0, SCREEN.width, BAR_HEIGHT + 4, PANEL, 1).setOrigin(0);
    this.add.rectangle(0, BAR_HEIGHT + 4, SCREEN.width, 3, INK, 1).setOrigin(0);

    const tabs: Array<[PrepView['tab'], string, number]> = [
      ['workbench', STRINGS.prep.workbench, 150],
      ['shop', run.freeVisit ? STRINGS.prep.shopFree : STRINGS.prep.shop, 170],
      ['research', run.research.captures.length > 0 ? STRINGS.prep.researchWaiting : STRINGS.prep.research, 180],
    ];
    let tabLeft = MARGIN;
    for (const [tab, label, width] of tabs) {
      new Button(this, tabLeft + width / 2, BAR_HEIGHT / 2 + 2, {
        label,
        width,
        height: 52,
        textSize: 21,
        selected: view.tab === tab,
        onClick: () =>
          this.redraw((next) => {
            if (next.tab !== tab) playSound('page');
            next.tab = tab;
            next.message = undefined;
            next.upgrade = undefined;
          }),
      });
      tabLeft += width + 8;
    }

    // Resource bar: gold, Research Points and the four materials (GDD 15.8).
    const top = [STRINGS.prep.gold(run.gold), STRINGS.prep.researchPoints(Math.floor(run.research.points + 1e-9))].join('     ');
    const materials = MATERIALS.map((material) => STRINGS.prep.material(material, run.materials[material])).join('     ');
    addText(this, tabLeft + 10, BAR_HEIGHT / 2 - 11, top, { size: 18, weight: '700' }).setOrigin(0, 0.5);
    addText(this, tabLeft + 10, BAR_HEIGHT / 2 + 14, materials, { size: 16, weight: '700' }).setOrigin(0, 0.5);

    new Button(this, SCREEN.width - MARGIN - 120, BAR_HEIGHT / 2 + 2, {
      label: STRINGS.prep.start(run.round),
      width: 240,
      height: 56,
      textSize: 26,
      onClick: () => this.startRound(),
    });

    if (view.debug) {
      // Debug tools (CLAUDE.md "Testing"): gold and materials for trying the shops.
      new Button(this, 1010 - 280, BAR_HEIGHT + 22, {
        label: STRINGS.prep.debugGold,
        width: 130,
        height: 30,
        textSize: 15,
        onClick: () => this.redraw(() => (run.gold += 100)),
      }).setDepth(50);
      new Button(this, 1010 - 130, BAR_HEIGHT + 22, {
        label: STRINGS.prep.debugMaterials,
        width: 150,
        height: 30,
        textSize: 15,
        onClick: () =>
          this.redraw(() => {
            for (const material of MATERIALS) run.materials[material] += 10;
          }),
      }).setDepth(50);
      new Button(this, 1010 - 440, BAR_HEIGHT + 22, {
        label: STRINGS.prep.debugResearch,
        width: 150,
        height: 30,
        textSize: 15,
        onClick: () => this.redraw(() => (run.research.points += 100)),
      }).setDepth(50);
      new Button(this, 1010 - 620, BAR_HEIGHT + 22, {
        label: STRINGS.prep.debugDiscover,
        width: 190,
        height: 30,
        textSize: 15,
        onClick: () =>
          this.redraw(() => {
            for (const node of RESEARCH_NODES) run.archive.discovered.add(node.id);
          }),
      }).setDepth(50);
    }
  }

  // --- Research ----------------------------------------------------------------------

  /** Researches, captures or refunds, then redraws with a line about the result. */
  private researchAct(node: ResearchNodeDef, action: 'research' | 'capture' | 'refund'): void {
    const run = this.run;
    let message: string;
    if (action === 'capture') {
      message = captureNode(run, node) ? STRINGS.research.captured(node.name) : STRINGS.research.problems.requirements;
    } else if (action === 'refund') {
      message = refundNode(run, node) ? STRINGS.research.refunded(node.name) : STRINGS.research.problems.undiscovered;
    } else {
      const problem = researchNodeNow(run, node);
      message = problem ? STRINGS.research.problems[problem] : STRINGS.research.researched(node.name);
      if (!problem) playSound('research');
    }
    // Perfect Information shows the next milestone stock at once (GDD 8.12).
    previewShops(run);
    this.redraw((view) => (view.message = message));
  }

  /** The research web on the left, the node card on the right (GDD 15.8). */
  private drawResearch(): void {
    const run = this.run;
    const view = this.view;
    const camera = (view.web ??= fitCamera(WEB_VIEW));
    const captures = captureChoices(run);
    const captureIds = new Set(captures.map((node) => node.id));

    const web = new ResearchWeb(this, {
      viewport: WEB_VIEW,
      camera,
      stateOf: (node) => nodeState(run, node),
      hinted: (node) => run.archive.hints.has(node.id),
      captures: captureIds,
      selected: view.node,
      onPick: (node) => {
        // A second press researches the node, instantly (GDD 15.8).
        if (view.node === node.id) {
          if (captureIds.has(node.id)) return this.researchAct(node, 'capture');
          if (nodeState(run, node) === 'available') return this.researchAct(node, 'research');
        }
        this.redraw((next) => ((next.node = node.id), (next.message = undefined)));
      },
    });

    // Zoom buttons, for players with no wheel and no second finger.
    const zoomY = SCREEN.height - 36;
    const zoomButton = (x: number, label: string, onClick: () => void, width = 48): void => {
      new Button(this, x, zoomY, { label, width, height: 48, textSize: 24, onClick });
    };
    zoomButton(MARGIN + 24, STRINGS.research.zoomOut, () => web.zoomBy(0.8));
    zoomButton(MARGIN + 80, STRINGS.research.zoomIn, () => web.zoomBy(1.25));
    zoomButton(MARGIN + 150, STRINGS.research.reset, () => web.reset(), 76);

    // The node card.
    const left = NODE_PANEL_LEFT;
    const width = SCREEN.width - left;
    const inner = width - 32;
    this.add.rectangle(left, BAR_HEIGHT + 4, width, SCREEN.height - BAR_HEIGHT - 4, PANEL, 1).setOrigin(0).setInteractive();
    this.add.rectangle(left, BAR_HEIGHT + 4, 3, SCREEN.height - BAR_HEIGHT - 4, INK, 1).setOrigin(0);
    const x = left + 18;
    let y = BAR_HEIGHT + 16;
    const line = (content: string, options: Parameters<typeof addText>[4] = {}, gap = 6): void => {
      // The node card follows the text size and readable font settings (GDD 3.10).
      const text = addText(this, x, y, content, { size: 16, wrapWidth: inner, ...options, scalable: true });
      y += text.height + gap;
    };
    const materialsLine = (stock: Readonly<Partial<Record<(typeof MATERIALS)[number], number>>>): string =>
      MATERIALS.filter((material) => (stock[material] ?? 0) > 0)
        .map((material) => `${stock[material]} ${material}`)
        .join(', ');

    if (view.message) line(view.message, { weight: '700', colour: PALETTE.danger });

    const node = view.node ? researchNode(view.node) : undefined;
    const state = node ? nodeState(run, node) : undefined;
    if (!node || !state || (state === 'undiscovered' && !run.archive.hints.has(node.id))) {
      line(STRINGS.prep.research, { role: 'heading', size: 30 });
      line(STRINGS.research.pick, {}, 4);
      line(STRINGS.research.controls, { colour: PALETTE.brass });
    } else if (state === 'undiscovered') {
      // A hinted hidden node: an ink smudge with a cryptic note (GDD 8.12).
      line(STRINGS.research.hintTitle, { role: 'heading', size: 30 });
      line(STRINGS.research.hintNote, { colour: PALETTE.brass });
      line(node.hint ?? '', { role: 'hand', size: 26 });
    } else {
      line(node.name, { role: 'heading', size: 30 }, 2);
      line(`${STRINGS.research.rings[node.ring]}  ·  ${node.disciplines.join(', ')}`, { colour: PALETTE.brass, size: 15 }, 2);
      line(STRINGS.research.states[state], { weight: '700', colour: state === 'available' ? PALETTE.playerEffects : PALETTE.ink }, 10);
      line(STRINGS.research.effect, { role: 'hand', size: 22, colour: PALETTE.brass }, 0);
      line(node.effect, { size: 17 }, 8);
      const cost = nodeCost(run, node);
      line(STRINGS.research.cost, { role: 'hand', size: 22, colour: PALETTE.brass }, 0);
      line(STRINGS.research.costLine(cost.points, materialsLine(cost.materials)), { size: 17 }, 8);
      line(STRINGS.research.requires, { role: 'hand', size: 22, colour: PALETTE.brass }, 0);
      line(node.requires.length > 0 ? node.requires.join(', ') : STRINGS.research.noRequirements, { size: 17 }, 8);
      if (node.condition) {
        line(STRINGS.research.condition, { role: 'hand', size: 22, colour: PALETTE.brass }, 0);
        line(node.condition, { size: 17 }, 8);
      }
      const points = MASTERY_POINTS[node.ring];
      line(`${STRINGS.research.mastery}: +${points} ${node.disciplines.join(', +' + points + ' ')}`, { size: 14, colour: PALETTE.brass }, 10);

      const button = (label: string, enabled: boolean, onClick: () => void): void => {
        new Button(this, left + width / 2, y + 26, { label, width: inner, height: 52, textSize: 20, enabled, onClick });
        y += 60;
      };
      if (state === 'researched') {
        const preview = refundPreview(run, node);
        if (preview) {
          button(STRINGS.research.refund(preview.points), true, () => this.researchAct(node, 'refund'));
          const back = materialsLine(preview.materials);
          if (back) line(STRINGS.research.refundMaterials(back), { size: 14 }, 2);
          if (preview.nodes.length > 1) {
            line(STRINGS.research.refundAlso(preview.nodes.slice(1).map((entry) => entry.name).join(', ')), {
              size: 14,
              colour: PALETTE.danger,
            });
          }
        }
      } else {
        if (captureIds.has(node.id)) button(STRINGS.research.capture, true, () => this.researchAct(node, 'capture'));
        const problem = researchProblem(run, node);
        button(problem ? STRINGS.research.problems[problem] : STRINGS.research.researchNow, problem === undefined, () =>
          this.researchAct(node, 'research'),
        );
      }
    }

    // Captured research and mastery ranks sit at the foot of the card (GDD 5.8, 8.13).
    let foot = SCREEN.height - 12 - DISCIPLINES.length * 20;
    for (const discipline of DISCIPLINES) {
      const points = run.archive.mastery[discipline];
      addText(this, x, foot, STRINGS.research.masteryLine(discipline, masteryRank(points), points, nextRank(points)?.points), {
        size: 14,
      });
      foot += 20;
    }
    const waiting = run.research.captures[0];
    if (waiting) {
      addText(this, x, SCREEN.height - 20 - DISCIPLINES.length * 20, `${STRINGS.research.captureDisciplines(waiting.join(', '))}. ${STRINGS.research.captureNote}`, {
        size: 14,
        weight: '700',
        colour: PALETTE.danger,
        wrapWidth: inner,
      }).setOrigin(0, 1);
    }
  }

  // --- Workbench ---------------------------------------------------------------------

  private drawWorkbench(): void {
    const run = this.run;
    const loadout = resolveLoadout(run.weapons.slice(0, WEAPON_SLOTS), resolvePlayerStats(run.character), {
      researchSynergies: run.researchSynergies,
      research: resolveResearch(run.research.researched),
    });
    for (let slot = 0; slot < WEAPON_SLOTS; slot++) {
      this.drawWeaponCard(slot, run.weapons[slot], loadout.weapons[slot]);
    }
    this.drawSidePanel(loadout.report);
    this.drawTray();
  }

  /** A blueprint card: sockets for Structure, Mechanism, Payload and Auxiliary, then the weapon's buttons. */
  private drawWeaponCard(slot: number, weapon: WeaponInstance | undefined, resolved: ResolvedWeapon | undefined): void {
    const run = this.run;
    const view = this.view;
    const x = MARGIN + slot * (CARD_WIDTH + CARD_GAP);
    const selected = view.selected;
    const reserveWeapon = selected?.kind === 'reserve' ? selected.weapon : undefined;

    this.panel(x, CARD_TOP, CARD_WIDTH, CARD_HEIGHT, { fill: PANEL, strokeWidth: 3 });

    if (!weapon) {
      addText(this, x + CARD_WIDTH / 2, CARD_TOP + 150, STRINGS.prep.emptySlot, { role: 'heading', size: 26 }).setOrigin(0.5);
      addText(this, x + CARD_WIDTH / 2, CARD_TOP + 190, STRINGS.prep.emptySlotHint, {
        size: 16,
        colour: PALETTE.brass,
        align: 'center',
        wrapWidth: CARD_WIDTH - 40,
      }).setOrigin(0.5, 0);
      // Only the first free slot takes a weapon, so slots fill in order.
      if (reserveWeapon && slot === run.weapons.length) {
        new Button(this, x + CARD_WIDTH / 2, CARD_TOP + CARD_HEIGHT - 60, {
          label: STRINGS.prep.equipHere,
          width: CARD_WIDTH - 16,
          height: 60,
          textSize: 24,
          selected: true,
          onClick: () => this.act(equipFromReserve(run, reserveWeapon, slot), (next) => (next.selected = undefined)),
        });
      }
      return;
    }

    const def = weapon.def;
    // Weapons appear as annotated blueprints (GDD 15.1): the icon, then the name and line beside it.
    weaponIcon(this, def, x + 34, CARD_TOP + 34, 50);
    const title = addText(this, x + 66, CARD_TOP + 10, def.name, { role: 'heading', size: 23 });
    if (title.width > CARD_WIDTH - 74) title.setScale((CARD_WIDTH - 74) / title.width);
    const gradeLabel = STRINGS.prep.grade(GRADE_NUMERALS[weapon.grade] ?? '');
    addText(this, x + 66, CARD_TOP + 42, STRINGS.prep.weaponLine(weapon.quality, gradeLabel, def.family), {
      size: 15,
      weight: '700',
      colour: QUALITY_COLOURS[weapon.quality],
    });
    if (resolved) {
      const stats = STRINGS.prep.stats(
        resolved.damage.toFixed(1),
        resolved.attacksPerSecond.toFixed(2),
        resolved.range.toFixed(0),
        (resolved.criticalChance * 100).toFixed(0),
      );
      const merged = weapon.merges > 0 ? `  ·  ${STRINGS.prep.merged(weapon.merges)}` : '';
      addText(this, x + CARD_WIDTH / 2, CARD_TOP + 66, `${stats}${merged}`, {
        size: 13,
        weight: '500',
        align: 'center',
        wrapWidth: CARD_WIDTH - 12,
      }).setOrigin(0.5, 0);
    }

    // Sockets.
    const picked = selected?.kind === 'component' ? selected.component : undefined;
    SLOT_TYPES.forEach((slotType, index) => {
      const y = CARD_TOP + 106 + index * (SOCKET_HEIGHT + 6);
      this.drawSocket(x + 8, y, weapon, slotType, picked);
    });

    // Buttons.
    const rowOne = CARD_TOP + 106 + 4 * (SOCKET_HEIGHT + 6) + 26;
    const rowTwo = rowOne + 62;
    if (reserveWeapon) {
      new Button(this, x + CARD_WIDTH / 2, rowOne + 30, {
        label: STRINGS.prep.equipHere,
        width: CARD_WIDTH - 16,
        height: 60,
        textSize: 24,
        selected: true,
        onClick: () => this.act(equipFromReserve(run, reserveWeapon, slot), (next) => (next.selected = undefined)),
      });
      return;
    }
    const cost = upgradeCost(weapon.grade);
    // Grade III needs a middle-ring node, Grade IV an outer-ring node (GDD 8.10).
    const gradeLocked = cost !== undefined && !gradeOpen(run, weapon.grade + 1);
    let upgradeLabel: string = STRINGS.prep.maxGrade;
    if (gradeLocked) upgradeLabel = STRINGS.prep.gradeLocked(GRADE_NUMERALS[weapon.grade + 1] ?? '', weapon.grade + 1 === 3 ? 'middle' : 'outer');
    else if (cost) upgradeLabel = STRINGS.prep.upgrade(GRADE_NUMERALS[weapon.grade + 1] ?? '', cost.gold, cost.scrap);
    new Button(this, x + CARD_WIDTH / 2, rowOne, {
      label: upgradeLabel,
      width: CARD_WIDTH - 16,
      height: 54,
      textSize: gradeLocked ? 14 : 19,
      enabled: cost !== undefined && !gradeLocked && run.gold >= cost.gold && run.materials.Scrap >= cost.scrap,
      selected: view.upgrade === weapon,
      onClick: () =>
        this.redraw((next) => {
          next.upgrade = next.upgrade === weapon ? undefined : weapon;
          next.selected = undefined;
          next.message = undefined;
        }),
    });
    const third = (CARD_WIDTH - 16 - 12) / 3;
    new Button(this, x + 8 + third / 2, rowTwo, {
      label: STRINGS.prep.merge(MERGE_COST),
      width: third,
      height: 54,
      textSize: 14,
      enabled: mergeProblem(run, weapon) === undefined,
      onClick: () => this.act(mergeWeapons(run, weapon)),
    });
    new Button(this, x + 8 + third + 6 + third / 2, rowTwo, {
      label: STRINGS.prep.dismantle,
      width: third,
      height: 54,
      textSize: 15,
      enabled: run.weapons.length > 1,
      onClick: () => this.act(dismantleWeapon(run, weapon), (next) => (next.upgrade = undefined)),
    });
    new Button(this, x + 8 + (third + 6) * 2 + third / 2, rowTwo, {
      label: STRINGS.prep.toReserve,
      width: third,
      height: 54,
      textSize: 15,
      enabled: run.weapons.length > 1,
      onClick: () => this.act(unequipWeapon(run, weapon), (next) => (next.upgrade = undefined)),
    });
  }

  /** One socket. With a tray component picked, sockets taking the component glow. */
  private drawSocket(x: number, y: number, weapon: WeaponInstance, slotType: SlotType, picked: ComponentInstance | undefined): void {
    const run = this.run;
    const width = CARD_WIDTH - 16;
    const installed = weapon.components[slotType];
    const locked = slotType === 'Auxiliary' && !auxiliaryOpen(weapon);
    const fits = picked !== undefined && picked.def.slot === slotType && installProblem(weapon, picked.def) === undefined;

    let onClick: (() => void) | undefined;
    if (picked) {
      if (picked.def.slot === slotType) {
        onClick = () => this.act(installFromInventory(run, weapon, picked), (next) => (next.selected = undefined));
      }
    } else if (installed && !locked) {
      onClick = () => this.act(removeToInventory(run, weapon, slotType), (next) => (next.tray = 'components'));
    }

    if (!locked) this.sockets.push({ x, y, w: width, h: SOCKET_HEIGHT, weapon, slot: slotType });
    this.panel(x, y, width, SOCKET_HEIGHT, {
      fill: PARCHMENT,
      stroke: fits ? GOLD : INK,
      strokeWidth: fits ? 5 : 2,
      alpha: locked ? 0.45 : 1,
      onClick,
    });
    addText(this, x + 8, y + 5, slotType, { size: 13, weight: '700', colour: PALETTE.brass });
    let label: string;
    if (locked) label = STRINGS.prep.socketLocked;
    else if (installed) label = installed.def.name;
    else label = STRINGS.prep.socketEmpty;
    if (installed && !locked) componentIcon(this, installed.def, x + 26, y + 36, 30);
    addText(this, x + width / 2 + (installed && !locked ? 14 : 0), y + 36, label, {
      size: locked ? 14 : 18,
      weight: installed && !locked ? '700' : '400',
      colour: installed && !locked ? PALETTE.ink : PALETTE.brass,
    }).setOrigin(0.5);
    if (installed?.isDefault && !locked) {
      addText(this, x + width - 8, y + 5, STRINGS.prep.defaultPart, { size: 12, colour: PALETTE.brass }).setOrigin(1, 0);
    }
  }

  /** The panel on the right: the grade choice, the picked item, or the synergy list. */
  private drawSidePanel(report: ReturnType<typeof resolveLoadout>['report']): void {
    const run = this.run;
    const view = this.view;
    const x = SIDE_LEFT;
    const width = SCREEN.width - MARGIN - x;
    const centre = x + width / 2;
    this.panel(x, CARD_TOP, width, CARD_HEIGHT, { fill: PANEL, strokeWidth: 3 });
    let y = CARD_TOP + 12;

    const upgrading = view.upgrade;
    const cost = upgrading ? upgradeCost(upgrading.grade) : undefined;
    if (upgrading && cost) {
      // Each grade grants one stat step in a category chosen at purchase (GDD 7.22).
      const numeral = GRADE_NUMERALS[upgrading.grade + 1] ?? '';
      addText(this, centre, y, STRINGS.prep.upgradeTitle(upgrading.def.name, numeral), {
        size: 18,
        weight: '700',
        align: 'center',
        wrapWidth: width - 20,
      }).setOrigin(0.5, 0);
      y += 58;
      const choices = upgradeChoices(upgrading);
      for (const stat of choices) {
        const choice: UpgradeStat = stat;
        new Button(this, centre, y + 26, {
          label: STRINGS.prep.upgradeChoice(UPGRADE_CATEGORY[choice], UPGRADE_LABELS[choice]),
          width: width - 20,
          height: 52,
          textSize: 17,
          enabled: upgradeProblem(run, upgrading, choice) === undefined,
          onClick: () => this.act(upgradeWeapon(run, upgrading, choice), (next) => (next.upgrade = undefined)),
        });
        y += 58;
      }
      new Button(this, centre, y + 26, {
        label: STRINGS.prep.cancel,
        width: width - 20,
        height: 52,
        textSize: 20,
        onClick: () => this.redraw((next) => (next.upgrade = undefined)),
      });
      return;
    }

    const selected = view.selected;
    if (selected) {
      const def = selected.kind === 'component' ? selected.component.def : selected.kind === 'recipe' ? selected.def : undefined;
      if (def) {
        addText(this, centre, y, def.name, { size: 20, weight: '700', align: 'center', wrapWidth: width - 20 }).setOrigin(0.5, 0);
        y += 52;
        addText(this, centre, y, `${def.quality}  ·  ${def.slot}`, {
          size: 15,
          weight: '700',
          colour: QUALITY_COLOURS[def.quality],
        }).setOrigin(0.5, 0);
        y += 24;
        const fits = def.fits === 'All' ? STRINGS.prep.fitsAll : STRINGS.prep.fits(def.fits.join(', '));
        const effect = addText(this, x + 12, y, `${def.effect}\n${fits}\nTags: ${def.tags.join(', ')}`, {
          size: 15,
          wrapWidth: width - 24,
        });
        y += effect.height + 12;
      }
      if (selected.kind === 'component') {
        const back = dismantleReturn(selected.component);
        new Button(this, centre, y + 26, {
          label: STRINGS.prep.dismantleFor(back.amount, back.material),
          width: width - 20,
          height: 52,
          textSize: 17,
          onClick: () => this.act(dismantleComponent(run, selected.component), (next) => (next.selected = undefined)),
        });
        y += 62;
        addText(this, centre, y, STRINGS.prep.installHint, {
          size: 15,
          colour: PALETTE.brass,
          align: 'center',
          wrapWidth: width - 24,
        }).setOrigin(0.5, 0);
      } else if (selected.kind === 'recipe') {
        const recipe = recipeCost(selected.def, run.relics);
        const problem = buildProblem(run, selected.def);
        const node = lockedBy(run, selected.def);
        if (recipe) {
          new Button(this, centre, y + 26, {
            label: node ? STRINGS.prep.lockedBy(node) : STRINGS.prep.build(recipe.gold, recipe.amount, recipe.material),
            width: width - 20,
            height: 52,
            textSize: 16,
            enabled: problem === undefined,
            onClick: () => this.act(buildComponent(run, selected.def)),
          });
          y += 62;
          if (problem) {
            addText(this, centre, y, STRINGS.prep.problems[problem], { size: 15, colour: PALETTE.danger }).setOrigin(0.5, 0);
          }
        }
      } else {
        const weapon = selected.weapon;
        addText(this, centre, y, weapon.def.name, { size: 20, weight: '700' }).setOrigin(0.5, 0);
        y += 30;
        addText(this, centre, y, STRINGS.prep.weaponLine(weapon.quality, STRINGS.prep.grade(GRADE_NUMERALS[weapon.grade] ?? ''), weapon.def.family), {
          size: 15,
          weight: '700',
          colour: QUALITY_COLOURS[weapon.quality],
        }).setOrigin(0.5, 0);
        y += 26;
        const text = addText(this, x + 12, y, weaponDetails(weapon), { size: 15, wrapWidth: width - 24 });
        y += text.height + 12;
        const back = weaponDismantleReturn(weapon);
        new Button(this, centre, y + 26, {
          label: STRINGS.prep.dismantleFor(back.amount, back.material),
          width: width - 20,
          height: 52,
          textSize: 17,
          onClick: () => this.act(dismantleWeapon(run, weapon), (next) => (next.selected = undefined)),
        });
        y += 62;
        addText(this, centre, y, STRINGS.prep.equipHint, { size: 15, colour: PALETTE.brass }).setOrigin(0.5, 0);
      }
      if (view.message) {
        addText(this, centre, CARD_TOP + CARD_HEIGHT - 12, view.message, { size: 16, weight: '700', colour: PALETTE.danger }).setOrigin(0.5, 1);
      }
      return;
    }

    // The synergy panel lists active synergies and near misses (GDD 15.8).
    addText(this, centre, y, STRINGS.prep.synergies, { role: 'hand', size: 26, colour: PALETTE.brass }).setOrigin(0.5, 0);
    y += 36;
    const active =
      report.active.length > 0
        ? report.active.map((entry) => `${entry.def.name}: ${entry.def.effect}`).join('\n')
        : STRINGS.prep.noSynergies;
    const activeText = addText(this, x + 12, y, active, { size: 14, weight: '500', wrapWidth: width - 24 });
    y += activeText.height + 14;
    if (report.nearMisses.length > 0 && y < CARD_TOP + CARD_HEIGHT - 120) {
      addText(this, centre, y, STRINGS.prep.nearMisses, { role: 'hand', size: 24, colour: PALETTE.brass }).setOrigin(0.5, 0);
      y += 32;
      const room = Math.max(1, Math.floor((CARD_TOP + CARD_HEIGHT - 60 - y) / 38));
      addText(this, x + 12, y, report.nearMisses.slice(0, room).map((miss) => miss.text).join('\n'), {
        size: 14,
        colour: PALETTE.brass,
        wrapWidth: width - 24,
      });
    }
    const hint = view.message ?? STRINGS.prep.removeHint;
    addText(this, centre, CARD_TOP + CARD_HEIGHT - 10, hint, {
      size: 14,
      weight: view.message ? '700' : '400',
      colour: view.message ? PALETTE.danger : PALETTE.brass,
      align: 'center',
      wrapWidth: width - 24,
    }).setOrigin(0.5, 1);
  }

  /** The tray along the bottom: owned components sorted by slot type, the reserve and the recipes. */
  private drawTray(): void {
    const run = this.run;
    const view = this.view;
    const components = [...run.inventory].sort(
      (a, b) => SLOT_TYPES.indexOf(a.def.slot) - SLOT_TYPES.indexOf(b.def.slot) || a.def.name.localeCompare(b.def.name),
    );
    const tabs: Array<[TrayTab, string]> = [
      ['components', STRINGS.prep.trayComponents(components.length)],
      ['weapons', STRINGS.prep.trayWeapons(run.reserve.length)],
      ['recipes', STRINGS.prep.trayRecipes],
    ];
    tabs.forEach(([tab, label], index) => {
      new Button(this, MARGIN + 105 + index * 218, TRAY_TOP + 20, {
        label,
        width: 210,
        height: 38,
        textSize: 18,
        selected: view.tray === tab,
        onClick: () =>
          this.redraw((next) => {
            next.tray = tab;
            next.page = 0;
            next.selected = undefined;
            next.upgrade = undefined;
          }),
      });
    });

    const count =
      view.tray === 'components' ? components.length : view.tray === 'weapons' ? run.reserve.length : recipes().length;
    const pages = Math.max(1, Math.ceil(count / TRAY_PER_PAGE));
    const page = Math.min(view.page, pages - 1);
    if (pages > 1) {
      const right = SCREEN.width - MARGIN;
      new Button(this, right - 150, TRAY_TOP + 20, {
        label: '<',
        width: 60,
        height: 38,
        textSize: 22,
        enabled: page > 0,
        onClick: () => this.redraw((next) => (next.page = page - 1)),
      });
      addText(this, right - 90, TRAY_TOP + 20, STRINGS.prep.page(page + 1, pages), { size: 16, weight: '700' }).setOrigin(0.5);
      new Button(this, right - 30, TRAY_TOP + 20, {
        label: '>',
        width: 60,
        height: 38,
        textSize: 22,
        enabled: page < pages - 1,
        onClick: () => this.redraw((next) => (next.page = page + 1)),
      });
    }

    const chipTop = TRAY_TOP + 46;
    const first = page * TRAY_PER_PAGE;
    const selected = view.selected;
    for (let index = 0; index < TRAY_PER_PAGE; index++) {
      const x = MARGIN + 4 + index * (CHIP_WIDTH + CHIP_GAP);
      if (view.tray === 'components') {
        const component = components[first + index];
        if (!component) continue;
        const isSelected = selected?.kind === 'component' && selected.component === component;
        this.drawChip(
          x,
          chipTop,
          component.def.name,
          `${component.def.slot}  ·  ${component.def.quality}`,
          QUALITY_COLOURS[component.def.quality],
          isSelected,
          1,
          () =>
            this.redraw((next) => {
              next.selected = isSelected ? undefined : { kind: 'component', component };
              next.upgrade = undefined;
              next.message = undefined;
            }),
          (ix, iy, size) => componentIcon(this, component.def, ix, iy, size),
        );
        this.dragSources.push({ x, y: chipTop, w: CHIP_WIDTH, h: CHIP_HEIGHT, component });
      } else if (view.tray === 'weapons') {
        const weapon = run.reserve[first + index];
        if (!weapon) continue;
        const isSelected = selected?.kind === 'reserve' && selected.weapon === weapon;
        this.drawChip(
          x,
          chipTop,
          weapon.def.name,
          `${weapon.quality}  ·  ${STRINGS.prep.grade(GRADE_NUMERALS[weapon.grade] ?? '')}`,
          QUALITY_COLOURS[weapon.quality],
          isSelected,
          1,
          () =>
            this.redraw((next) => {
              next.selected = isSelected ? undefined : { kind: 'reserve', weapon };
              next.upgrade = undefined;
              next.message = undefined;
            }),
          (ix, iy, size) => weaponIcon(this, weapon.def, ix, iy, size),
        );
      } else {
        const def = recipes()[first + index];
        if (!def) continue;
        const cost = recipeCost(def, run.relics);
        const isSelected = selected?.kind === 'recipe' && selected.def === def;
        const affordable = buildProblem(run, def) === undefined;
        this.drawChip(
          x,
          chipTop,
          def.name,
          cost ? `${def.slot}  ·  ${cost.gold} gold, ${cost.amount} ${cost.material}` : def.slot,
          QUALITY_COLOURS[def.quality],
          isSelected,
          affordable ? 1 : 0.55,
          () =>
            this.redraw((next) => {
              next.selected = isSelected ? undefined : { kind: 'recipe', def };
              next.upgrade = undefined;
              next.message = undefined;
            }),
          (ix, iy, size) => componentIcon(this, def, ix, iy, size),
        );
      }
    }
    if (count === 0) {
      const empty = view.tray === 'components' ? STRINGS.prep.trayEmptyComponents : STRINGS.prep.trayEmptyWeapons;
      addText(this, SCREEN.width / 2, chipTop + CHIP_HEIGHT / 2, empty, { size: 17, colour: PALETTE.brass }).setOrigin(0.5);
    }
  }

  private drawChip(
    x: number,
    y: number,
    name: string,
    line: string,
    lineColour: string,
    selected: boolean,
    alpha: number,
    onClick: () => void,
    icon?: (x: number, y: number, size: number) => Phaser.GameObjects.GameObject[],
  ): void {
    this.panel(x, y, CHIP_WIDTH, CHIP_HEIGHT, {
      stroke: selected ? GOLD : INK,
      strokeWidth: selected ? 5 : 2,
      alpha,
      onClick,
    });
    // The item's icon sits on the left, the name and its line beside it (GDD 15.8).
    const inset = icon ? CHIP_ICON + 10 : 0;
    if (icon) {
      for (const part of icon(x + 8 + CHIP_ICON / 2, y + CHIP_HEIGHT / 2, CHIP_ICON)) (part as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(alpha);
    }
    addText(this, x + inset + (CHIP_WIDTH - inset) / 2, y + 8, name, {
      size: 16,
      weight: '700',
      align: 'center',
      wrapWidth: CHIP_WIDTH - inset - 12,
    })
      .setOrigin(0.5, 0)
      .setAlpha(alpha);
    addText(this, x + inset + (CHIP_WIDTH - inset) / 2, y + CHIP_HEIGHT - 8, line, { size: 13, weight: '700', colour: lineColour, align: 'center', wrapWidth: CHIP_WIDTH - inset - 6 })
      .setOrigin(0.5, 1)
      .setAlpha(alpha);
  }

  // --- Shop ----------------------------------------------------------------------------

  private drawShop(): void {
    const shopId = this.view.shop;
    if (shopId && this.run.shops[shopId].visit) this.drawShopFloor(shopId);
    else this.drawDoors();
  }

  /** Three doors: a free visit opens one shop of the player's choice (GDD 6.5, 15.8). */
  private drawDoors(): void {
    const run = this.run;
    const width = 400;
    const gap = 24;
    addText(this, SCREEN.width / 2, 90, STRINGS.prep.doors, { role: 'heading', size: 40 }).setOrigin(0.5, 0);
    addText(this, SCREEN.width / 2, 142, run.freeVisit ? STRINGS.prep.freeVisitNote : STRINGS.prep.paidVisitNote, {
      size: 19,
      colour: PALETTE.brass,
    }).setOrigin(0.5, 0);
    SHOP_IDS.forEach((id, index) => {
      const shop = SHOPS[id];
      const x = MARGIN + index * (width + gap);
      const centre = x + width / 2;
      this.panel(x, 190, width, 440, { fill: PANEL, strokeWidth: 3 });
      addText(this, centre, 214, shop.name, { role: 'heading', size: 36 }).setOrigin(0.5, 0);
      addText(this, centre, 258, shop.keeper, { role: 'hand', size: 24, colour: PALETTE.brass }).setOrigin(0.5, 0);
      // The keeper's portrait, or a door until the portrait exists (GDD 15.8).
      keeperIcon(this, id, centre, 352, 150, 110);
      addText(this, centre, 414, shop.stockText, { size: 16, align: 'center', wrapWidth: width - 48 }).setOrigin(0.5, 0);
      const fee = visitFee(run, id);
      const open = run.shops[id].visit !== undefined;
      if (run.shops[id].previewed && !open) {
        // Perfect Information: the next milestone stock, before the choice of door (GDD 8.12).
        const names = run.shops[id].stock.map((item) => (item ? itemName(item) : '')).filter((name) => name !== '');
        addText(this, centre, 470, STRINGS.prep.preview(names.join(', ')), {
          size: 15,
          weight: '700',
          align: 'center',
          wrapWidth: width - 40,
        }).setOrigin(0.5, 0);
      }
      let label: string;
      if (open) label = STRINGS.prep.enterOpen;
      else if (fee === 0) label = STRINGS.prep.enterFree;
      else label = STRINGS.prep.enterPaid(fee);
      new Button(this, centre, 560, {
        label,
        width: width - 60,
        height: 72,
        textSize: 28,
        enabled: run.gold >= fee,
        onClick: () =>
          this.act(openShop(run, id), (next) => {
            next.shop = id;
            next.message = STRINGS.prep.keeper[id].greet;
          }),
      });
    });
    if (this.view.message) {
      addText(this, SCREEN.width / 2, 664, this.view.message, { size: 19, weight: '700', colour: PALETTE.danger }).setOrigin(0.5);
    }
  }

  /** The open shop: the keeper, 5 or 6 item cards, the specialist slot and the reroll lever (GDD 15.8). */
  private drawShopFloor(shopId: ShopId): void {
    const run = this.run;
    const shop = SHOPS[shopId];
    const state = run.shops[shopId];
    const visit = state.visit;
    if (!visit) return;

    // The keeper stands beside the counter (GDD 15.8).
    keeperIcon(this, shopId, MARGIN + 34, 104, 64, 58);
    addText(this, MARGIN + 74, 82, shop.name, { role: 'heading', size: 34 });
    addText(this, MARGIN + 74 + 250, 92, this.view.message ?? STRINGS.prep.keeper[shopId].greet, {
      role: 'hand',
      size: 26,
      colour: PALETTE.brass,
    });
    new Button(this, SCREEN.width - MARGIN - 100, 100, {
      label: STRINGS.prep.otherShops,
      width: 200,
      height: 48,
      textSize: 20,
      onClick: () => this.redraw((next) => ((next.shop = undefined), (next.message = undefined))),
    });

    const slots: Array<number | 'specialist'> = [...state.stock.keys(), 'specialist'];
    const total = slots.length * SHOP_CARD_WIDTH + (slots.length - 1) * SHOP_CARD_GAP;
    const left = (SCREEN.width - total) / 2;
    slots.forEach((slot, index) => {
      const item = slot === 'specialist' ? state.specialist : state.stock[slot];
      this.drawItemCard(left + index * (SHOP_CARD_WIDTH + SHOP_CARD_GAP), 140, shopId, slot, item);
    });

    // The reroll lever with the current price.
    const cost = shopRerollCost(run, shopId);
    new Button(this, MARGIN + 150, 652, {
      label: STRINGS.prep.reroll(cost),
      width: 300,
      height: 64,
      textSize: 26,
      enabled: run.gold >= cost,
      onClick: () => this.act(rerollShop(run, shopId), (next) => (next.message = STRINGS.prep.keeper[shopId].reroll)),
    });
    addText(this, MARGIN + 330, 652, STRINGS.prep.caps(visit.experimental, visit.extraordinary, visit.purchases), {
      size: 16,
      colour: PALETTE.brass,
      weight: '500',
    }).setOrigin(0, 0.5);
  }

  private drawItemCard(x: number, y: number, shopId: ShopId, slot: number | 'specialist', item: ShopItem | undefined): void {
    const run = this.run;
    const width = SHOP_CARD_WIDTH;
    const height = 470;
    const centre = x + width / 2;
    const specialist = slot === 'specialist';
    this.panel(x, y, width, height, { fill: PANEL, strokeWidth: specialist ? 4 : 2, stroke: specialist ? GOLD : INK });
    if (specialist) {
      addText(this, centre, y + 6, STRINGS.prep.specialist, { size: 13, weight: '700', colour: PALETTE.brass }).setOrigin(0.5, 0);
    }
    if (!item) {
      addText(this, centre, y + height / 2, STRINGS.prep.sold, { role: 'hand', size: 30, colour: PALETTE.brass }).setOrigin(0.5);
      return;
    }
    let cursor = y + 26;
    addText(this, centre, cursor, item.quality, { size: 14, weight: '700', colour: QUALITY_COLOURS[item.quality] }).setOrigin(0.5, 0);
    cursor += 20;
    const name = addText(this, centre, cursor, itemName(item), {
      size: 18,
      weight: '700',
      align: 'center',
      wrapWidth: width - 12,
    }).setOrigin(0.5, 0);
    cursor += name.height + 6;
    if (item.kind === 'component') componentIcon(this, item.def, centre, cursor + 26, 52);
    else weaponIcon(this, item.weapon.def, centre, cursor + 26, 52);
    cursor += 58;

    let kind: string;
    let body: string;
    if (item.kind === 'component') {
      const def = item.def;
      kind = def.slot;
      const fits = def.fits === 'All' ? STRINGS.prep.fitsAll : STRINGS.prep.fits(def.fits.join(', '));
      body = `${def.effect}\n\n${fits}\n\nTags: ${def.tags.join(', ')}`;
    } else {
      kind = STRINGS.prep.weaponKind(item.weapon.def.family);
      body = weaponDetails(item.weapon);
    }
    addText(this, centre, cursor, kind, { size: 14, weight: '700', colour: PALETTE.brass }).setOrigin(0.5, 0);
    cursor += 24;
    // The item description follows the text size and readable font settings (GDD 3.10).
    addText(this, x + 8, cursor, body, { size: 13, wrapWidth: width - 16, scalable: true });

    const problem = buyProblem(run, shopId, slot);
    const node = lockedBy(run, item.kind === 'component' ? item.def : item.weapon.def);
    if (problem && problem !== 'no-gold') {
      addText(this, centre, y + height - 76, node ? STRINGS.prep.lockedBy(node) : STRINGS.prep.problems[problem], {
        size: 13,
        weight: '700',
        colour: PALETTE.danger,
        align: 'center',
        wrapWidth: width - 12,
      }).setOrigin(0.5, 1);
    }
    new Button(this, centre, y + height - 38, {
      label: STRINGS.prep.buy(item.price),
      width: width - 12,
      height: 60,
      textSize: 19,
      enabled: problem === undefined,
      onClick: () =>
        this.act(buyItem(run, shopId, slot), (next) => {
          next.message = STRINGS.prep.keeper[shopId].buy;
        }),
    });
    if (problem === 'no-gold') {
      this.add.rectangle(x + 6, y + height - 70, width - 12, 3, DANGER, 0.7).setOrigin(0);
    }
  }
}

/** A weapon's description for cards: behaviour, damage types, quality steps and default parts. */
function weaponDetails(weapon: WeaponInstance): string {
  const def = weapon.def;
  const lines = [def.description, `${def.damageTypes.join(' and ')} damage`, `Tags: ${def.tags.join(', ')}`];
  if (weapon.qualitySteps.length > 0) {
    lines.push(STRINGS.prep.qualitySteps(weapon.qualitySteps.map((stat) => UPGRADE_LABELS[stat]).join(', ')));
  }
  const parts = SLOT_TYPES.map((slot) => weapon.components[slot]?.def.name).filter((name): name is string => name !== undefined);
  if (parts.length > 0) lines.push(STRINGS.prep.defaults(parts.join(', ')));
  return lines.join('\n\n');
}
