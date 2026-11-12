import Phaser from 'phaser';
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
import { resolvePlayerStats } from '../sim/run';
import type { RunState } from '../sim/run';
import { Button } from '../ui/button';
import { addText } from '../ui/text';

type Selection =
  | { readonly kind: 'component'; readonly component: ComponentInstance }
  | { readonly kind: 'reserve'; readonly weapon: WeaponInstance }
  | { readonly kind: 'recipe'; readonly def: ComponentDef };

type TrayTab = 'components' | 'weapons' | 'recipes';

/** What the screen shows. The scene redraws from this after every action. */
interface PrepView {
  tab: 'workbench' | 'shop';
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
const CHIP_GAP = 8;
const SHOP_CARD_WIDTH = 170;
const SHOP_CARD_GAP = 8;

/**
 * The preparation screen (GDD 3.3, 15.8): Workbench and Shop tabs, a resource
 * bar and a large Start button. Untimed: the round starts when the player
 * presses Start. The Research tab arrives with Milestone 6.
 */
export class Preparation extends Phaser.Scene {
  private run!: RunState;
  private view!: PrepView;

  constructor() {
    super('Preparation');
  }

  init(data: PreparationData): void {
    this.run = data.run;
    // A free visit opens on the Shop tab, so the choice of door comes first.
    this.view = data.view ?? {
      tab: data.run.freeVisit ? 'shop' : 'workbench',
      tray: 'components',
      page: 0,
      debug: false,
    };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    this.drawBar();
    if (this.view.tab === 'workbench') this.drawWorkbench();
    else this.drawShop();

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
    this.redraw((view) => {
      view.message = problem ? STRINGS.prep.problems[problem] : undefined;
      if (!problem) change?.(view);
    });
  }

  private startRound(): void {
    this.scene.start('Combat', { run: this.run });
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
      panel.on('pointerup', onClick);
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

    new Button(this, MARGIN + 90, BAR_HEIGHT / 2 + 2, {
      label: STRINGS.prep.workbench,
      width: 180,
      height: 52,
      textSize: 24,
      selected: view.tab === 'workbench',
      onClick: () => this.redraw((next) => ((next.tab = 'workbench'), (next.message = undefined))),
    });
    new Button(this, MARGIN + 190 + 110, BAR_HEIGHT / 2 + 2, {
      label: run.freeVisit ? STRINGS.prep.shopFree : STRINGS.prep.shop,
      width: 220,
      height: 52,
      textSize: 24,
      selected: view.tab === 'shop',
      onClick: () => this.redraw((next) => ((next.tab = 'shop'), (next.message = undefined), (next.upgrade = undefined))),
    });

    // Resource bar: gold and the four materials (GDD 15.8).
    const resources = [
      STRINGS.prep.gold(run.gold),
      ...MATERIALS.map((material) => STRINGS.prep.material(material, run.materials[material])),
    ].join('     ');
    addText(this, 446, BAR_HEIGHT / 2 + 2, resources, { size: 19, weight: '700' }).setOrigin(0, 0.5);

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
    }
  }

  // --- Workbench ---------------------------------------------------------------------

  private drawWorkbench(): void {
    const run = this.run;
    const loadout = resolveLoadout(run.weapons.slice(0, WEAPON_SLOTS), resolvePlayerStats(run.character), {
      researchSynergies: run.researchSynergies,
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
    addText(this, x + CARD_WIDTH / 2, CARD_TOP + 10, def.name, { role: 'heading', size: 25 }).setOrigin(0.5, 0);
    const gradeLabel = STRINGS.prep.grade(GRADE_NUMERALS[weapon.grade] ?? '');
    addText(this, x + CARD_WIDTH / 2, CARD_TOP + 44, STRINGS.prep.weaponLine(weapon.quality, gradeLabel, def.family), {
      size: 15,
      weight: '700',
      colour: QUALITY_COLOURS[weapon.quality],
    }).setOrigin(0.5, 0);
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
    new Button(this, x + CARD_WIDTH / 2, rowOne, {
      label: cost
        ? STRINGS.prep.upgrade(GRADE_NUMERALS[weapon.grade + 1] ?? '', cost.gold, cost.scrap)
        : STRINGS.prep.maxGrade,
      width: CARD_WIDTH - 16,
      height: 54,
      textSize: 19,
      enabled: cost !== undefined && run.gold >= cost.gold && run.materials.Scrap >= cost.scrap,
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
    addText(this, x + width / 2, y + 36, label, {
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
        const recipe = recipeCost(selected.def);
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
        this.drawChip(x, chipTop, component.def.name, `${component.def.slot}  ·  ${component.def.quality}`, QUALITY_COLOURS[component.def.quality], isSelected, 1, () =>
          this.redraw((next) => {
            next.selected = isSelected ? undefined : { kind: 'component', component };
            next.upgrade = undefined;
            next.message = undefined;
          }),
        );
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
        );
      } else {
        const def = recipes()[first + index];
        if (!def) continue;
        const cost = recipeCost(def);
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
  ): void {
    this.panel(x, y, CHIP_WIDTH, CHIP_HEIGHT, {
      stroke: selected ? GOLD : INK,
      strokeWidth: selected ? 5 : 2,
      alpha,
      onClick,
    });
    addText(this, x + CHIP_WIDTH / 2, y + 8, name, {
      size: 16,
      weight: '700',
      align: 'center',
      wrapWidth: CHIP_WIDTH - 12,
    })
      .setOrigin(0.5, 0)
      .setAlpha(alpha);
    addText(this, x + CHIP_WIDTH / 2, y + CHIP_HEIGHT - 8, line, { size: 13, weight: '700', colour: lineColour })
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
      addText(this, centre, 266, shop.keeper, { role: 'hand', size: 26, colour: PALETTE.brass }).setOrigin(0.5, 0);
      addText(this, centre, 320, shop.stockText, { size: 18, align: 'center', wrapWidth: width - 48 }).setOrigin(0.5, 0);
      const fee = visitFee(run, id);
      const open = run.shops[id].visit !== undefined;
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

    addText(this, MARGIN + 8, 82, shop.name, { role: 'heading', size: 34 });
    addText(this, MARGIN + 8 + 250, 92, this.view.message ?? STRINGS.prep.keeper[shopId].greet, {
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
    addText(this, x + 8, cursor, body, { size: 13, wrapWidth: width - 16 });

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
