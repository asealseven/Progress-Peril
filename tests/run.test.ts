import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { STARTING_WEAPONS, WEAPONS } from '../src/data/weapons';
import type { WeaponDef } from '../src/data/weapons';
import { PLAYABLE_ROUNDS, createRun, createWorldForRound, finishRound, runTotals } from '../src/sim/run';
import type { RunState } from '../src/sim/run';
import type { StepInput } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';

const MAX_ROUND_STEPS = 60 * 60 * 10;

/**
 * A simple bot: circle the arena centre at a fixed radius. With no enemy in
 * weapon range, walk toward the nearest enemy, so the last enemies of a round
 * never trail behind the circle forever.
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
  if (nearest !== Infinity && nearest > range) {
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

function playRun(seed: number, invincible: boolean, weapon: WeaponDef = WEAPONS.crossbow): RunState {
  const run = createRun(seed, CHARACTERS.inventor, weapon);
  while (run.status === 'active') {
    const world = createWorldForRound(run);
    world.invincible = invincible;
    playRound(world);
    finishRound(run, world);
  }
  return run;
}

describe('headless run', () => {
  it('plays three rounds in a row to the end of the build', () => {
    const run = playRun(2026, true);
    expect(run.status).toBe('complete');
    expect(run.history).toHaveLength(PLAYABLE_ROUNDS);
    expect(run.history.map((result) => result.stats.kills)).toEqual([20, 30, 40]);

    const lines = run.history.map(
      (result) =>
        `Round ${result.round}: ${result.seconds.toFixed(1)} s, ${result.stats.kills} kills, ` +
        `${result.stats.shotsFired} shots, ${result.stats.hitsTaken} hits taken`,
    );
    console.log(lines.join('\n'));
  });

  it('finishes three rounds with each starting weapon', () => {
    const lines: string[] = [];
    for (const weapon of STARTING_WEAPONS) {
      const run = playRun(404, true, weapon);
      expect(run.status).toBe('complete');
      expect(run.history.map((result) => result.stats.kills)).toEqual([20, 30, 40]);
      lines.push(`${weapon.name}: ${run.history.map((result) => `${result.seconds.toFixed(0)} s`).join(', ')}`);
    }
    console.log(lines.join('\n'));
  });

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
