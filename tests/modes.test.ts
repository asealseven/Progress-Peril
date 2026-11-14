import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { KINGDOM_NAMES } from '../src/data/kingdoms';
import { ASSIST_RATE, DEFAULT_SETTINGS, MAX_TIER, TIER_RATES, TRIAL_RULES, leversAt } from '../src/data/modes';
import { scalingRound, territorySlot } from '../src/data/rounds';
import { STARTING_WEAPONS, WEAPONS } from '../src/data/weapons';
import { createArchive, createFullArchive } from '../src/sim/archive';
import { planRound, threatCost } from '../src/sim/director';
import { openShop } from '../src/sim/economy';
import { resolveLoadout } from '../src/sim/loadout';
import { Rng } from '../src/sim/rng';
import {
  bossPlanForRound,
  continueEndless,
  createRun,
  createWorldForRound,
  finishRound,
  modeRate,
  resolvePlayerStats,
  revealKingdom,
  takeComponentChoice,
  trialPlan,
} from '../src/sim/run';
import type { RunOptions, RunState } from '../src/sim/run';
import type { SpawnEntry } from '../src/sim/world/types';
import { MIGRATIONS, SAVE_VERSION, decodeSave, fillSettings } from '../src/sim/save';

const INVENTOR = CHARACTERS.inventor;
const CROSSBOW = WEAPONS.crossbow;

function newRun(options: RunOptions = {}, archive = createFullArchive(), seed = 7): RunState {
  return createRun(seed, INVENTOR, CROSSBOW, archive, options);
}

/** Plays a round to its end without combat. */
function play(run: RunState, survive = true): void {
  revealKingdom(run);
  const world = createWorldForRound(run);
  world.phase = survive ? 'cleared' : 'defeat';
  if (survive && run.round % 7 === 0) world.bossFallen = true;
  finishRound(run, world);
}

/** Plays rounds up to and including the given round. */
function playTo(run: RunState, last: number): void {
  while (run.round <= last && run.status === 'active') play(run);
}

function planThreat(plan: readonly SpawnEntry[]): number {
  let total = 0;
  for (const entry of plan) {
    total += threatCost(entry.enemy, entry.rank) * entry.count;
    for (const member of entry.with ?? []) total += threatCost(member.enemy, member.rank) * member.count;
  }
  return total;
}

describe('Challenge Tiers and Assist (GDD 3.9)', () => {
  it('adds one lever per tier in the GDD order', () => {
    expect(leversAt(0)).toEqual([]);
    expect(leversAt(1)).toEqual(['enemyDamage']);
    expect(leversAt(MAX_TIER)).toEqual(['enemyDamage', 'threatBudget', 'eliteOdds', 'enemyHealth', 'enemyTactics']);
  });

  it('pays Archive Points at the tier rate, and half under Assist', () => {
    expect(modeRate({ assist: false, tier: 0 })).toBe(1);
    expect(modeRate({ assist: false, tier: 3 })).toBe(TIER_RATES[3]);
    expect(modeRate({ assist: true, tier: 0 })).toBe(ASSIST_RATE);
    const plain = newRun({}, createArchive());
    const tiered = newRun({ mode: { assist: false, tier: 5 } }, createArchive());
    play(plain);
    play(tiered);
    expect(tiered.archiveEarned).toBe(Math.round(plain.archiveEarned * 2));
  });

  it('raises enemy Damage and Health by tier, and lowers Damage under Assist', () => {
    expect(createWorldForRound(newRun()).enemySteps).toEqual({ health: 0, damage: 0 });
    expect(createWorldForRound(newRun({ mode: { assist: false, tier: 1 } })).enemySteps).toEqual({ health: 0, damage: 1 });
    expect(createWorldForRound(newRun({ mode: { assist: false, tier: 4 } })).enemySteps).toEqual({ health: 1, damage: 1 });
    expect(createWorldForRound(newRun({ mode: { assist: true, tier: 0 } })).enemySteps).toEqual({ health: 0, damage: -1 });
  });

  it('spends a larger threat budget at Tier 2 and above', () => {
    let normal = 0;
    let raised = 0;
    for (let seed = 1; seed <= 6; seed++) {
      normal += planThreat(planRound(5, 'Keldrath', new Rng(seed)));
      raised += planThreat(planRound(5, 'Keldrath', new Rng(seed), undefined, { budgetFactor: 1.25, eliteSteps: 0, tacticsRounds: 0 }));
    }
    expect(raised / normal).toBeGreaterThan(1.15);
    expect(raised / normal).toBeLessThan(1.35);
  });

  it('turns the revival off from Tier 3', () => {
    const archive = createFullArchive();
    archive.upgrades.revival = 1;
    expect(newRun({ mode: { assist: false, tier: 2 } }, archive).revival).toBe(true);
    expect(newRun({ mode: { assist: false, tier: 3 } }, archive).revival).toBe(false);
  });

  it('opens the next tier on a win, never under Assist', () => {
    const archive = createFullArchive();
    const run = newRun({}, archive);
    playTo(run, 21);
    expect(run.status).toBe('complete');
    expect(archive.tierUnlocked).toBe(1);
    const assisted = newRun({ mode: { assist: true, tier: 0 } }, createFullArchive());
    playTo(assisted, 21);
    expect(assisted.archive.tierUnlocked).toBe(0);
  });
});

