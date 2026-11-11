import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { componentByName } from '../src/data/components';
import { WEAPONS } from '../src/data/weapons';
import { installComponent } from '../src/sim/loadout';
import { createRun, createWorldForRound, finishRound } from '../src/sim/run';
import { currentAttackSpeed } from '../src/sim/world/attacks';
import { hitPlayer } from '../src/sim/world/damage';
import type { WorldEvent } from '../src/sim/world/types';
import { IDLE, arm, footmanAt, makeWorld, stepSeconds } from './helpers';

type EventOf<T extends WorldEvent['type']> = Extract<WorldEvent, { type: T }>;

function eventsOf<T extends WorldEvent['type']>(events: readonly WorldEvent[], type: T): EventOf<T>[] {
  return events.filter((event): event is EventOf<T> => event.type === type);
}

/** A still enemy with a large health pool, for counting hits. */
function dummy(world: ReturnType<typeof makeWorld>, dx: number, dy: number) {
  const enemy = footmanAt(world, dx, dy);
  enemy.health = enemy.maxHealth = 100000;
  return enemy;
}

describe('components changing shots', () => {
  it('Ratchet Repeater: every third attack fires one extra projectile', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Ratchet Repeater')], invincible: true });
    dummy(world, 150, 0);
    // Three attacks at 0.7 per second: 0.4, 1.83 and 3.26 seconds.
    stepSeconds(world, 3.8);
    expect(world.stats.shotsFired).toBe(3);
    expect(eventsOf(world.events, 'enemyHit')).toHaveLength(4);
  });

  it('Multishot Rack: one more projectile per attack', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Multishot Rack')], invincible: true });
    dummy(world, 60, 0);
    stepSeconds(world, 0.6);
    expect(world.stats.shotsFired).toBe(1);
    expect(eventsOf(world.events, 'enemyHit')).toHaveLength(2);
  });

  it('Piercing Rail: the bolt passes through one enemy', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Piercing Rail')], invincible: true });
    const line = [100, 160, 220].map((x) => dummy(world, x, 0));
    stepSeconds(world, 1);
    expect(line.map((enemy) => enemy.health < enemy.maxHealth)).toEqual([true, true, false]);
  });

  it('Ricochet Deflector: the bolt bounces once to a nearby enemy', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Ricochet Deflector')], invincible: true });
    const first = dummy(world, 150, 0);
    const second = dummy(world, 150, 120);
    stepSeconds(world, 1);
    expect(first.health).toBeLessThan(first.maxHealth);
    expect(second.health).toBeLessThan(second.maxHealth);
  });

  it('Orbit Mount: the weapon orbits the player instead of attacking forward', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Orbit Mount')], invincible: true });
    const onPath = dummy(world, 150, 0);
    stepSeconds(world, 4);
    expect(world.stats.shotsFired).toBe(0);
    expect(world.projectiles.activeCount).toBe(0);
    expect(onPath.health).toBeLessThan(onPath.maxHealth);
  });

  it('Spray Nozzle: single shots become a cone', () => {
    const world = makeWorld({ weapons: [arm('Firebomb Satchel', 'Spray Nozzle')], invincible: true });
    const front = dummy(world, 100, 0);
    stepSeconds(world, 0.6);
    expect(eventsOf(world.events, 'cone')).toHaveLength(1);
    expect(world.projectiles.activeCount).toBe(0);
    expect(front.health).toBeLessThan(front.maxHealth);
  });

  it('Gyroscopic Stabiliser: projectiles home slightly', () => {
    const run = (...parts: string[]): number => {
      const world = makeWorld({ weapons: [arm('Crossbow', ...parts)], invincible: true });
      const target = dummy(world, 320, 0);
      stepSeconds(world, 0.42);
      target.y += 26;
      stepSeconds(world, 0.6);
      return target.maxHealth - target.health;
    };
    expect(run()).toBe(0);
    expect(run('Gyroscopic Stabiliser')).toBeGreaterThan(0);
  });
});

