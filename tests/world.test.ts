import { describe, expect, it } from 'vitest';
import { ARENAS } from '../src/data/arenas';
import { COMBAT } from '../src/data/tiers';
import { hitPlayer } from '../src/sim/world/damage';
import { spawnEnemy } from '../src/sim/world/enemies';
import { STEP_SECONDS } from '../src/sim/world/world';
import { FOOTMAN, IDLE, OPEN_ARENA, makeWorld, stepSeconds } from './helpers';

/** A spawn far in the future keeps the round open for the test. */
const HOLD_OPEN = [{ time: 9999, enemy: FOOTMAN, count: 1, kind: 'trickle' as const }];

describe('round timer (GDD 4.3, 4.9)', () => {
  it('counts down one step at a time', () => {
    const world = makeWorld({ duration: 30, spawns: HOLD_OPEN });
    expect(world.timeLeft).toBe(30);
    world.step(IDLE);
    expect(world.timeLeft).toBeCloseTo(30 - STEP_SECONDS, 10);
    stepSeconds(world, 10);
    expect(world.timeLeft).toBeCloseTo(20 - STEP_SECONDS, 6);
  });

  it('stops at zero', () => {
    const world = makeWorld({ duration: 2, spawns: HOLD_OPEN });
    stepSeconds(world, 5);
    expect(world.timeLeft).toBe(0);
    expect(world.phase).toBe('running');
  });

  it('keeps the round open past the timer while enemies remain', () => {
    const world = makeWorld({
      duration: 1,
      armed: false,
      invincible: true,
      spawns: [{ time: 0.5, enemy: FOOTMAN, count: 3, kind: 'group' }],
    });
    stepSeconds(world, 4);
    expect(world.timeLeft).toBe(0);
    expect(world.spawningFinished).toBe(true);
    expect(world.enemies.activeCount).toBe(3);
    expect(world.phase).toBe('running');
  });

  it('ends the round when spawning has finished and every enemy is defeated', () => {
    const world = makeWorld({
      duration: 30,
      invincible: true,
      spawns: [{ time: 0.5, enemy: FOOTMAN, count: 2, kind: 'group' }],
    });
    stepSeconds(world, 0.4);
    expect(world.phase).toBe('running');
    stepSeconds(world, 60);
    expect(world.stats.kills).toBe(2);
    expect(world.phase).toBe('cleared');
  });

  it('stops stepping after the round ends', () => {
    const world = makeWorld({ spawns: [] });
    world.step(IDLE);
    expect(world.phase).toBe('cleared');
    const steps = world.steps;
    world.step(IDLE);
    expect(world.steps).toBe(steps);
  });
});

describe('player movement (GDD 3.2)', () => {
  it('moves at Move Speed', () => {
    const world = makeWorld({ spawns: HOLD_OPEN });
    const startX = world.player.x;
    stepSeconds(world, 1, { moveX: 1, moveY: 0 });
    expect(world.player.x - startX).toBeCloseTo(world.player.stats.moveSpeed, 6);
  });

  it('caps diagonal input at full speed', () => {
    const world = makeWorld({ spawns: HOLD_OPEN });
    const { x, y } = world.player;
    stepSeconds(world, 1, { moveX: 1, moveY: 1 });
    const moved = Math.hypot(world.player.x - x, world.player.y - y);
    expect(moved).toBeCloseTo(world.player.stats.moveSpeed, 6);
  });

  it('stays inside the arena walls', () => {
    const world = makeWorld({ spawns: HOLD_OPEN });
    stepSeconds(world, 20, { moveX: -1, moveY: -1 });
    expect(world.player.x).toBe(world.player.radius);
    expect(world.player.y).toBe(world.player.radius);
  });

  it('never enters an obstacle', () => {
    const arena = ARENAS['great-foundry'];
    const world = makeWorld({ arena, spawns: HOLD_OPEN });
    const crucible = arena.obstacles[0]!;
    stepSeconds(world, 4, { moveX: 0, moveY: -1 });
    const distance = Math.hypot(world.player.x - crucible.x, world.player.y - crucible.y);
    expect(distance).toBeGreaterThanOrEqual(crucible.radius + world.player.radius - 1e-6);
  });
});