describe('endless mode (GDD 13.2, 13.3)', () => {
  function endlessRun(): RunState {
    const run = newRun();
    playTo(run, 21);
    continueEndless(run);
    return run;
  }

  it('continues a won campaign with a free visit holding Extraordinary stock', () => {
    const run = endlessRun();
    expect(run.endless).toBe(true);
    expect(run.status).toBe('active');
    expect(run.round).toBe(22);
    expect(run.freeVisit).toBe(true);
    openShop(run, 'royal-inventor');
    expect(run.shops['royal-inventor'].stock.some((item) => item?.quality === 'Extraordinary')).toBe(true);
    expect(run.guaranteeExtraordinary).toBe(false);
  });

  it('visits the two unseen kingdoms, then reshuffles all five per loop with no repeat at the joins', () => {
    const run = endlessRun();
    playTo(run, 7 * 15);
    const kingdoms = run.kingdoms.slice(0, 15);
    expect(new Set(kingdoms.slice(0, 5)).size).toBe(5);
    expect(new Set(kingdoms.slice(5, 10)).size).toBe(5);
    expect(new Set(kingdoms.slice(10, 15)).size).toBe(5);
    for (let index = 1; index < kingdoms.length; index++) expect(kingdoms[index]).not.toBe(kingdoms[index - 1]);
    for (const name of kingdoms) expect(KINGDOM_NAMES).toContain(name);
  });

  it('adds Health and Damage steps for each loop, on top of Territory 3 scaling', () => {
    const run = endlessRun();
    expect(createWorldForRound(run).enemySteps).toEqual({ health: 0, damage: 0 });
    playTo(run, 35);
    expect(territorySlot(run.round)).toBe(5);
    expect(createWorldForRound(run).enemySteps).toEqual({ health: 1, damage: 1 });
    expect(scalingRound(36)).toBe(15);
  });

  it('borrows the attacks of the two bosses beaten most recently', () => {
    const run = endlessRun();
    playTo(run, 34);
    const plan = bossPlanForRound(run, 35);
    expect(plan?.kind).toBe('boss');
    if (plan?.kind !== 'boss') return;
    expect(plan.borrowed.length).toBeLessThanOrEqual(2);
    expect(plan.borrowed.length).toBeGreaterThan(0);
  });

  it('offers relics while a kingdom has them, then three Rare or better components', () => {
    const run = endlessRun();
    run.relicChoices = [];
    playTo(run, 28);
    // Take nothing: the kingdom keeps its relics on offer.
    expect(run.relicChoices.length).toBeGreaterThan(0);
    run.relics.push(...run.relicChoices);
    run.relicChoices = [];
    run.round = 28;
    play(run);
    expect(run.relicChoices).toEqual([]);
    expect(run.componentChoices).toHaveLength(3);
    for (const component of run.componentChoices) expect(['Rare', 'Exotic', 'Extraordinary']).toContain(component.quality);
    const before = run.inventory.length;
    expect(takeComponentChoice(run, 0)).toBe(true);
    expect(run.inventory.length).toBe(before + 1);
    expect(run.componentChoices).toEqual([]);
  });

  it('records the furthest round on death, with no campaign bonus', () => {
    const run = endlessRun();
    playTo(run, 23);
    const earned = run.archiveEarned;
    play(run, false);
    expect(run.status).toBe('dead');
    expect(run.archive.bests.endlessRound).toBe(24);
    expect(run.archive.bests.byCharacter[INVENTOR.id]).toBe(24);
    expect(run.archiveEarned).toBe(earned);
  });
});