describe('components acting on hits', () => {
  it('Blackpowder Charge: hits explode in a small area', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Blackpowder Charge')], invincible: true, noCriticals: true });
    const target = dummy(world, 150, 0);
    const neighbour = dummy(world, 170, 30);
    stepSeconds(world, 1);
    // The neighbour takes half of 20, split into Impact and Fire, against Armour 25 per cent.
    expect(neighbour.maxHealth - neighbour.health).toBeCloseTo(10 * 0.75, 6);
    expect(target.maxHealth - target.health).toBeCloseTo(18, 6);
    expect(eventsOf(world.events, 'explosion')).toHaveLength(1);
  });

  it('Leyden Jar Cell: arcs to one nearby enemy', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Leyden Jar Cell')], invincible: true, noCriticals: true });
    dummy(world, 150, 0);
    const neighbour = dummy(world, 150, 100);
    const far = dummy(world, 150, -400);
    stepSeconds(world, 1);
    // Half of 20 as Electric, against Armour 25 per cent. Royal Footmen are weak to Electric.
    expect(neighbour.maxHealth - neighbour.health).toBeCloseTo(10 * 0.75 * 1.7, 6);
    expect(far.health).toBe(far.maxHealth);
  });

  it('Frost Salts: each hit also slows', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Frost Salts')], invincible: true });
    const target = dummy(world, 150, 0);
    stepSeconds(world, 0.8);
    expect(target.slowTimer).toBeGreaterThan(0);
    expect(target.slowFactor).toBeCloseTo(0.7, 10);
    // Out of range, the slow wears off.
    target.x += 2000;
    stepSeconds(world, 2);
    expect(target.slowFactor).toBe(1);
  });

  it('Magnetite Slugs: impacts pull small enemies toward the hit point', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Magnetite Slugs')], invincible: true });
    const target = dummy(world, 150, 0);
    const neighbour = dummy(world, 150, 70);
    const before = Math.hypot(neighbour.x - target.x, neighbour.y - target.y);
    stepSeconds(world, 0.8);
    expect(Math.hypot(neighbour.x - target.x, neighbour.y - target.y)).toBeCloseTo(before - 24, 6);
  });

  it('Grappling Line: pulls the first enemy hit toward the player', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Grappling Line')], invincible: true });
    const target = dummy(world, 200, 0);
    stepSeconds(world, 0.9);
    expect(target.x).toBeCloseTo(world.player.x + 160, 6);
  });

  it('Pneumatic Bellows: knockback pushes the enemy along the shot', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Pneumatic Bellows')], invincible: true });
    const target = dummy(world, 200, 0);
    stepSeconds(world, 0.9);
    expect(target.x).toBeCloseTo(world.player.x + 220, 6);
  });

  it('Shrapnel Shells: explosions throw fragments in all directions', () => {
    const world = makeWorld({ weapons: [arm('Field Cannon', 'Shrapnel Shells')], invincible: true });
    dummy(world, 200, 0);
    // The shell bursts 20 pixels short of the target centre. One fragment flies straight down.
    const bystander = dummy(world, 180, 130);
    stepSeconds(world, 0.75);
    // Fragments flying into the blast target end at once. The others fly outward.
    expect(world.projectiles.activeCount).toBeGreaterThanOrEqual(4);
    stepSeconds(world, 0.4);
    // Outside the blast, inside fragment range.
    expect(bystander.health).toBeLessThan(bystander.maxHealth);
  });

  it('Bayonet Mount: a short stab against adjacent enemies', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Bayonet Mount')], invincible: true, noCriticals: true });
    const adjacent = dummy(world, 40, 0);
    stepSeconds(world, 0.2);
    const stabs = eventsOf(world.events, 'thrust');
    expect(stabs).toHaveLength(1);
    // Low damage 7, Piercing: Armour drops to 10 per cent.
    expect(adjacent.maxHealth - adjacent.health).toBeCloseTo(6.3, 6);
  });

  it('Tesla Capacitor: discharges a lightning chain every few seconds', () => {
    const world = makeWorld({ weapons: [arm('War Hammer', 'Tesla Capacitor')], invincible: true });
    // Outside War Hammer Range, inside lightning reach.
    const target = dummy(world, 190, 0);
    stepSeconds(world, 2.5);
    expect(eventsOf(world.events, 'chain')).toHaveLength(1);
    // Medium damage 12, Electric, Armour 25 per cent, against a weakness to Electric.
    expect(target.maxHealth - target.health).toBeCloseTo(9 * 1.7, 6);
    stepSeconds(world, 4);
    expect(eventsOf(world.events, 'chain')).toHaveLength(2);
  });
});

