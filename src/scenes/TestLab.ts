import Phaser from 'phaser';
import { BOSS_BY_KINGDOM } from '../data/bosses';
import { CHARACTERS } from '../data/characters';
import type { Material } from '../data/economy';
import { ENEMY_LIST } from '../data/enemies';
import type { EnemyId } from '../data/enemies';
import { KINGDOM_NAMES } from '../data/kingdoms';
import { MINI_BOSS_BY_KINGDOM } from '../data/miniBosses';
import { KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { KingdomName } from '../data/palette';
import { CAMPAIGN_ROUNDS, roundKind, territoryIndex } from '../data/rounds';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { WEAPON_LIST } from '../data/weapons';
import { newSeed } from '../sim/rng';
import { createRun } from '../sim/run';
import type { RunState } from '../sim/run';
import type { EnemyRank } from '../sim/world/types';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { DEV_TOOLS } from './devTools';
import type { TestEnemies, TestSetup } from './devTools';
import { archive, enterSandbox, inSandbox, leaveSandbox } from './session';

/** What a lab visit remembers, so a return from a test round keeps the picks. */
interface LabState {
  kingdom: KingdomName;
  round: number;
  /** Index into the route options for the territories before this one. */
  route: number;
  phase: number;
  weapon: number;
  enemies: number;
  rank: number;
  hold: boolean;
  invincible: boolean;
}

const ENEMY_OPTIONS: readonly TestEnemies[] = ['roster', 'quiet', 'director', ...ENEMY_LIST.map((def) => def.id as EnemyId)];
const RANKS: readonly EnemyRank[] = ['normal', 'elite', 'champion'];
const ENDLESS_LOOP_ROUND = 36;
const LAB_GOLD = 5000;
const LAB_MATERIALS = 40;

const state: LabState = {
  kingdom: 'Keldrath',
  round: 1,
  route: 0,
  phase: 1,
  weapon: Math.max(0, WEAPON_LIST.findIndex((def) => def.name === 'Crossbow')),
  enemies: 0,
  rank: 0,
  hold: true,
  invincible: true,
};

/** Every ordered pick of earlier kingdoms, for the territories before the chosen one. */
function routeOptions(kingdom: KingdomName, territory: number): KingdomName[][] {
  const others = KINGDOM_NAMES.filter((name) => name !== kingdom);
  let options: KingdomName[][] = [[]];
  for (let step = 0; step < territory; step++) {
    options = options.flatMap((route) => others.filter((name) => !route.includes(name)).map((name) => [...route, name]));
  }
  return options;
}

function routeFor(kingdom: KingdomName, round: number, pick: number): KingdomName[] {
  const options = routeOptions(kingdom, territoryIndex(round));
  const earlier = options[((pick % options.length) + options.length) % options.length] ?? [];
  return [...earlier, kingdom];
}

function phaseCount(round: number): number {
  const kind = roundKind(round);
  return kind === 'boss' ? 3 : kind === 'mini-boss' ? 2 : 1;
}

function cycle(index: number, length: number, direction: number): number {
  return (((index + direction) % length) + length) % length;
}

/**
 * Dev tools only: jumps straight to any kingdom, round, boss phase or screen,
 * so new art shows in place without playing a campaign. Every run made here
 * plays in the save sandbox.
 */
export class TestLab extends Phaser.Scene {
  constructor() {
    super('TestLab');
  }

  create(): void {
    if (!DEV_TOOLS) {
      this.scene.start('Hub');
      return;
    }
    enterSandbox(this);
    const { width, height } = SCREEN;
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height, 14);

    addText(this, width / 2, 50, STRINGS.lab.title, { role: 'heading', size: 44 }).setOrigin(0.5);
    addText(this, width / 2, 88, STRINGS.lab.sandbox, { size: 16, weight: '700', colour: PALETTE.danger }).setOrigin(0.5);

    this.drawCombat();
    this.drawScreens();

    const keyboard = this.input.keyboard;
    const back = (): void => {
      this.scene.start('Hub');
    };
    keyboard?.once('keydown-ESC', back);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-ESC', back));
  }

  // --- Combat test ---------------------------------------------------------------

  private drawCombat(): void {
    const left = 60;
    const columnWidth = 560;
    addText(this, left, 118, STRINGS.lab.combat, { role: 'heading', size: 28 });
    const band = this.add.graphics();
    band.fillStyle(hexToNumber(KINGDOM_COLOURS[state.kingdom]), 1);
    band.fillRect(left, 156, columnWidth, 6);

    const kind = roundKind(state.round);
    const phases = phaseCount(state.round);
    state.phase = Math.min(state.phase, phases);
    const territory = territoryIndex(state.round);
    const route = routeFor(state.kingdom, state.round, state.route);
    const enemies = ENEMY_OPTIONS[state.enemies] ?? 'roster';
    const rank = RANKS[state.rank] ?? 'normal';

    const roundLabel =
      kind === 'mini-boss'
        ? STRINGS.lab.miniBoss(MINI_BOSS_BY_KINGDOM[state.kingdom].name)
        : kind === 'boss'
          ? state.round === CAMPAIGN_ROUNDS
            ? STRINGS.lab.finalBoss(BOSS_BY_KINGDOM[state.kingdom].name)
            : STRINGS.lab.boss(BOSS_BY_KINGDOM[state.kingdom].name)
          : STRINGS.lab.encounter;
    const enemyLabel =
      enemies === 'roster'
        ? STRINGS.lab.roster
        : enemies === 'quiet'
          ? STRINGS.lab.quiet
          : enemies === 'director'
            ? STRINGS.lab.director
            : (ENEMY_LIST.find((def) => def.id === enemies)?.name ?? enemies);

    const rows: Array<{ label: string; change?: (direction: number) => void }> = [
      { label: STRINGS.lab.kingdom(state.kingdom), change: (d) => (state.kingdom = KINGDOM_NAMES[cycle(KINGDOM_NAMES.indexOf(state.kingdom), KINGDOM_NAMES.length, d)] ?? 'Keldrath') },
      { label: STRINGS.lab.round(state.round, roundLabel), change: (d) => (state.round = cycle(state.round - 1, CAMPAIGN_ROUNDS, d) + 1) },
      territory > 0
        ? { label: STRINGS.lab.route(route), change: (d) => (state.route = cycle(state.route, routeOptions(state.kingdom, territory).length, d)) }
        : { label: STRINGS.lab.route(route) },
      phases > 1
        ? { label: STRINGS.lab.phase(state.phase, phases), change: (d) => (state.phase = cycle(state.phase - 1, phases, d) + 1) }
        : { label: STRINGS.lab.noPhase },
      { label: STRINGS.lab.weapon(WEAPON_LIST[state.weapon]?.name ?? ''), change: (d) => (state.weapon = cycle(state.weapon, WEAPON_LIST.length, d)) },
      { label: STRINGS.lab.enemies(enemyLabel), change: (d) => (state.enemies = cycle(state.enemies, ENEMY_OPTIONS.length, d)) },
      { label: STRINGS.lab.rank(rank), change: (d) => (state.rank = cycle(state.rank, RANKS.length, d)) },
      { label: STRINGS.lab.hold(state.hold), change: () => (state.hold = !state.hold) },
      { label: STRINGS.lab.invincible(state.invincible), change: () => (state.invincible = !state.invincible) },
    ];
    rows.forEach((row, index) => this.addStepper(left, 194 + index * 50, columnWidth, row.label, row.change));

    new Button(this, left + columnWidth / 2, 656, {
      label: STRINGS.lab.start,
      width: columnWidth,
      height: 56,
      textSize: 26,
      selected: true,
      onClick: () => this.startRound(),
    });
  }

  /** One row: a back arrow, the value (tap to step forward) and a forward arrow. */
  private addStepper(x: number, y: number, width: number, label: string, change?: (direction: number) => void): void {
    const arrow = 44;
    const enabled = change !== undefined;
    const step = (direction: number): void => {
      change?.(direction);
      this.scene.restart();
    };
    new Button(this, x + arrow / 2, y, { label: '‹', width: arrow, height: 44, textSize: 26, enabled, onClick: () => step(-1) });
    new Button(this, x + width / 2, y, { label, width: width - arrow * 2 - 12, height: 44, textSize: 17, enabled, onClick: () => step(1) });
    new Button(this, x + width - arrow / 2, y, { label: '›', width: arrow, height: 44, textSize: 26, enabled, onClick: () => step(1) });
  }

  // --- Screens and art -------------------------------------------------------------

  private drawScreens(): void {
    const left = 680;
    const columnWidth = 540;
    addText(this, left, 118, STRINGS.lab.screens, { role: 'heading', size: 28 });

    const buttonWidth = (columnWidth - 12) / 2;
    const items: Array<[string, () => void]> = [
      [STRINGS.lab.gallery, () => this.scene.start('ArtGallery')],
      [STRINGS.lab.hub, () => this.scene.start('Hub')],
      [STRINGS.lab.prep, () => this.openPreparation()],
      [STRINGS.lab.reveal, () => this.scene.start('Transition', { run: this.buildRun(), step: 'reveal' })],
      [STRINGS.lab.opening, () => this.scene.start('Transition', { run: this.buildRun(), step: 'opening' })],
      [STRINGS.lab.endless, () => this.openEndlessMap()],
      [STRINGS.lab.victory, () => this.openEnding()],
      [STRINGS.lab.back, () => this.scene.start('Hub')],
    ];
    items.forEach(([label, onClick], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      new Button(this, left + buttonWidth / 2 + column * (buttonWidth + 12), 194 + row * 58, {
        label,
        width: buttonWidth,
        height: 50,
        textSize: 19,
        onClick,
      });
    });

    // Round details: who escorts the boss and which attacks Convergence borrows (GDD 10.6).
    const lines: string[] = [];
    const kind = roundKind(state.round);
    const route = routeFor(state.kingdom, state.round, state.route);
    if (kind === 'boss') {
      const previous = route[route.length - 2];
      lines.push(STRINGS.lab.escort(MINI_BOSS_BY_KINGDOM[previous ?? state.kingdom].name));
      if (state.round === CAMPAIGN_ROUNDS) {
        lines.push(STRINGS.lab.borrowed(route.slice(0, -1).map((name) => BOSS_BY_KINGDOM[name].signature.name)));
      }
    }
    lines.push(STRINGS.lab.note);
    addText(this, left, 438, lines.join('\n\n'), { size: 16, wrapWidth: columnWidth, colour: PALETTE.ink });

    new Button(this, left + columnWidth / 2, 656, {
      label: STRINGS.lab.leave,
      width: columnWidth,
      height: 56,
      textSize: 22,
      enabled: inSandbox(this),
      onClick: () => {
        leaveSandbox(this);
        this.scene.start('Hub');
      },
    });
  }

  // --- Building test runs ------------------------------------------------------------

  /** A sandbox run at the picked kingdom and round, with gold and materials to spend. */
  private buildRun(round: number = state.round, kingdoms?: KingdomName[]): RunState {
    enterSandbox(this);
    const weapon = WEAPON_LIST[state.weapon] ?? WEAPON_LIST[0];
    if (!weapon) throw new Error('No weapons');
    const run = createRun(newSeed(), CHARACTERS.inventor, weapon, archive(this), { trial: false });
    run.kingdoms = kingdoms ?? routeFor(state.kingdom, round, state.route);
    run.round = round;
    run.gold = LAB_GOLD;
    for (const material of Object.keys(run.materials) as Material[]) run.materials[material] = LAB_MATERIALS;
    return run;
  }

  private startRound(): void {
    const test: TestSetup = {
      enemies: ENEMY_OPTIONS[state.enemies] ?? 'roster',
      rank: RANKS[state.rank] ?? 'normal',
      hold: state.hold,
      invincible: state.invincible,
      bossPhase: state.phase,
    };
    this.scene.start('Combat', { run: this.buildRun(), test });
  }

  /** Preparation opens on a free visit, so the shopkeeper doors show. */
  private openPreparation(): void {
    const run = this.buildRun();
    run.freeVisit = true;
    this.scene.start('Preparation', { run });
  }

  /** The first endless loop: all five kingdoms behind, the chosen one next (GDD 13.3). */
  private openEndlessMap(): void {
    const others = KINGDOM_NAMES.filter((name) => name !== state.kingdom);
    const run = this.buildRun(ENDLESS_LOOP_ROUND, [state.kingdom, ...others, state.kingdom]);
    run.endless = true;
    this.scene.start('Transition', { run, step: 'reveal' });
  }

  /** The ending card of the chosen kingdom, as the final boss falls. */
  private openEnding(): void {
    const run = this.buildRun(CAMPAIGN_ROUNDS);
    run.status = 'complete';
    this.scene.start('Victory', { run });
  }
}
