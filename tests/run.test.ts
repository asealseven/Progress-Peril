import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { RESEARCH_NODES } from '../src/data/research';
import { STARTING_WEAPONS, WEAPONS } from '../src/data/weapons';
import type { WeaponDef } from '../src/data/weapons';
import { GRADE_NUMERALS, MATERIALS } from '../src/data/economy';
import { territoryIndex } from '../src/data/rounds';
import { SHOP_IDS } from '../src/data/shop';
import { PERFORMANCE_LIMITS, activeEnemyLimit } from '../src/data/tiers';
import {
  PLAYABLE_ROUNDS,
  createRun,
  createWorldForRound,
  finishRound,
  kingdomForRound,
  runTotals,
} from '../src/sim/run';
import { captureChoices, captureNode, nodeCost, nodeState, researchNodeNow } from '../src/sim/research';
import type { RunState } from '../src/sim/run';
import {
  buyItem,
  buyProblem,
  installFromInventory,
  openShop,
  shopItemAt,
  upgradeProblem,
  upgradeWeapon,
} from '../src/sim/economy';
import { installProblem } from '../src/sim/loadout';
import { lineOfSight } from '../src/sim/world/hazards';
import type { StepInput } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';

const MAX_ROUND_STEPS = 60 * 60 * 10;

/**
 * A simple bot: circle the arena centre at a fixed radius. With no enemy well
 * inside weapon range, walk toward a target, so the last enemies of a round
 * never trail behind the circle forever. The target is the weakest enemy
 * nearby, so repairing Mechanists fall before the Sentinel they mend.
 */
function circleBot(world: World): StepInput {
  const player = world.player;
  const range = world.weapons[0]?.resolved.range ?? 0;
  let nearestX = 0;
  let nearestY = 0;
  let nearest = Infinity;
  let weakest = Infinity;
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    // Inside 500 pixels the lowest Health wins. Outside, the nearest enemy.
    const score = distance <= 500 ? enemy.health : 1e9 + distance;
    if (score < weakest) {
      weakest = score;
      nearest = distance;
      nearestX = enemy.x;
      nearestY = enemy.y;
    }
  }
  // A pillar between the bot and its target blocks Straight shots, so the bot walks round.
  const blocked = nearest !== Infinity && !lineOfSight(world.arena, player.x, player.y, nearestX, nearestY, 8);
  if (nearest !== Infinity && (nearest > range * 0.6 || blocked)) {
    return { moveX: (nearestX - player.x) / nearest, moveY: (nearestY - player.y) / nearest };
  }

  const dx = player.x - world.arena.width / 2;
  const dy = player.y - world.arena.height / 2;
  const distance = Math.hypot(dx, dy) || 1;
  const radial = (420 - distance) / 100;
  return {
    moveX: -dy / distance + (dx / distance) * radial,
    moveY: dx / distance + (dy / distance) * radial,
  };
}

/** Steps a round to the end with the bot. Fails when the round never ends. */
function playRound(world: World): void {
  let steps = 0;
  while (world.phase === 'running') {
    world.step(circleBot(world));
    if (++steps > MAX_ROUND_STEPS) throw new Error(`Round ${world.round} did not end`);
  }
}

/** Plays a run to the end, or to the end of `lastRound`. */
function playRun(seed: number, invincible: boolean, weapon: WeaponDef = WEAPONS.crossbow, lastRound = 3): RunState {
  const run = createRun(seed, CHARACTERS.inventor, weapon);
  while (run.status === 'active' && run.round <= lastRound) {
    const world = createWorldForRound(run);
    world.invincible = invincible;
    playRound(world);
    finishRound(run, world);
  }
  return run;
}

/**
 * The bot's preparation phase (CLAUDE.md "Testing"): buy weapon grades, visit a
 * shop and buy the first affordable item, then fit components into free slots.
 */