describe('components acting on kills', () => {
  it('Volatile Catalyst: kills cause a small explosion on a later step', () => {
    const world = makeWorld({ weapons: [arm('Ballista', 'Volatile Catalyst')], invincible: true, noCriticals: true });
    // The Ballista aims at the strongest enemy. The bolt passes through the fragile one first.
    const victim = footmanAt(world, 150, 0);
    victim.health = 1;
    const neighbour = dummy(world, 186, 0);
    stepSeconds(world, 1);
    expect(victim.active).toBe(false);
    // The bolt deals 18. The explosion adds half of 20, split into Impact and Fire, against Armour 25 per cent.
    expect(neighbour.maxHealth - neighbour.health).toBeCloseTo(18 + 10 * 0.75, 6);
    expect(eventsOf(world.events, 'explosion').map((event) => event.generation)).toEqual([1]);
  });

  it('chain explosions stop at the depth limit', () => {
    const world = makeWorld({ weapons: [arm('Ballista', 'Volatile Catalyst')], invincible: true, noCriticals: true });
    // A row of fragile enemies beside the bolt path: each kill explosion reaches the next one.
    const trigger = footmanAt(world, 150, 0);
    trigger.health = 1;
    const row = Array.from({ length: 8 }, (_, i) => {
      const enemy = footmanAt(world, 150, 40 * (i + 1));
      enemy.health = 1;
      return enemy;
    });
    stepSeconds(world, 1.3);
    const generations = eventsOf(world.events, 'explosion').map((event) => event.generation);
    expect(Math.max(...generations)).toBe(4);
    expect(row.map((enemy) => enemy.active)).toEqual([false, false, false, false, true, true, true, true]);
  });

  it('Healing Poultice Chamber: kills restore a small amount of health', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Healing Poultice Chamber')], playerStats: { regeneration: 0 } });
    world.player.health = 50;
    const victim = footmanAt(world, 200, 0);
    victim.health = 1;
    stepSeconds(world, 1);
    expect(world.player.health).toBe(51);
  });

  it('Feedback Loop Gear: each kill raises Attack Speed briefly', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Feedback Loop Gear')], invincible: true });
    const weapon = world.weapons[0]!;
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(0.7, 10);
    const victim = footmanAt(world, 150, 0);
    victim.health = 1;
    stepSeconds(world, 0.8);
    expect(weapon.killStacks).toBe(1);
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(0.7 * 1.05, 10);
    stepSeconds(world, 3.2);
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(0.7, 10);
  });

  it('Feedback Loop Gear: stacks up to a cap', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Feedback Loop Gear')], invincible: true });
    const weapon = world.weapons[0]!;
    weapon.killStacks = 50;
    weapon.killStackTimer = 1;
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(0.7 * 1.35, 10);
  });
});

