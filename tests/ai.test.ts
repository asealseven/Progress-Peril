import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies';
import { AI_RULES } from '../src/data/tiers';
import {
  attackTokens,
  baseScores,
  bestAction,
  chooseAction,
  personalityWeight,
  scoreActions,
  squadOrder,
  thinkInterval,
} from '../src/sim/ai';
import type { ActionInputs } from '../src/sim/ai';
import { Rng } from '../src/sim/rng';
import { spawnGroup } from '../src/sim/world/enemies';
import type { SpawnEntry } from '../src/sim/world/types';
import { FOOTMAN, IDLE, enemyAt, enemyDef, makeWorld, stepSeconds } from './helpers';

/** A lone, healthy enemy at mid distance with its attack ready. */
const BASE: ActionInputs = {
  distance: 300,
  attackReady: true,
  tokenFree: true,
  guard: false,
  wardNear: false,
  wardHealth: 1,
  healthShare: 1,
  threatened: false,
  disengaging: false,
  squadDistance: 0,
  squadSize: 1,
  leaderAlive: false,
  leaderLost: false,
  formationOpen: false,
  inFront: false,
  flankSlotFree: false,
  speed: 100,
  abilityReady: false,
  order: undefined,
  nearHome: false,
  weakTarget: false,
};

const rng = (): Rng => new Rng(7);

describe('utility scoring (GDD 9.15)', () => {
  it('Attack: distance to player, attack ready, attack tokens free', () => {
    const near = baseScores({ ...BASE, distance: 100 }).attack;
    expect(near).toBeGreaterThan(baseScores({ ...BASE, distance: 900 }).attack);
    expect(near).toBeGreaterThan(baseScores({ ...BASE, distance: 100, attackReady: false }).attack);
    expect(near).toBeGreaterThan(baseScores({ ...BASE, distance: 100, tokenFree: false }).attack);
  });

  it('Protect allies: ally health, ally role, own role', () => {
    expect(baseScores(BASE).protect).toBe(0);
    const guard = baseScores({ ...BASE, guard: true, wardNear: true }).protect;
    expect(guard).toBeGreaterThan(baseScores({ ...BASE, guard: false, wardNear: true }).protect);
    expect(baseScores({ ...BASE, guard: true, wardNear: true, wardHealth: 0.2 }).protect).toBeGreaterThan(guard);
  });

  it('Retreat: own health, nearby threat', () => {
    expect(baseScores(BASE).retreat).toBe(0);
    expect(baseScores({ ...BASE, healthShare: 0.2 }).retreat).toBeGreaterThan(0);
    expect(baseScores({ ...BASE, threatened: true }).retreat).toBeGreaterThan(0.5);
    expect(baseScores({ ...BASE, disengaging: true }).retreat).toBeGreaterThan(1);
  });

  it('Regroup: distance from squad, squad size, leader alive', () => {
    const far = { ...BASE, squadSize: 4, squadDistance: AI_RULES.regroupDistance * 1.8 };
    expect(baseScores({ ...far, squadSize: 1 }).regroup).toBe(0);
    expect(baseScores({ ...far, squadDistance: 50 }).regroup).toBe(0);
    const scored = baseScores(far).regroup;
    expect(scored).toBeGreaterThan(0);
    // Leader death: individual scoring with a Regroup bias.
    expect(baseScores({ ...far, leaderLost: true }).regroup).toBeCloseTo(scored * AI_RULES.leaderlessRegroup);
    expect(baseScores({ ...BASE, squadSize: 4, formationOpen: true, leaderAlive: true }).regroup).toBeGreaterThan(0.7);
  });

  it('Flank: player facing, free flank slots, own speed', () => {
    const flanker = { ...BASE, inFront: true, flankSlotFree: true, distance: 400 };
    expect(baseScores({ ...flanker, flankSlotFree: false }).flank).toBe(0);
    expect(baseScores({ ...flanker, inFront: false }).flank).toBe(0);
    expect(baseScores({ ...flanker, speed: 140 }).flank).toBeGreaterThan(baseScores({ ...flanker, speed: 40 }).flank);
  });

  it('Use ability: ability ready, squad order', () => {
    expect(baseScores(BASE).ability).toBe(0);
    expect(baseScores({ ...BASE, abilityReady: true }).ability).toBeGreaterThan(1);
  });

  it('squad orders raise the matching action', () => {
    expect(baseScores({ ...BASE, order: 'Pin' }).attack).toBeCloseTo(baseScores(BASE).attack * AI_RULES.orderBonus);
    const flanker = { ...BASE, inFront: true, flankSlotFree: true };
    expect(baseScores({ ...flanker, order: 'Surround' }).flank).toBeCloseTo(baseScores(flanker).flank * AI_RULES.orderBonus);
    const guard = { ...BASE, guard: true, wardNear: true };
    expect(baseScores({ ...guard, order: 'Protect' }).protect).toBeCloseTo(baseScores(guard).protect * AI_RULES.orderBonus);
  });

  it('picks the highest score', () => {
    expect(bestAction({ attack: 1, protect: 0, retreat: 2, regroup: 0, flank: 0, ability: 0 })).toBe('retreat');
    expect(bestAction({ attack: 1, protect: 1, retreat: 1, regroup: 1, flank: 1, ability: 1 })).toBe('attack');
  });
});