describe('the Apprentice Trial (GDD 3.11)', () => {
  it('runs on the first campaign only', () => {
    expect(newRun({ trial: true }, createArchive()).trial).toBe(true);
    const archive = createArchive();
    archive.campaigns = 1;
    expect(newRun({ trial: true }, archive).trial).toBe(false);
  });

  it('sends Swarmers in Round 1, then weak enemies and one elite priority target', () => {
    const first = trialPlan(1);
    expect(first.every((entry) => entry.enemy.id === TRIAL_RULES.swarmer)).toBe(true);
    const second = trialPlan(2);
    const targets = second.filter((entry) => entry.enemy.id === TRIAL_RULES.priorityTarget);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.rank).toBe('elite');
    for (const entry of second) expect([...TRIAL_RULES.weakEnemies, TRIAL_RULES.priorityTarget]).toContain(entry.enemy.id);
  });

  it('marks the priority target in Round 2', () => {
    const run = newRun({ trial: true }, createArchive());
    play(run);
    const world = createWorldForRound(run);
    expect(world.priorityTarget).toBe(TRIAL_RULES.priorityTarget);
  });

  it('gives a component, then Research Points and a synergy weapon, then a fixed free visit', () => {
    const run = newRun({ trial: true }, createArchive());
    play(run);
    expect(run.inventory.map((item) => item.def.name)).toContain(TRIAL_RULES.freeComponent);
    play(run);
    expect(run.research.points).toBeGreaterThanOrEqual(TRIAL_RULES.researchPoints);
    expect(run.weapons).toHaveLength(2);
    play(run);
    expect(run.freeVisit).toBe(true);
    expect(run.shops.blacksmith.stock.every((item) => item?.quality === 'Common')).toBe(true);
    play(run);
    expect(run.trial).toBe(false);
  });

  it('sends a second weapon that triggers a cross-weapon synergy for every starting weapon', () => {
    for (const start of STARTING_WEAPONS) {
      const run = createRun(3, INVENTOR, start, createArchive(), { trial: true });
      play(run);
      play(run);
      expect(run.weapons, start.name).toHaveLength(2);
      const report = resolveLoadout(run.weapons, resolvePlayerStats(INVENTOR)).report;
      expect(report.active.some((entry) => entry.def.type === 'Cross-weapon'), start.name).toBe(true);
    }
  });
});

describe('settings saves (GDD 3.10, 15.13)', () => {
  it('fills missing settings with defaults', () => {
    expect(fillSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    const partial = fillSettings({ screenShake: false, keys: { up: 'I' } });
    expect(partial.screenShake).toBe(false);
    expect(partial.keys.up).toBe('I');
    expect(partial.keys.down).toBe(DEFAULT_SETTINGS.keys.down);
    expect(partial.pad).toEqual(DEFAULT_SETTINGS.pad);
  });

  it('converts a version 1 save to version 2 with default settings', () => {
    expect(SAVE_VERSION).toBe(2);
    expect(MIGRATIONS).toHaveLength(2);
    const decoded = decodeSave(JSON.stringify({ version: 1, active: 0, profiles: [{ name: 'Old', archive: {}, run: null }] }));
    if (!('file' in decoded)) throw new Error(decoded.problem);
    expect(decoded.file.version).toBe(2);
    expect(decoded.file.settings).toEqual(DEFAULT_SETTINGS);
  });
});
