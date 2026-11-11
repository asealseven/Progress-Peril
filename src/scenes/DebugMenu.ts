import Phaser from 'phaser';
import { COMPONENT_LIST, SLOT_TYPES, componentFitsFamily } from '../data/components';
import type { ComponentDef, SlotType } from '../data/components';
import { PALETTE, hexToNumber } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { WEAPON_LIST } from '../data/weapons';
import type { WeaponDef } from '../data/weapons';
import {
  WEAPON_SLOTS,
  auxiliaryOpen,
  cloneWeapon,
  createComponent,
  createWeapon,
  resolveLoadout,
} from '../sim/loadout';
import type { ResolvedWeapon, WeaponInstance } from '../sim/loadout';
import { resolvePlayerStats } from '../sim/run';
import type { RunState } from '../sim/run';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';

export interface DebugMenuData {
  run: RunState;
  /** The loadout being edited. Absent on first open. */
  draft?: Array<WeaponInstance | undefined>;
}

const COLUMN_WIDTH = 396;
const COLUMN_GAP = 12;
const TOP = 104;
const ROW = 46;
const ARROW = 44;

/**
 * Debug menu: equips any weapon and component (CLAUDE.md Milestone 2).
 * Opens over the paused Combat scene from the debug overlay. Applying
 * restarts the current round, since stats and tags only change in preparation.
 */
export class DebugMenu extends Phaser.Scene {
  private run!: RunState;
  private draft: Array<WeaponInstance | undefined> = [];

  constructor() {
    super('DebugMenu');
  }

  init(data: DebugMenuData): void {
    this.run = data.run;
    this.draft =
      data.draft ??
      Array.from({ length: WEAPON_SLOTS }, (_, index) => {
        const weapon = data.run.weapons[index];
        return weapon ? cloneWeapon(weapon) : undefined;
      });
  }

  create(): void {
    const { width, height } = SCREEN;
    const centreX = width / 2;
    this.add.rectangle(centreX, height / 2, width, height, hexToNumber(PALETTE.parchment), 1).setInteractive();
    drawPageFrame(this.add.graphics(), width, height, 14);

    addText(this, centreX, 40, STRINGS.debug.menuTitle, { role: 'heading', size: 38 }).setOrigin(0.5);
    addText(this, centreX, 76, STRINGS.debug.menuNote, { size: 15, colour: PALETTE.brass, weight: '500' }).setOrigin(0.5);

    const equipped = this.draft.filter((weapon): weapon is WeaponInstance => weapon !== undefined);
    const loadout = resolveLoadout(equipped, resolvePlayerStats(this.run.character));
    const total = WEAPON_SLOTS * COLUMN_WIDTH + (WEAPON_SLOTS - 1) * COLUMN_GAP;
    const left = centreX - total / 2;
    for (let slot = 0; slot < WEAPON_SLOTS; slot++) {
      const weapon = this.draft[slot];
      const resolved = weapon ? loadout.weapons[equipped.indexOf(weapon)] : undefined;
      this.addColumn(slot, left + slot * (COLUMN_WIDTH + COLUMN_GAP), weapon, resolved);
    }

    const canApply = equipped.length > 0;
    new Button(this, centreX - 190, height - 44, {
      label: canApply ? STRINGS.debug.apply : STRINGS.debug.needWeapon,
      width: 360,
      height: 48,
      textSize: 22,
      onClick: () => {
        if (canApply) this.apply();
      },
    });
    new Button(this, centreX + 190, height - 44, {
      label: STRINGS.debug.cancel,
      width: 360,
      height: 48,
      textSize: 22,
      onClick: () => this.cancel(),
    });

    const keyboard = this.input.keyboard;
    const onEscape = (): void => this.cancel();
    keyboard?.on('keydown-ESC', onEscape);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-ESC', onEscape));
  }

  /** A row with left and right arrows cycling through options. */
  private addCycler(
    x: number,
    y: number,
    label: string,
    value: string,
    enabled: boolean,
    onStep: (direction: 1 | -1) => void,
  ): void {
    const ink = hexToNumber(PALETTE.ink);
    const panel = this.add.rectangle(x + COLUMN_WIDTH / 2, y + ROW / 2 - 2, COLUMN_WIDTH - ARROW * 2 - 12, ROW - 6, 0xffffff, 0);
    panel.setStrokeStyle(2, ink, enabled ? 0.5 : 0.2);
    if (label) {
      addText(this, x + ARROW + 14, y + 3, label, { size: 11, colour: PALETTE.brass, weight: '700' });
    }
    addText(this, x + COLUMN_WIDTH / 2, y + (label ? 25 : 20), value, {
      size: label ? 16 : 20,
      weight: '700',
      colour: enabled ? PALETTE.ink : PALETTE.brass,
    }).setOrigin(0.5);
    if (!enabled) return;
    for (const direction of [-1, 1] as const) {
      new Button(this, direction < 0 ? x + ARROW / 2 : x + COLUMN_WIDTH - ARROW / 2, y + ROW / 2 - 2, {
        label: direction < 0 ? '<' : '>',
        width: ARROW,
        height: ROW - 6,
        textSize: 22,
        onClick: () => onStep(direction),
      });
    }
  }

