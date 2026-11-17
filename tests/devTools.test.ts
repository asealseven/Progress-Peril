import { describe, expect, it } from 'vitest';
import { ARENA_BY_KINGDOM } from '../src/data/arenas';
import { BOSS_BY_KINGDOM, BOSS_RULES } from '../src/data/bosses';
import { MINI_BOSS_BY_KINGDOM } from '../src/data/miniBosses';
import { forceBossPhase, mainBoss } from '../src/sim/world/bosses';
import { FOOTMAN, makeWorld, stepSeconds } from './helpers';

// Dev tools hooks in the simulation: the Test Lab holds a round open, clears
// the director's plan and jumps a boss to a phase.

describe('dev tools hooks', () => {
  it('ends an empty round at once, unless the round is held', () => {
    const open = makeWorld({ round: 1, duration: 5, spawns: [] });
    stepSeconds(open, 0.1);
    expect(open.phase).toBe('cleared');

    const held = makeWorld({ round: 1, duration: 5, spawns: [] });
    held.hold = true;
    stepSeconds(held, 10);
    expect(held.phase).toBe('running');
  });

  it('drops the spawn plan for a quiet arena', () => {
    const world = makeWorld({ round: 1, duration: 5, spawns: [{ time: 0.5, enemy: FOOTMAN, count: 4, kind: 'group' }] });
    world.clearSpawnPlan();
    world.hold = true;
    stepSeconds(world, 2);
    expect(world.enemies.activeCount).toBe(0);
  });

  it('jumps a boss and a mini-boss to the picked phase', () => {
    const boss = makeWorld({
      arena: ARENA_BY_KINGDOM.Keldrath,
      round: 7,
      localRound: 7,
      invincible: true,
      armed: false,
      bosses: { kind: 'boss', boss: BOSS_BY_KINGDOM.Keldrath.id, escort: MINI_BOSS_BY_KINGDOM.Keldrath.id, borrowed: [] },
    });
    stepSeconds(boss, BOSS_RULES.entrySeconds + 0.1);
    const body = mainBoss(boss);
    if (!body) throw new Error('No boss');
    forceBossPhase(body, 3);
    stepSeconds(boss, BOSS_RULES.transitionSeconds * 2 + 0.5);
    expect(body.phase).toBe(3);

    const mini = makeWorld({
      arena: ARENA_BY_KINGDOM.Orthelyn,
      round: 4,
      localRound: 4,
      invincible: true,
      armed: false,
      bosses: { kind: 'mini', mini: MINI_BOSS_BY_KINGDOM.Orthelyn.id },
    });
    stepSeconds(mini, BOSS_RULES.entrySeconds + 0.1);
    const miniBody = mainBoss(mini);
    if (!miniBody) throw new Error('No mini-boss');
    forceBossPhase(miniBody, 2);
    stepSeconds(mini, 0.5);
    expect(miniBody.phase).toBe(2);
    // A phase past the last one changes nothing.
    const health = miniBody.enemy.health;
    forceBossPhase(miniBody, 3);
    expect(miniBody.enemy.health).toBe(health);
  });
});