describe('personality weights (GDD 9.15)', () => {
  const weights = AI_RULES.weights;

  it('follows the table', () => {
    const inputs = { nearHome: true, weakTarget: true };
    expect(personalityWeight('Aggressive', 'attack', inputs, rng())).toBe(weights.High);
    expect(personalityWeight('Aggressive', 'retreat', inputs, rng())).toBe(weights.Minimal);
    expect(personalityWeight('Defensive', 'protect', inputs, rng())).toBe(weights.High);
    expect(personalityWeight('Defensive', 'flank', inputs, rng())).toBe(weights.Minimal);
    expect(personalityWeight('Cowardly', 'retreat', inputs, rng())).toBe(weights.High);
    expect(personalityWeight('Disciplined', 'regroup', inputs, rng())).toBe(weights.High);
    expect(personalityWeight('Disciplined', 'flank', inputs, rng())).toBe(weights.High);
    expect(personalityWeight('Predatory', 'protect', inputs, rng())).toBe(weights.Minimal);
  });

  it('Territorial: High near the home zone', () => {
    expect(personalityWeight('Territorial', 'attack', { nearHome: true, weakTarget: false }, rng())).toBe(weights.High);
    expect(personalityWeight('Territorial', 'attack', { nearHome: false, weakTarget: false }, rng())).toBe(weights.Low);
  });

  it('Predatory: High against weak targets', () => {
    expect(personalityWeight('Predatory', 'attack', { nearHome: false, weakTarget: true }, rng())).toBe(weights.High);
    expect(personalityWeight('Predatory', 'attack', { nearHome: false, weakTarget: false }, rng())).toBe(weights.Medium);
  });

  it('Unstable: Random', () => {
    const generator = rng();
    const seen = new Set<number>();
    for (let i = 0; i < 80; i++) seen.add(personalityWeight('Unstable', 'attack', BASE, generator));
    expect(seen.size).toBeGreaterThan(2);
  });

  it('multiplies the base score', () => {
    const base = baseScores(BASE).attack;
    expect(scoreActions(BASE, 'Aggressive', rng()).attack).toBeCloseTo(base * weights.High);
    expect(scoreActions(BASE, 'Cowardly', rng()).attack).toBeCloseTo(base * weights.Low);
  });

  it('gives each personality its own choice in the same spot', () => {
    const hurt = { ...BASE, healthShare: 0.1, threatened: true };
    expect(chooseAction(hurt, 'Cowardly', rng())).toBe('retreat');
    expect(chooseAction(hurt, 'Aggressive', rng())).toBe('attack');
    const guard = { ...BASE, guard: true, wardNear: true, wardHealth: 0.4 };
    expect(chooseAction(guard, 'Defensive', rng())).toBe('protect');
    expect(chooseAction(guard, 'Aggressive', rng())).toBe('attack');
  });
});

