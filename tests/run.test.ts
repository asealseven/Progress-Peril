import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { STARTING_WEAPONS, WEAPONS } from '../src/data/weapons';
import type { WeaponDef } from '../src/data/weapons';
import { territoryIndex } from '../src/data/rounds';
import { PERFORMANCE_LIMITS, activeEnemyLimit } from '../src/data/tiers';
import {
  PLAYABLE_ROUNDS,
  createRun,
  createWorldForRound,
  finishRound,
  kingdomForRound,
  runTotals,
} from '../src/sim/run';
import type { RunState } from '../src/sim/run';
import { lineOfSight } from '../src/sim/world/hazards';
import type { StepInput } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';
import { arm } from './helpers';

const MAX_ROUND_STEPS = 60 * 60 * 10;

/**
 * A simple bot: circle the arena centre at a fixed radius. With no enemy well
 * inside weapon range, walk toward the nearest enemy, so the last enemies of a
 * round never trail behind the circle forever.
 */
function circleBot(world: World): StepInput {
  const player = world.player;
  const range = world.weapons[0]?.resolved.range ?? 0;
  let nearestX = 0;
  let nearestY = 0;
  let nearest = Infinity;
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < nearest) {
      nearest = distance;
      nearestX = enemy.x;
      nearestY = enemy.y;
    }
  }
  // Closing to well inside weapon range keeps kiting archers and their guards under fire.
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
 * Stand-in for the shop until Milestone 5: the bot's weapon Damage rises by the
 * same factor as one enemy Health step per territory (NOTES.md, GDD 9.10).
 */
const DAMAGE_STAND_IN = [1, 2.5, 6.25];

function strengthen(world: World): void {
  const factor = DAMAGE_STAND_IN[territoryIndex(world.round)] ?? 1;
  for (const weapon of world.weapons) {
    const resolved = weapon.resolved;
    weapon.resolved = {
      ...resolved,
      damage: resolved.damage * factor,
      damageParts: resolved.damageParts.map((part) => ({ ...part, amount: part.amount * factor })),
    };
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

  it('plays a full 21-round campaign inside the performance budgets (GDD 4.11, 7.21, 15.11)', () => {
    for (const platform of ['pc', 'mobile'] as const) {
      const limits = PERFORMANCE_LIMITS[platform];
      const run = createRun(2026, CHARACTERS.inventor, WEAPONS.crossbow);
      run.weapons = [arm('War Hammer'), arm('Mortar'), arm('Tesla Rod')];
      const lines: string[] = [];
      let totalSteps = 0;
      let totalMs = 0;
      let worstStepMs = 0;
      while (run.status === 'active') {
        const world = createWorldForRound(run, limits);
        world.invincible = true;
        strengthen(world);
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
          expect(world.tokensHeld).toBeLessThanOrEqual(world.tokenLimit);
          if (++steps > MAX_ROUND_STEPS) throw new Error(`Round ${world.round} did not end`);
        }
        totalMs += performance.now() - started;
        totalSteps += steps;
        expect(world.phase).toBe('cleared');
        const result = finishRound(run, world);
        lines.push(
          `Round ${result.round} (${kingdom}): ${result.seconds.toFixed(0)} s, ${result.stats.kills} kills, ` +
            `most enemies ${mostEnemies} of ${limit}, ${result.stats.hitsTaken} hits taken`,
        );
      }
      expect(run.status).toBe('complete');
      expect(run.history).toHaveLength(PLAYABLE_ROUNDS);
      expect(PLAYABLE_ROUNDS).toBe(21);
      // The frame budget at 60 frames per second is 16.7 ms. The simulation takes a small share.
      const meanStepMs = totalMs / totalSteps;
      expect(meanStepMs).toBeLessThan(2);
      const totals = runTotals(run);
      console.log(
        [
          `Platform ${platform}: ${totals.kills} kills in ${(totals.seconds / 60).toFixed(1)} minutes of combat`,
          `Mean step ${meanStepMs.toFixed(3)} ms, worst step ${worstStepMs.toFixed(2)} ms`,
          ...lines,
        ].join('\n'),
      );
    }
  }, 240000);

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
  it('uses the Keldrath, Orthelyn and Nymora rosters until kingdom selection arrives', () => {
    const run = createRun(1, CHARACTERS.inventor, WEAPONS.crossbow);
    expect([1, 7, 8, 14, 15, 21].map((round) => kingdomForRound(run, round))).toEqual([
      'Keldrath',
      'Keldrath',
      'Orthelyn',
      'Orthelyn',
      'Nymora',
      'Nymora',
    ]);
  });

  it('resets adaptation at the start of a new territory (GDD 3.7)', () => {
    const run = createRun(9, CHARACTERS.inventor, WEAPONS.crossbow);
    run.round = 7;
    const world = createWorldForRound(run);
    world.player.adaptation.Slashing = 0.05;
    world.invincible = true;
    strengthen(world);
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
    world.gold = 25;
    world.invincible = true;
    playRound(world);
    finishRound(run, world);
    expect(run.gold).toBe(25);
  });
});