function prepare(run: RunState): void {
  // Research the cheapest available node, again and again while points last (CLAUDE.md "Testing").
  for (;;) {
    const cheapest = RESEARCH_NODES.filter((entry) => nodeState(run, entry) === 'available').sort(
      (a, b) => nodeCost(run, a).points - nodeCost(run, b).points,
    )[0];
    if (!cheapest) break;
    researchNodeNow(run, cheapest);
  }
  const capture = captureChoices(run)[0];
  if (capture) captureNode(run, capture);

  // Grades first, lowest grade first, always in Damage.
  for (;;) {
    const weapon = [...run.weapons]
      .sort((a, b) => a.grade - b.grade)
      .find((entry) => upgradeProblem(run, entry, 'damage') === undefined);
    if (!weapon) break;
    upgradeWeapon(run, weapon, 'damage');
  }

  // One shop per phase: a free visit, or a paid one when the gold covers the fee and a purchase.
  const shopId = SHOP_IDS[run.round % SHOP_IDS.length] ?? 'blacksmith';
  if (run.freeVisit || run.gold >= 80) {
    openShop(run, shopId);
    const slots: Array<number | 'specialist'> = [...run.shops[shopId].stock.keys(), 'specialist'];
    // A weapon for a free slot comes first.
    if (run.weapons.length < 3) {
      const weaponSlot = slots.find(
        (slot) => shopItemAt(run, shopId, slot)?.kind === 'weapon' && buyProblem(run, shopId, slot) === undefined,
      );
      if (weaponSlot !== undefined) buyItem(run, shopId, weaponSlot);
    }
    for (const slot of slots) {
      const item = shopItemAt(run, shopId, slot);
      if (!item || item.kind === 'weapon') continue;
      if (buyProblem(run, shopId, slot) === undefined) buyItem(run, shopId, slot);
    }
  }

  for (const component of [...run.inventory]) {
    const weapon = run.weapons.find(
      (entry) => !entry.components[component.def.slot] && installProblem(entry, component.def) === undefined,
    );
    if (weapon) installFromInventory(run, weapon, component);
  }
}