describe('group intelligence (GDD 9.5, 9.15)', () => {
  it('assigns squad goals from the composition', () => {
    expect(squadOrder([ENEMIES['royal-footman'], ENEMIES['royal-footman']])).toBe('Pin');
    expect(squadOrder([ENEMIES['royal-bastion'], ENEMIES['royal-longbowman'], ENEMIES['royal-footman']])).toBe('Protect');
    expect(squadOrder([ENEMIES['hunting-hound'], ENEMIES['hunting-hound'], ENEMIES['thornling']])).toBe('Surround');
    expect(squadOrder([ENEMIES['mercenary-captain'], ENEMIES.highwayman])).toBe('Surround');
  });

  it('forms one squad per group, with a blackboard', () => {
    const world = makeWorld({ armed: false, invincible: true });
    spawnGroup(world, enemyDef('Hunting Hound'), 5);
    expect(world.squads.size).toBe(1);
    const squad = [...world.squads.values()][0]!;
    expect(squad.members).toBe(5);
    expect(squad.order).toBe('Surround');
    stepSeconds(world, 1);
    const hounds = world.enemies.items.filter((enemy) => enemy.active);
    const centreX = hounds.reduce((sum, hound) => sum + hound.x, 0) / hounds.length;
    expect(squad.x).toBeCloseTo(centreX, -2);
  });

  it('Surround: fast enemies take flank slots around the player', () => {
    const world = makeWorld({ armed: false, invincible: true });
    spawnGroup(world, enemyDef('Hunting Hound'), 6);
    let flanked = false;
    const bearings = new Set<number>();
    for (let step = 0; step < 60 * 12; step++) {
      world.step({ moveX: 0, moveY: -1 });
      for (const enemy of world.enemies.items) {
        if (!enemy.active) continue;
        if (enemy.ai === 'flank') flanked = true;
        if (Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y) < 120) {
          bearings.add(Math.round(Math.atan2(enemy.y - world.player.y, enemy.x - world.player.x) / (Math.PI / 4)));
        }
      }
    }
    expect(flanked).toBe(true);
    // Hounds reach the player from several sides.
    expect(bearings.size).toBeGreaterThanOrEqual(3);
  });
});