describe('components changing Attack Speed', () => {
  it('Gear Train Accelerator: Attack Speed climbs during constant attacks and resets after a pause', () => {
    const world = makeWorld({ weapons: [arm('Repeating Crossbow', 'Gear Train Accelerator')], invincible: true });
    const weapon = world.weapons[0]!;
    const target = dummy(world, 150, 0);
    stepSeconds(world, 3);
    expect(weapon.rampStacks).toBeGreaterThanOrEqual(5);
    expect(currentAttackSpeed(world, weapon)).toBeGreaterThan(1.8 * 1.2);
    stepSeconds(world, 6);
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(1.8 * 1.35, 10);
    // The target leaves range. The climb resets.
    target.x += 2000;
    stepSeconds(world, 2);
    expect(weapon.rampStacks).toBe(0);
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(1.8, 10);
  });

  it('Nerve Fibre Trigger: Attack Speed up, High, while player health is below half', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Nerve Fibre Trigger')], playerStats: { regeneration: 0 } });
    const weapon = world.weapons[0]!;
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(0.7, 10);
    world.player.health = world.player.stats.maxHealth * 0.4;
    expect(currentAttackSpeed(world, weapon)).toBeCloseTo(0.7 * 1.35, 10);
  });

  it('Prototype Overclock: the weapon jams briefly at random', () => {
    const world = makeWorld({ weapons: [arm('Repeating Crossbow', 'Prototype Overclock')], invincible: true, seed: 7 });
    dummy(world, 150, 0);
    stepSeconds(world, 60);
    const jams = eventsOf(world.events, 'jam').length;
    expect(jams).toBeGreaterThan(0);
    // 1.8 attacks per second, up 20 per cent, for 60 seconds, minus jam pauses.
    expect(world.stats.shotsFired).toBeLessThan(60 * 1.8 * 1.2);
    expect(world.stats.shotsFired).toBeGreaterThan(60);
  });
});

describe('components acting on the player and constructs', () => {
  it('Chitin Plating: lowers damage taken', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Chitin Plating')], playerStats: { evasion: 0 } });
    hitPlayer(world, 10, 'Slashing');
    expect(world.stats.damageTaken).toBeCloseTo(10 * (1 - 0.17647), 3);
  });

  it('Smoke Canister: on taking damage, releases smoke, and enemies inside lose their target', () => {
    const world = makeWorld({
      weapons: [arm('War Hammer', 'Smoke Canister')],
      playerStats: { evasion: 0, maxHealth: 100000 },
      armed: true,
    });
    world.weapons[0]!.cooldown = 9999;
    footmanAt(world, 60, 0, false);
    stepSeconds(world, 1.2);
    expect(world.stats.hitsTaken).toBe(1);
    expect(world.zones.items.filter((zone) => zone.active && zone.kind === 'smoke')).toHaveLength(1);
    // Inside the smoke the footman starts no new attack.
    stepSeconds(world, 2.5);
    expect(world.stats.hitsTaken).toBe(1);
    // The smoke clears and the footman attacks again.
    stepSeconds(world, 3);
    expect(world.stats.hitsTaken).toBeGreaterThan(1);
  });

  it('Clockwork Chassis and Self-Winding Escapement: stronger, faster turrets', () => {
    const plain = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true });
    const tuned = makeWorld({
      weapons: [arm('Clockwork Turret', 'Clockwork Chassis', 'Self-Winding Escapement')],
      invincible: true,
    });
    for (const world of [plain, tuned]) {
      dummy(world, 150, 0);
      stepSeconds(world, 3.5);
    }
    expect(plain.constructs.items[0]!.maxHealth).toBe(40);
    expect(tuned.constructs.items[0]!.maxHealth).toBeCloseTo(48, 10);
    expect(tuned.stats.shotsFired).toBeGreaterThan(plain.stats.shotsFired);
  });

  it('Repair Kit Housing: constructs repair over time', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Hound', 'Repair Kit Housing')], invincible: true });
    world.step(IDLE);
    const hound = world.constructs.items[0]!;
    hound.health = 30;
    stepSeconds(world, 5);
    expect(hound.health).toBeCloseTo(30 + 60 * 0.03 * 5, 4);
  });
});

describe('growth between rounds', () => {
  it('counts rounds for the Living Wood Frame through the run', () => {
    const run = createRun(11, CHARACTERS.inventor, WEAPONS.crossbow);
    installComponent(run.weapons[0]!, componentByName('Living Wood Frame')!);
    const first = createWorldForRound(run);
    expect(first.weapons[0]!.resolved.damage).toBeCloseTo(20, 10);
    // Clear the round by hand.
    while (!first.spawningFinished) first.step(IDLE);
    for (const enemy of first.enemies.items) if (enemy.active) first.enemies.release(enemy);
    first.step(IDLE);
    expect(first.phase).toBe('cleared');
    finishRound(run, first);
    expect(run.weapons[0]!.rounds).toBe(1);
    expect(createWorldForRound(run).weapons[0]!.resolved.damage).toBeCloseTo(21, 10);
  });
});