  private addColumn(slot: number, x: number, weapon: WeaponInstance | undefined, resolved: ResolvedWeapon | undefined): void {
    let y = TOP;
    addText(this, x + COLUMN_WIDTH / 2, y - 4, STRINGS.debug.slot(slot + 1), {
      role: 'hand',
      size: 24,
      colour: PALETTE.brass,
    }).setOrigin(0.5, 0);
    y += 28;

    // Weapon: no weapon, then the 24 weapons in catalogue order.
    const weaponOptions: Array<WeaponDef | undefined> = [undefined, ...WEAPON_LIST];
    this.addCycler(x, y, '', weapon ? weapon.def.name : STRINGS.debug.noWeapon, true, (direction) => {
      const next = this.cycle(weaponOptions, weapon?.def, direction);
      this.draft[slot] = next ? this.swapWeapon(weapon, next) : undefined;
      this.refresh();
    });
    y += ROW;
    if (!weapon || !resolved) return;

    addText(this, x + COLUMN_WIDTH / 2, y, `${weapon.def.family}  ·  ${weapon.def.damageTypes.join(' and ')}  ·  ${resolved.delivery}`, {
      size: 14,
      colour: PALETTE.brass,
      weight: '500',
    }).setOrigin(0.5, 0);
    y += 24;

    new Button(this, x + COLUMN_WIDTH / 2, y + 16, {
      label: auxiliaryOpen(weapon) ? STRINGS.debug.gradeHigh : STRINGS.debug.gradeLow,
      width: COLUMN_WIDTH - 12,
      height: 32,
      textSize: 17,
      onClick: () => {
        weapon.grade = auxiliaryOpen(weapon) ? 1 : 3;
        weapon.merges = 0;
        this.refresh();
      },
    });
    y += 40;

    for (const slotType of SLOT_TYPES) {
      const closed = slotType === 'Auxiliary' && !auxiliaryOpen(weapon);
      const options: Array<ComponentDef | undefined> = [
        undefined,
        ...COMPONENT_LIST.filter((entry) => entry.slot === slotType && componentFitsFamily(entry, weapon.def.family)),
      ];
      const current = weapon.components[slotType]?.def;
      const value = closed ? STRINGS.debug.closed : current ? current.name : STRINGS.debug.empty;
      this.addCycler(x, y, slotType, value, !closed, (direction) => {
        this.setComponent(weapon, slotType, this.cycle(options, current, direction));
        this.refresh();
      });
      y += ROW;
    }

    y += 2;
    const tier = (value: number, digits = 0): string => value.toFixed(digits);
    const lines = [
      `Damage ${tier(resolved.damage, 1)}   Attacks per second ${tier(resolved.attacksPerSecond, 2)}`,
      `Range ${tier(resolved.range)}   Area ${tier(resolved.area)}   Knockback ${tier(resolved.knockback)}`,
      `Critical ${tier(resolved.criticalChance * 100)}%  x${tier(resolved.criticalDamage, 2)}   Targeting ${resolved.targeting}${resolved.markedFirst ? ', Marked first' : ''}`,
      `Projectiles ${resolved.projectiles}   Penetration ${resolved.penetration >= 99 ? 'full line' : resolved.penetration}   Bounces ${resolved.bounces}`,
      `Behaviour: ${resolved.behaviours.length > 0 ? resolved.behaviours.join(', ') : resolved.delivery}`,
      `Tags: ${resolved.tags.join(', ')}`,
      ...Object.values(weapon.components)
        .filter((entry) => entry !== undefined)
        .map((entry) => `${entry.def.name}: ${entry.def.effect}`),
      ...resolved.inactive.map((entry) => STRINGS.debug.waiting(entry.component, entry.activeFrom)),
    ];
    addText(this, x + 6, y, lines.join('\n'), { size: 13, wrapWidth: COLUMN_WIDTH - 12 });
  }

  private cycle<T>(options: readonly T[], current: T, direction: 1 | -1): T {
    const index = Math.max(0, options.indexOf(current));
    return options[(index + direction + options.length) % options.length] as T;
  }

  /** A new weapon keeps the grade and every component still fitting. */
  private swapWeapon(previous: WeaponInstance | undefined, def: WeaponDef): WeaponInstance {
    const weapon = createWeapon(def);
    if (!previous) return weapon;
    weapon.grade = previous.grade;
    for (const slotType of SLOT_TYPES) {
      const component = previous.components[slotType];
      if (component && componentFitsFamily(component.def, def.family)) weapon.components[slotType] = { ...component };
    }
    return weapon;
  }

  private setComponent(weapon: WeaponInstance, slotType: SlotType, def: ComponentDef | undefined): void {
    if (def) weapon.components[slotType] = createComponent(def);
    else delete weapon.components[slotType];
  }

  private refresh(): void {
    this.scene.restart({ run: this.run, draft: this.draft });
  }

  private apply(): void {
    this.run.weapons = this.draft.filter((weapon): weapon is WeaponInstance => weapon !== undefined);
    this.scene.stop('Combat');
    this.scene.start('Combat', { run: this.run });
  }

  private cancel(): void {
    this.scene.resume('Combat');
    this.scene.stop();
  }
}