describe('headless run', () => {
  it('plays the first three rounds in a row', () => {
    const run = playRun(2026, true);
    expect(run.status).toBe('active');
    expect(run.round).toBe(4);
    expect(run.history).toHaveLength(3);
    expect(run.history[0]!.stats.kills).toBe(20);
    for (const result of run.history) expect(result.survived).toBe(true);
  }, 60000);

  it('finishes three rounds with each starting weapon', () => {
    const lines: string[] = [];
    for (const weapon of STARTING_WEAPONS) {
      const run = playRun(404, true, weapon);
      expect(run.history).toHaveLength(3);
      expect(run.history.every((result) => result.survived)).toBe(true);
      lines.push(`${weapon.name}: ${run.history.map((result) => `${result.seconds.toFixed(0)} s`).join(', ')}`);
    }
    console.log(lines.join('\n'));
  }, 120000);

  it('plays a full Territory 1 loop of seven rounds with shop visits', () => {
    const run = createRun(31, CHARACTERS.inventor, WEAPONS['war-hammer']);
    let visits = 0;
    while (run.status === 'active' && run.round <= 7) {
      const world = createWorldForRound(run);
      world.invincible = true;
      playRound(world);
      finishRound(run, world);
      if (run.status !== 'active') break;
      // The player heals in full before the next round (GDD 3.7).
      expect(createWorldForRound(run).player.health).toBe(createWorldForRound(run).player.stats.maxHealth);
      const free = run.freeVisit;
      prepare(run);
      if (SHOP_IDS.some((id) => run.shops[id].visit)) visits++;
      // Rounds 4 and 7 grant a free visit, and the bot takes each one.
      if (free) expect(run.freeVisit).toBe(false);
    }
    expect(run.history.filter((result) => result.survived)).toHaveLength(7);
    expect(visits).toBeGreaterThanOrEqual(2);
    const spent = run.ledger.reduce((sum, entry) => sum + entry.goldSpent, 0);
    const earned = run.ledger.reduce((sum, entry) => sum + entry.goldEarned, 0);
    expect(spent).toBeGreaterThan(0);
    expect(run.gold).toBe(earned - spent);
    expect(Math.max(...run.weapons.map((weapon) => weapon.grade))).toBeGreaterThan(0);
  }, 120000);

  it('plays a full 21-round campaign inside the performance budgets (GDD 4.11, 7.21, 15.11)', () => {
    for (const platform of ['pc', 'mobile'] as const) {
      const limits = PERFORMANCE_LIMITS[platform];
      const run = createRun(2026, CHARACTERS.inventor, WEAPONS['war-hammer']);
      const lines: string[] = [];
      let totalSteps = 0;
      let totalMs = 0;
      let worstStepMs = 0;
      while (run.status === 'active') {
        const world = createWorldForRound(run, limits);
        world.invincible = true;
        const kingdom = kingdomForRound(run);
        const limit = activeEnemyLimit(limits, run.round);
        expect(world.activeLimit).toBe(limit);
        let mostEnemies = 0;
        let steps = 0;
        const started = performance.now();
        while (world.phase === 'running') {
          const before = performance.now();
          world.step(circleBot(world));
          worstStepMs = Math.max(worstStepMs, performance.now() - before);
          world.events.length = 0;
          mostEnemies = Math.max(mostEnemies, world.enemies.activeCount);
          // Budgets hold at every step.
          expect(world.enemies.activeCount).toBeLessThanOrEqual(limit);
          expect(world.projectiles.activeCount).toBeLessThanOrEqual(limits.projectiles);
          expect(world.zones.activeCount).toBeLessThanOrEqual(limits.areaEffects);
          expect(world.constructs.activeCount).toBeLessThanOrEqual(limits.constructs);
          expect(world.hazards.activeCount).toBeLessThanOrEqual(limits.hazards);
          expect(world.enemyShots.activeCount).toBeLessThanOrEqual(limits.enemyShots);
          expect(world.pickups.activeCount).toBeLessThanOrEqual(limits.pickups);
          expect(world.tokensHeld).toBeLessThanOrEqual(world.tokenLimit);
          if (++steps > MAX_ROUND_STEPS * 3) throw new Error(`Round ${world.round} did not end`);
        }
        totalMs += performance.now() - started;
        totalSteps += steps;
        expect(world.phase).toBe('cleared');
        const result = finishRound(run, world);
        if (run.status === 'active') prepare(run);
        const entry = run.ledger[run.ledger.length - 1]!;
        const materials = MATERIALS.map((material) => run.materials[material]).join('/');
        lines.push(
          `Round ${result.round} (${kingdom}): ${result.seconds.toFixed(0)} s, ${result.stats.kills} kills, ` +
            `most enemies ${mostEnemies} of ${limit}, gold +${entry.goldEarned} -${entry.goldSpent} = ${run.gold}, ` +
            `materials +${entry.materialsEarned} (${materials}), ` +
            `research +${entry.researchEarned.toFixed(0)} (${run.research.researched.length} nodes), ` +
            `weapons ${run.weapons.map((weapon) => `${weapon.def.name} ${GRADE_NUMERALS[weapon.grade] || '0'}`).join(', ')}`,
        );
      }
      expect(run.status).toBe('complete');
      expect(run.history).toHaveLength(PLAYABLE_ROUNDS);
      expect(PLAYABLE_ROUNDS).toBe(21);
      // The frame budget at 60 frames per second is 16.7 ms. The simulation takes a small share.
      const meanStepMs = totalMs / totalSteps;
      expect(meanStepMs).toBeLessThan(2);
      const totals = runTotals(run);
      // The economy per territory, for comparison with GDD 14.3: kills 255, 410, 539 and gold 337, 544, 753.
      const territory = [0, 1, 2].map((index) => {
        const entries = run.ledger.filter((entry) => territoryIndex(entry.round) === index);
        const sum = (pick: (entry: (typeof entries)[number]) => number): number =>
          entries.reduce((total, entry) => total + pick(entry), 0);
        return `Territory ${index + 1}: ${sum((entry) => entry.kills)} kills, ${sum((entry) => entry.goldEarned)} gold, ${sum((entry) => entry.materialsEarned)} materials, ${sum((entry) => entry.goldSpent)} gold spent`;
      });
      console.log(
        [
          `Platform ${platform}: ${totals.kills} kills in ${(totals.seconds / 60).toFixed(1)} minutes of combat`,
          `Mean step ${meanStepMs.toFixed(3)} ms, worst step ${worstStepMs.toFixed(2)} ms`,
          ...territory,
          ...lines,
        ].join('\n'),
      );
    }
  }, 600000);

  it('gives the same run for the same seed and inputs', () => {
    const a = playRun(77, false);
    const b = playRun(77, false);
    expect(a.history).toEqual(b.history);
    expect(runTotals(a)).toEqual(runTotals(b));
  });

  it('gives a different run for a different seed', () => {
    const a = playRun(1, true);
    const b = playRun(2, true);
    expect(a.history).not.toEqual(b.history);
  });

  it('ends the run when the player dies', () => {
    const run = createRun(5, CHARACTERS.inventor, WEAPONS.crossbow);
    const world = createWorldForRound(run);
    world.player.health = 0.0001;
    let steps = 0;
    // Standing still lets the footmen reach the player.
    while (world.phase === 'running' && steps++ < MAX_ROUND_STEPS) world.step({ moveX: 0, moveY: 0 });
    expect(world.phase).toBe('defeat');
    finishRound(run, world);
    expect(run.status).toBe('dead');
    expect(runTotals(run).roundsSurvived).toBe(0);
  });

  it('carries adaptation between rounds of a territory', () => {
    const run = createRun(9, CHARACTERS.inventor, WEAPONS.crossbow);
    const world = createWorldForRound(run);
    world.player.adaptation.Slashing = 0.05;
    world.invincible = true;
    playRound(world);
    finishRound(run, world);
    const next = createWorldForRound(run);
    expect(next.player.adaptation.Slashing).toBeGreaterThanOrEqual(0.05);
    expect(next.player.health).toBe(next.player.stats.maxHealth);
  });
});