describe('Crossbow against a Royal Footman', () => {
  it('fires at the nearest enemy in range', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, invincible: true });
    spawnEnemy(world, FOOTMAN, world.player.x + 300, world.player.y);
    const near = spawnEnemy(world, FOOTMAN, world.player.x - 200, world.player.y)!;
    stepSeconds(world, COMBAT.weaponStartDelay + 0.05);
    expect(world.stats.shotsFired).toBe(1);
    expect(world.weapons[0]!.targetId).toBe(near.id);
    expect(world.weapons[0]!.aimX).toBeCloseTo(-1, 6);
  });

  it('holds fire when no enemy is in range', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: true, invincible: true });
    const enemy = spawnEnemy(world, FOOTMAN, world.player.x + 800, world.player.y)!;
    enemy.speed = 0;
    stepSeconds(world, 3);
    expect(world.stats.shotsFired).toBe(0);
  });

  it('deals 18 damage per normal hit and kills in two hits without a critical', () => {
    // Critical Chance 0 removes the random roll from this test.
    const world = makeWorld({ spawns: HOLD_OPEN, invincible: true });
    const weapon = world.weapons[0]!;
    world.weapons[0] = { ...weapon, stats: { ...weapon.stats, criticalChance: 0 } };
    const enemy = spawnEnemy(world, FOOTMAN, world.player.x + 200, world.player.y)!;
    enemy.speed = 0;
    stepSeconds(world, 1);
    expect(enemy.health).toBeCloseTo(35 - 18, 6);
    stepSeconds(world, 2);
    expect(world.stats.kills).toBe(1);
    expect(enemy.active).toBe(false);
    expect(world.stats.damageDealt).toBeCloseTo(35, 6);
  });

  it('loses the bolt on a pillar between player and target', () => {
    const arena = {
      ...OPEN_ARENA,
      obstacles: [{ kind: 'pillar' as const, x: 1300, y: 800, radius: 38 }],
    };
    const world = makeWorld({ arena, spawns: HOLD_OPEN, invincible: true });
    const enemy = spawnEnemy(world, FOOTMAN, 1450, 800)!;
    enemy.speed = 0;
    stepSeconds(world, 3);
    expect(world.stats.shotsFired).toBeGreaterThan(0);
    expect(enemy.health).toBe(enemy.maxHealth);
    expect(world.events.some((event) => event.type === 'projectileBlocked')).toBe(true);
  });
});

describe('enemy attacks and player health (GDD 3.7)', () => {
  it('lets a Royal Footman chase and strike the player', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, playerStats: { evasion: 0 } });
    spawnEnemy(world, FOOTMAN, world.player.x + 150, world.player.y);
    stepSeconds(world, 3);
    expect(world.stats.hitsTaken).toBeGreaterThan(0);
    // Damage 7, Armour 10 per cent, first hit with no adaptation.
    expect(world.events.find((event) => event.type === 'playerHit')).toMatchObject({ amount: 7 * 0.9 });
  });

  it('lets the player dodge a strike by leaving range during the wind-up', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, playerStats: { evasion: 0 } });
    spawnEnemy(world, FOOTMAN, world.player.x + 100, world.player.y);
    // The player runs away faster than the footman follows.
    stepSeconds(world, 5, { moveX: -1, moveY: 0 });
    expect(world.stats.hitsTaken).toBe(0);
  });

  it('gives an invulnerability window after a hit', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, playerStats: { evasion: 0 } });
    expect(hitPlayer(world, 10, 'Slashing')).toBe(true);
    expect(hitPlayer(world, 10, 'Slashing')).toBe(false);
    stepSeconds(world, COMBAT.playerInvulnerability + 0.05);
    expect(hitPlayer(world, 10, 'Slashing')).toBe(true);
    expect(world.stats.hitsTaken).toBe(2);
  });

  it('builds adaptation per hit up to the cap', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, playerStats: { evasion: 0, maxHealth: 100000 } });
    for (let i = 0; i < 30; i++) {
      hitPlayer(world, 1, 'Slashing');
      world.player.invulnerable = 0;
    }
    expect(world.player.adaptation.Slashing).toBeCloseTo(0.1, 10);
    expect(world.player.adaptation.Fire).toBeUndefined();
  });

  it('regenerates health over time', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, playerStats: { evasion: 0 } });
    hitPlayer(world, 20, 'Slashing');
    const after = world.player.health;
    stepSeconds(world, 5);
    expect(world.player.health).toBeCloseTo(after + 5 * world.player.stats.regeneration, 6);
  });

  it('ends in defeat when health reaches zero', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, playerStats: { evasion: 0 } });
    hitPlayer(world, 100000, 'Slashing');
    expect(world.player.health).toBe(0);
    world.step(IDLE);
    expect(world.phase).toBe('defeat');
  });

  it('takes no damage with the invincibility debug tool', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, invincible: true, playerStats: { evasion: 0 } });
    hitPlayer(world, 100000, 'Slashing');
    expect(world.player.health).toBe(world.player.stats.maxHealth);
  });
});

describe('enemy crowding', () => {
  it('keeps enemies apart and off the player', () => {
    const world = makeWorld({ spawns: HOLD_OPEN, armed: false, invincible: true });
    for (let i = 0; i < 12; i++) spawnEnemy(world, FOOTMAN, world.player.x + 100 + i, world.player.y + i);
    stepSeconds(world, 6);
    const active = world.enemies.items.filter((enemy) => enemy.active);
    for (const enemy of active) {
      const gap = Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
      expect(gap).toBeGreaterThanOrEqual(enemy.radius + world.player.radius - 1e-6);
    }
    let overlaps = 0;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!;
        const b = active[j]!;
        if (Math.hypot(a.x - b.x, a.y - b.y) < (a.radius + b.radius) * 0.5) overlaps++;
      }
    }
    expect(overlaps).toBe(0);
  });
});