describe('fairness and performance rules (GDD 9.15)', () => {
  it('limits the enemies attacking at once with attack tokens, scaled by territory', () => {
    expect([0, 1, 2].map(attackTokens)).toEqual([...AI_RULES.attackTokens]);
    const world = makeWorld({ armed: false, invincible: true });
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      enemyAt(world, 'Royal Footman', Math.cos(angle) * 120, Math.sin(angle) * 120);
    }
    let most = 0;
    for (let step = 0; step < 60 * 10; step++) {
      world.step(IDLE);
      const attacking = world.enemies.items.filter((enemy) => enemy.active && enemy.action !== 'chase').length;
      most = Math.max(most, attacking);
      expect(attacking).toBeLessThanOrEqual(world.tokenLimit);
    }
    expect(most).toBe(world.tokenLimit);
    expect(world.stats.hitsTaken).toBeGreaterThan(0);
  });

  it('keeps waiting enemies circling the player', () => {
    const world = makeWorld({ armed: false, invincible: true });
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      enemyAt(world, 'Royal Footman', Math.cos(angle) * 160, Math.sin(angle) * 160);
    }
    stepSeconds(world, 6);
    const waiting = world.enemies.items.filter((enemy) => enemy.active && enemy.action === 'chase' && !enemy.hasToken);
    expect(waiting.length).toBeGreaterThan(5);
    const moving = waiting.filter((enemy) => Math.hypot(enemy.vx, enemy.vy) > 10);
    expect(moving.length).toBeGreaterThan(waiting.length / 2);
  });

  it('updates near enemies every step, mid-range enemies every few steps, distant enemies a few times per second', () => {
    expect(thinkInterval(100)).toBe(1);
    expect(thinkInterval(AI_RULES.nearDistance + 1)).toBe(AI_RULES.midSteps);
    expect(thinkInterval(AI_RULES.midDistance + 1)).toBe(AI_RULES.farSteps);
    // A distant enemy still moves every step, on its last heading.
    const world = makeWorld({ armed: false, invincible: true });
    const far = enemyAt(world, 'Royal Footman', 1180, 0);
    // The first heading arrives with the first update, inside a quarter of a second.
    stepSeconds(world, 0.25);
    const start = far.x;
    world.step(IDLE);
    const perStep = start - far.x;
    expect(perStep).toBeCloseTo(far.speed / 60);
    stepSeconds(world, 0.2);
    expect(start - far.x).toBeCloseTo(perStep * 13);
  });

  it('spreads groups out with separation forces', () => {
    const world = makeWorld({ armed: false, invincible: true });
    for (let i = 0; i < 12; i++) enemyAt(world, 'Royal Footman', 400 + (i % 3), 0);
    stepSeconds(world, 2);
    const enemies = world.enemies.items.filter((enemy) => enemy.active);
    let closest = Infinity;
    for (const a of enemies) {
      for (const b of enemies) {
        if (a.slot < b.slot) closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
      }
    }
    expect(closest).toBeGreaterThan(FOOTMAN.radius);
  });

  it('steers enemies around obstacles', () => {
    const world = makeWorld({
      armed: false,
      invincible: true,
      arena: {
        ...makeWorld().arena,
        obstacles: [{ kind: 'pillar', x: 1500, y: 800, radius: 60 }],
      },
    });
    const footman = enemyAt(world, 'Royal Footman', 600, 0);
    stepSeconds(world, 8);
    expect(Math.hypot(footman.x - world.player.x, footman.y - world.player.y)).toBeLessThan(80);
  });
});

describe('population limits (GDD 4.8, 4.11)', () => {
  const crowd: SpawnEntry[] = [{ time: 0, enemy: FOOTMAN, count: 12, kind: 'group' }];

  it('holds spending while the active limit is full', () => {
    const world = makeWorld({ spawns: crowd, activeLimit: 5, duration: 600, weapons: undefined, invincible: true });
    let most = 0;
    let steps = 0;
    while (world.phase === 'running' && steps++ < 60 * 300) {
      world.step(IDLE);
      most = Math.max(most, world.enemies.activeCount);
    }
    expect(most).toBe(5);
    // Every enemy enters once room frees up.
    expect(world.phase).toBe('cleared');
    expect(world.stats.kills).toBe(12);
  });

  it('never carries unspent budget past the round timer', () => {
    const world = makeWorld({ spawns: crowd, activeLimit: 5, duration: 2, armed: false, invincible: true });
    stepSeconds(world, 3);
    expect(world.enemies.activeCount).toBe(5);
    expect(world.spawningFinished).toBe(true);
  });

  it('shows a warning marker before a large group enters', () => {
    const world = makeWorld({ spawns: [{ time: 3, enemy: FOOTMAN, count: 6, kind: 'group' }], armed: false });
    let warnedAt = -1;
    let spawnedAt = -1;
    for (let step = 0; step < 60 * 4; step++) {
      world.step(IDLE);
      if (warnedAt < 0 && world.events.some((event) => event.type === 'spawnWarning')) warnedAt = world.elapsed;
      if (spawnedAt < 0 && world.enemies.activeCount > 0) spawnedAt = world.elapsed;
    }
    expect(warnedAt).toBeGreaterThan(0);
    expect(spawnedAt - warnedAt).toBeCloseTo(1.5, 1);
  });
});