describe('campaign structure', () => {
  it('keeps one kingdom for each seven-round territory', () => {
    const run = createRun(1, CHARACTERS.inventor, WEAPONS.crossbow);
    run.kingdoms = ['Merovant', 'Nymora', 'Myrathis'];
    expect([1, 7, 8, 14, 15, 21].map((round) => kingdomForRound(run, round))).toEqual([
      'Merovant',
      'Merovant',
      'Nymora',
      'Nymora',
      'Myrathis',
      'Myrathis',
    ]);
  });

  it('resets adaptation at the start of a new territory (GDD 3.7)', () => {
    const run = createRun(9, CHARACTERS.inventor, WEAPONS.crossbow);
    run.round = 7;
    const world = createWorldForRound(run);
    world.player.adaptation.Slashing = 0.05;
    world.invincible = true;
    for (const weapon of world.weapons) weapon.resolved = { ...weapon.resolved, damage: 500, damageParts: [{ type: 'Impact', amount: 500 }] };
    playRound(world);
    finishRound(run, world);
    expect(run.round).toBe(8);
    expect(run.adaptation).toEqual({});
  });

  it('carries gold between rounds, so stolen gold stays lost', () => {
    const run = createRun(9, CHARACTERS.inventor, WEAPONS.crossbow);
    run.gold = 30;
    const world = createWorldForRound(run);
    expect(world.gold).toBe(30);
    // A Highwayman took 5 gold and got away with the round.
    world.gold = 25;
    world.invincible = true;
    playRound(world);
    finishRound(run, world);
    expect(run.gold).toBe(25 + world.loot.gold);
    expect(world.loot.gold).toBe(20);
  });
});
