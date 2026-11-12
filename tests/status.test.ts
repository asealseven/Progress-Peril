import { describe, expect, it } from 'vitest';
import type { EnemyDef } from '../src/data/enemies';
import { REACTIONS, STATUS_EFFECTS } from '../src/data/statusEffects';
import type { Reaction, StatusEffect } from '../src/data/statusEffects';
import { hitEnemy } from '../src/sim/world/damage';
import {
  buildStatus,
  enemyArmour,
  hasStatus,
  spreadInfection,
  triggerStatus,
  typeMultiplier,
} from '../src/sim/world/status';
import type { Enemy, WorldEvent } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';
import {
  ARTIFICIAL_ENEMY,
  FOOTMAN,
  IDLE,
  PLAIN_ENEMY,
  arm,
  dummyAt,
  footmanAt,
  holdFire,
  makeWorld,
  stepSeconds,
} from './helpers';

const I = (status: StatusEffect): number => STATUS_EFFECTS.indexOf(status);

function reactions(world: World): Reaction[] {
  return world.events
    .filter((event): event is Extract<WorldEvent, { type: 'reaction' }> => event.type === 'reaction')
    .map((event) => event.reaction);
}

/** A world with one silent weapon, for driving statuses and hits by hand. */
function quiet(weaponName = 'Crossbow', ...parts: string[]): World {
  const world = makeWorld({ weapons: [arm(weaponName, ...parts)], invincible: true, noCriticals: true });
  holdFire(world);
  world.step(IDLE);
  return world;
}

const lost = (enemy: Enemy): number => enemy.maxHealth - enemy.health;

describe('status meters (GDD 9.14)', () => {
  it('lists ten statuses from the GDD table, plus Short-circuited, and seven reactions', () => {
    expect(STATUS_EFFECTS).toHaveLength(11);
    expect(REACTIONS).toHaveLength(7);
  });

  it('fills a Normal meter in three Medium hits, then empties the meter', () => {
    const world = quiet();
    const enemy = dummyAt(world, 200, 0);
    expect(buildStatus(world, enemy, 0, 'Burning', 1 / 3)).toBe(false);
    expect(buildStatus(world, enemy, 0, 'Burning', 1 / 3)).toBe(false);
    expect(hasStatus(enemy, 'Burning')).toBe(false);
    expect(buildStatus(world, enemy, 0, 'Burning', 1 / 3)).toBe(true);
    expect(hasStatus(enemy, 'Burning')).toBe(true);
    expect(enemy.statusMeter[I('Burning')]).toBe(0);
    expect(enemy.statusActive[I('Burning')]).toBeCloseTo(4, 6);
  });

  it('keeps one meter per status', () => {
    const world = quiet();
    const enemy = dummyAt(world, 200, 0);
    buildStatus(world, enemy, 0, 'Burning', 0.5);
    buildStatus(world, enemy, 0, 'Poisoned', 0.2);
    expect(enemy.statusMeter[I('Burning')]).toBeCloseTo(0.5, 10);
    expect(enemy.statusMeter[I('Poisoned')]).toBeCloseTo(0.2, 10);
  });

  it('drains a meter 10 per cent per second after one second without build-up', () => {
    const world = quiet();
    const enemy = dummyAt(world, 200, 0);
    buildStatus(world, enemy, 0, 'Burning', 0.5);
    stepSeconds(world, 0.9);
    expect(enemy.statusMeter[I('Burning')]).toBeCloseTo(0.5, 6);
    // One second of grace, then two seconds of drain.
    stepSeconds(world, 2.1);
    expect(enemy.statusMeter[I('Burning')]).toBeCloseTo(0.5 - 0.2, 2);
  });

  it('grows the meter with rank: Elite 2, Champion 3, Boss 5', () => {
    const world = quiet();
    for (const [scale, hits] of [
      [2, 6],
      [3, 9],
      [5, 15],
    ] as const) {
      const enemy = dummyAt(world, 200 + scale * 40, 0);
      enemy.meterScale = scale;
      let count = 0;
      while (!hasStatus(enemy, 'Burning')) {
        buildStatus(world, enemy, 0, 'Burning', 1 / 3);
        count++;
      }
      expect(count).toBe(hits);
    }
  });

  it('refills during an active effect, and a second trigger refreshes the duration', () => {
    const world = quiet();
    const enemy = dummyAt(world, 200, 0);
    triggerStatus(world, enemy, 0, 'Corroded');
    stepSeconds(world, 3);
    expect(enemy.statusActive[I('Corroded')]).toBeCloseTo(2, 2);
    buildStatus(world, enemy, 0, 'Corroded', 0.6);
    expect(enemy.statusMeter[I('Corroded')]).toBeCloseTo(0.6, 10);
    buildStatus(world, enemy, 0, 'Corroded', 0.6);
    expect(enemy.statusActive[I('Corroded')]).toBeCloseTo(5, 6);
  });

  it('builds statuses from weapon hits: elemental weapons, named weapons and payloads', () => {
    const builds = (weapon: string, ...parts: string[]) =>
      makeWorld({ weapons: [arm(weapon, ...parts)] }).weapons[0]!.resolved.statusBuilds;
    expect(builds('Crossbow')).toEqual([]);
    expect(builds('Forged Longsword')).toEqual([]);
    expect(builds('Firebomb Satchel')).toEqual([{ status: 'Burning', share: 0.2 }]);
    expect(builds('Tesla Rod')).toEqual([{ status: 'Electrified', share: 0.2 }]);
    expect(builds('Acid Sprayer')).toEqual([{ status: 'Corroded', share: 0.2 }]);
    expect(builds('Spore Censer')).toEqual([{ status: 'Infected', share: 0.2 }]);
    expect(builds('Living Arsenal')).toEqual([{ status: 'Poisoned', share: 0.2 }]);
    expect(builds('War Hammer')).toEqual([{ status: 'Stunned', share: 0.2 }]);
    expect(builds('Spring Trap Layer')).toEqual([{ status: 'Bleeding', share: 0.2 }]);
    expect(builds('Field Cannon')).toEqual([{ status: 'Burning', share: 0.2 }]);
    expect(builds('Crossbow', 'Incendiary Oil')).toEqual([{ status: 'Burning', share: 1 / 3 }]);
    expect(builds('Crossbow', 'Barbed Heads')).toEqual([{ status: 'Bleeding', share: 0.2 }]);
    // A payload adds to the weapon's own build-up for the same status.
    expect(builds('Firebomb Satchel', 'Incendiary Oil')[0]!.share).toBeCloseTo(0.2 + 1 / 3, 10);
    expect(builds('Crossbow', "Philosopher's Reagent").map((build) => build.status)).toEqual([
      'Burning',
      'Poisoned',
      'Corroded',
    ]);
    expect(builds('Crossbow', 'Copper Coil Housing')).toEqual([{ status: 'Electrified', share: 0.2 }]);
  });

  it('triggers Burning after three hits from a fast weapon with Incendiary Oil', () => {
    const world = makeWorld({ weapons: [arm('Repeating Crossbow', 'Incendiary Oil')], invincible: true });
    const enemy = dummyAt(world, 150, 0);
    stepSeconds(world, 0.5);
    expect(hasStatus(enemy, 'Burning')).toBe(false);
    stepSeconds(world, 1.5);
    expect(hasStatus(enemy, 'Burning')).toBe(true);
    expect(world.events.some((event) => event.type === 'status' && event.status === 'Burning')).toBe(true);
  });
});

describe('damage types against enemies (GDD 9.11)', () => {
  it('raises damage one step against a weakness and lowers one step against a resistance', () => {
    const world = quiet();
    const footman = footmanAt(world, 200, 0);
    expect(typeMultiplier(footman, 'Corrosive')).toBe(1.7);
    expect(typeMultiplier(footman, 'Electric')).toBe(1.7);
    expect(typeMultiplier(footman, 'Slashing')).toBe(0.6);
    expect(typeMultiplier(footman, 'Piercing')).toBe(1);
  });

  it('applies the type step before Armour in a hit', () => {
    const world = quiet('Forged Longsword');
    const footman = footmanAt(world, 60, 0);
    hitEnemy(world, footman, 0);
    // Damage 12, Slashing: resisted (0.6), then Armour 25 per cent.
    expect(lost(footman)).toBeCloseTo(12 * 0.6 * 0.75, 10);
  });

  it('gives an immune enemy no damage and no status', () => {
    const world = quiet('Living Arsenal');
    const automaton = dummyAt(world, 100, 0, ARTIFICIAL_ENEMY);
    expect(typeMultiplier(automaton, 'Toxic')).toBe(0);
    hitEnemy(world, automaton, 0);
    expect(lost(automaton)).toBe(0);
    expect(automaton.statusMeter[I('Poisoned')]).toBe(0);
  });
});

describe('status effects (GDD 9.14)', () => {
  it('Burning: damage over time', () => {
    const world = quiet();
    const enemy = dummyAt(world, 200, 0);
    triggerStatus(world, enemy, 0, 'Burning');
    stepSeconds(world, 2.1);
    expect(lost(enemy)).toBeCloseTo(10, 6);
    stepSeconds(world, 2.1);
    // The Crossbow deals 20 per hit: Burning deals the same again over 4 seconds.
    expect(lost(enemy)).toBeCloseTo(20, 6);
    expect(hasStatus(enemy, 'Burning')).toBe(false);
  });

  it('Poisoned: damage over time, ignores Armour', () => {
    const world = quiet();
    const armoured: EnemyDef = { ...PLAIN_ENEMY, id: 'test-armoured', armour: 'High' };
    const burning = dummyAt(world, 200, 0, armoured);
    const poisoned = dummyAt(world, 200, 100, armoured);
    triggerStatus(world, burning, 0, 'Burning');
    triggerStatus(world, poisoned, 0, 'Poisoned');
    stepSeconds(world, 5.2);
    expect(lost(burning)).toBeCloseTo(20 * 0.6, 6);
    expect(lost(poisoned)).toBeCloseTo(20, 6);
  });

  it('Corroded: lowers Armour, more against Metallic enemies', () => {
    const world = quiet();
    const plated: EnemyDef = { ...PLAIN_ENEMY, id: 'test-plated', armour: 'High' };
    const organic = dummyAt(world, 200, 0, plated);
    const metallic = dummyAt(world, 200, 100, { ...plated, id: 'test-metal', properties: ['Metallic'] });
    expect(enemyArmour(organic, 'Slashing')).toBeCloseTo(0.4, 10);
    triggerStatus(world, organic, 0, 'Corroded');
    triggerStatus(world, metallic, 0, 'Corroded');
    expect(enemyArmour(organic, 'Slashing')).toBeCloseTo(0.25, 10);
    expect(enemyArmour(metallic, 'Slashing')).toBeCloseTo(0.1, 10);
    // Piercing damage cuts one more step (GDD 7.14 step 6).
    expect(enemyArmour(organic, 'Piercing')).toBeCloseTo(0.1, 10);
    stepSeconds(world, 5.1);
    expect(enemyArmour(organic, 'Slashing')).toBeCloseTo(0.4, 10);
  });

  it('Electrified: damage over time with a chance to arc', () => {
    const world = quiet();
    const enemy = dummyAt(world, 200, 0);
    const neighbour = dummyAt(world, 260, 0);
    for (let round = 0; round < 6; round++) {
      triggerStatus(world, enemy, 0, 'Electrified');
      stepSeconds(world, 4.1);
    }
    // 75 per cent of 20 per trigger.
    expect(lost(enemy)).toBeCloseTo(6 * 15, 6);
    // 48 ticks at a 25 per cent arc chance.
    const arcs = lost(neighbour) / (15 / 8);
    expect(arcs).toBeGreaterThan(4);
    expect(arcs).toBeLessThan(24);
  });

  it('Frozen: each hit slows, and a full meter freezes the target', () => {
    const world = quiet();
    const enemy = dummyAt(world, 400, 0);
    enemy.speed = 100;
    buildStatus(world, enemy, 0, 'Frozen', 0.4);
    expect(enemy.slowFactor).toBeCloseTo(0.7, 10);
    expect(hasStatus(enemy, 'Frozen')).toBe(false);
    buildStatus(world, enemy, 0, 'Frozen', 0.4);
    buildStatus(world, enemy, 0, 'Frozen', 0.4);
    expect(hasStatus(enemy, 'Frozen')).toBe(true);
    const x = enemy.x;
    stepSeconds(world, 1.9);
    expect(enemy.x).toBe(x);
    stepSeconds(world, 1);
    expect(enemy.x).toBeLessThan(x);
  });

  it('Bleeding: damage over time, faster while the target moves', () => {
    const world = quiet();
    const still = dummyAt(world, 500, 0);
    const moving = dummyAt(world, 500, 300);
    moving.speed = 40;
    triggerStatus(world, still, 0, 'Bleeding');
    triggerStatus(world, moving, 0, 'Bleeding');
    stepSeconds(world, 4.2);
    // 75 per cent of 20 over 4 seconds, twice as fast for the moving target.
    expect(lost(still)).toBeCloseTo(15, 6);
    // Movement shows one step late, so the moving target gains 15 or 16 ticks.
    expect(lost(moving)).toBeGreaterThanOrEqual(15 * 1.875 - 1e-6);
    expect(lost(moving)).toBeLessThanOrEqual(30 + 1e-6);
  });

  it('Stunned: a brief stop, and the Stun meter grows after each stun', () => {
    const world = quiet();
    const enemy = dummyAt(world, 400, 0);
    enemy.speed = 100;
    expect(buildStatus(world, enemy, 0, 'Stunned', 1)).toBe(true);
    const x = enemy.x;
    stepSeconds(world, 0.9);
    expect(enemy.x).toBe(x);
    stepSeconds(world, 0.5);
    expect(enemy.x).toBeLessThan(x);
    // The second stun needs one and a half meters.
    expect(buildStatus(world, enemy, 0, 'Stunned', 1)).toBe(false);
    expect(buildStatus(world, enemy, 0, 'Stunned', 0.5)).toBe(true);
    expect(enemy.stunGrowth).toBeCloseTo(2.25, 10);
  });

  it('Stunned and Frozen enemies start no attack', () => {
    const world = makeWorld({ armed: false, playerStats: { evasion: 0 } });
    const enemy = footmanAt(world, 40, 0, false);
    world.step(IDLE);
    triggerStatus(world, enemy, -1, 'Frozen');
    stepSeconds(world, 1.8);
    expect(world.stats.hitsTaken).toBe(0);
    stepSeconds(world, 2);
    expect(world.stats.hitsTaken).toBeGreaterThan(0);
  });

  it('Infected: damage over time, and spreads to a nearby enemy on death', () => {
    const world = quiet();
    const host = dummyAt(world, 200, 0, PLAIN_ENEMY, 12);
    const near = dummyAt(world, 280, 0);
    const far = dummyAt(world, 200, 600);
    triggerStatus(world, host, 0, 'Infected');
    stepSeconds(world, 3.1);
    expect(lost(host)).toBeCloseTo(6 * 1.25, 6);
    stepSeconds(world, 3);
    // 75 per cent of 20 over 6 seconds kills the 12 health host near the end.
    expect(host.active).toBe(false);
    expect(hasStatus(near, 'Infected')).toBe(true);
    expect(hasStatus(far, 'Infected')).toBe(false);
    expect(world.stats.kills).toBe(1);
  });

  it('Marked: Critical Chance against the target up', () => {
    const world = quiet();
    const marked = dummyAt(world, 200, 0);
    const plain = dummyAt(world, 200, 100);
    triggerStatus(world, marked, 0, 'Marked');
    expect(marked.marked).toBe(true);
    let onMarked = 0;
    for (let i = 0; i < 400; i++) {
      // Calculated Strike ends Marked on each critical hit, so mark the target again.
      if (!hasStatus(marked, 'Marked')) {
        onMarked++;
        triggerStatus(world, marked, 0, 'Marked');
      }
      hitEnemy(world, marked, 0);
      hitEnemy(world, plain, 0);
    }
    // The test weapon has Critical Chance 0. Marked adds 10 points.
    expect(onMarked).toBeGreaterThan(20);
    expect(onMarked).toBeLessThan(70);
    expect(lost(plain)).toBeCloseTo(400 * 20, 4);
    stepSeconds(world, 6.1);
    expect(marked.marked).toBe(false);
  });

  it('Artificial enemies: Burning becomes Overheated, Electrified becomes Short-circuited', () => {
    const world = quiet();
    const automaton = dummyAt(world, 400, 0, ARTIFICIAL_ENEMY);
    automaton.speed = 100;
    buildStatus(world, automaton, 0, 'Burning', 1);
    expect(hasStatus(automaton, 'Burning')).toBe(false);
    expect(hasStatus(automaton, 'Overheated')).toBe(true);
    // Overheated: extra Electric and Cold damage taken.
    expect(typeMultiplier(automaton, 'Electric')).toBeCloseTo(1.2, 10);
    expect(typeMultiplier(automaton, 'Cold')).toBeCloseTo(1.2, 10);
    expect(typeMultiplier(automaton, 'Fire')).toBe(1);

    buildStatus(world, automaton, 0, 'Electrified', 1);
    expect(hasStatus(automaton, 'Electrified')).toBe(false);
    expect(hasStatus(automaton, 'Short-circuited')).toBe(true);
    const x = automaton.x;
    stepSeconds(world, 0.9);
    expect(automaton.x).toBe(x);
    stepSeconds(world, 0.5);
    expect(automaton.x).toBeLessThan(x);
  });

  it('Artificial enemies: immune to Poisoned, Bleeding and Infected', () => {
    const world = quiet();
    const automaton = dummyAt(world, 200, 0, { ...ARTIFICIAL_ENEMY, immune: [] });
    for (const status of ['Poisoned', 'Bleeding', 'Infected'] as const) {
      expect(buildStatus(world, automaton, 0, status, 5)).toBe(false);
      expect(hasStatus(automaton, status)).toBe(false);
    }
    expect(buildStatus(world, automaton, 0, 'Corroded', 1)).toBe(true);
    expect(buildStatus(world, automaton, 0, 'Frozen', 1)).toBe(true);
  });

  it('Overheated: slower attacks', () => {
    const strikes = (overheated: boolean): number => {
      const world = makeWorld({ armed: false, invincible: true, playerStats: { evasion: 0 } });
      const enemy = dummyAt(world, 40, 0, { ...ARTIFICIAL_ENEMY, damage: 'Medium' });
      world.step(IDLE);
      for (let second = 0; second < 30; second++) {
        if (overheated) triggerStatus(world, enemy, -1, 'Overheated');
        stepSeconds(world, 1);
      }
      return world.stats.hitsTaken;
    };
    const normal = strikes(false);
    const slowed = strikes(true);
    expect(slowed).toBeLessThan(normal);
    // Whole strikes inside 30 seconds: one strike of rounding either way.
    expect(Math.abs(slowed - normal / 1.5)).toBeLessThanOrEqual(1);
  });
});

describe('status reactions (GDD 9.14)', () => {
  it('Shatter: Impact hit on a Frozen enemy. Burst damage. Ends Frozen', () => {
    const world = quiet('War Hammer');
    const frozen = dummyAt(world, 80, 0);
    const plain = dummyAt(world, 80, 300);
    triggerStatus(world, frozen, 0, 'Frozen');
    hitEnemy(world, frozen, 0);
    hitEnemy(world, plain, 0);
    expect(lost(plain)).toBeCloseTo(20, 10);
    expect(lost(frozen)).toBeCloseTo(40, 10);
    expect(hasStatus(frozen, 'Frozen')).toBe(false);
    expect(reactions(world)).toEqual(['Shatter']);
  });

  it('Steam Burst: Fire hit on a Frozen enemy. Small area burst. Ends both effects', () => {
    const world = quiet('Burning Mirror');
    const frozen = dummyAt(world, 200, 0);
    const neighbour = dummyAt(world, 240, 0);
    const far = dummyAt(world, 200, 300);
    triggerStatus(world, frozen, 0, 'Frozen');
    hitEnemy(world, frozen, 0);
    expect(reactions(world)).toEqual(['Steam Burst']);
    expect(hasStatus(frozen, 'Frozen')).toBe(false);
    // The Burning Mirror deals 7. The burst deals half of 7 to everything in 60 pixels.
    expect(lost(neighbour)).toBeCloseTo(3.5, 10);
    expect(lost(frozen)).toBeCloseTo(7 + 3.5, 10);
    expect(lost(far)).toBe(0);
  });

  it('Steam Burst: Cold hit on a Burning enemy', () => {
    const world = quiet('Crossbow', 'Frost Salts');
    const burning = dummyAt(world, 200, 0);
    triggerStatus(world, burning, 0, 'Burning');
    hitEnemy(world, burning, 0);
    expect(reactions(world)).toEqual(['Steam Burst']);
    expect(hasStatus(burning, 'Burning')).toBe(false);
  });

  it('Toxic Fumes: Burning and Poisoned together. Poison cloud around the target', () => {
    const world = quiet();
    const target = dummyAt(world, 200, 0);
    const neighbour = dummyAt(world, 240, 0);
    const far = dummyAt(world, 200, 300);
    triggerStatus(world, target, 0, 'Burning');
    expect(reactions(world)).toEqual([]);
    triggerStatus(world, target, 0, 'Poisoned');
    expect(reactions(world)).toEqual(['Toxic Fumes']);
    expect(world.zones.items.filter((zone) => zone.active && zone.kind === 'fumes')).toHaveLength(1);
    stepSeconds(world, 3.2);
    // Six ticks of a quarter of 20 as Toxic damage.
    expect(lost(neighbour)).toBeCloseTo(6 * 5, 6);
    expect(lost(far)).toBe(0);
  });

  it('Galvanic Surge: Electrified and Corroded together. Electric damage up against the target', () => {
    const world = quiet('Tesla Rod');
    const target = dummyAt(world, 200, 0);
    const plain = dummyAt(world, 200, 400);
    triggerStatus(world, target, 0, 'Electrified');
    triggerStatus(world, target, 0, 'Corroded');
    hitEnemy(world, target, 0, { primary: false });
    hitEnemy(world, plain, 0, { primary: false });
    expect(lost(plain)).toBeCloseTo(7, 10);
    expect(lost(target)).toBeCloseTo(7 * 1.35, 10);
    world.step(IDLE);
    expect(reactions(world)).toContain('Galvanic Surge');
  });

  it('Septic Wound: Bleeding and Infected together. Infection spreads faster', () => {
    const world = quiet();
    const host = dummyAt(world, 200, 0);
    const neighbour = dummyAt(world, 260, 0);
    triggerStatus(world, host, 0, 'Infected');
    stepSeconds(world, 2);
    // Infected alone spreads only on death.
    expect(hasStatus(neighbour, 'Infected')).toBe(false);
    triggerStatus(world, host, 0, 'Bleeding');
    stepSeconds(world, 1.7);
    expect(reactions(world)).toContain('Septic Wound');
    expect(host.active).toBe(true);
    expect(hasStatus(neighbour, 'Infected')).toBe(true);
  });

  it('Short Circuit: Electric hit on an Overheated enemy. Stun plus burst damage', () => {
    const world = quiet('Tesla Rod');
    const automaton = dummyAt(world, 200, 0, ARTIFICIAL_ENEMY);
    triggerStatus(world, automaton, 0, 'Overheated');
    hitEnemy(world, automaton, 0, { primary: false });
    expect(reactions(world)).toEqual(['Short Circuit']);
    expect(hasStatus(automaton, 'Stunned')).toBe(true);
    // Damage 7, up 20 per cent on an Overheated enemy, doubled by the reaction.
    expect(lost(automaton)).toBeCloseTo(7 * 1.2 * 2, 10);
    // A stunned enemy sets off no second Short Circuit.
    hitEnemy(world, automaton, 0, { primary: false });
    expect(reactions(world)).toHaveLength(1);
  });

  it('Calculated Strike: critical hit on a Marked enemy. Critical Damage up, then Marked ends', () => {
    const world = makeWorld({ weapons: [arm('Crossbow')], invincible: true, alwaysCritical: true });
    holdFire(world);
    world.step(IDLE);
    const marked = dummyAt(world, 200, 0);
    const plain = dummyAt(world, 200, 300);
    triggerStatus(world, marked, 0, 'Marked');
    hitEnemy(world, marked, 0);
    hitEnemy(world, plain, 0);
    expect(lost(plain)).toBeCloseTo(20 * 1.75, 10);
    expect(lost(marked)).toBeCloseTo(20 * (1.75 + 0.35), 10);
    expect(marked.marked).toBe(false);
    expect(reactions(world)).toEqual(['Calculated Strike']);
  });
});

describe('components acting on statuses (GDD 7.18)', () => {
  it('Reagent Recycler: status duration up, Medium', () => {
    const world = quiet('Crossbow', 'Reagent Recycler');
    const enemy = dummyAt(world, 200, 0);
    triggerStatus(world, enemy, 0, 'Corroded');
    expect(enemy.statusActive[I('Corroded')]).toBeCloseTo(6, 6);
  });

  it('Heat Sink Housing: Burning lasts longer', () => {
    const world = quiet('Crossbow', 'Heat Sink Housing');
    const enemy = dummyAt(world, 200, 0);
    triggerStatus(world, enemy, 0, 'Burning');
    triggerStatus(world, enemy, 0, 'Corroded');
    expect(enemy.statusActive[I('Burning')]).toBeCloseTo(4.8, 6);
    expect(enemy.statusActive[I('Corroded')]).toBeCloseTo(5, 6);
  });

  it('Resonance Fork: bonus damage against Electrified and Frozen enemies', () => {
    const world = quiet('Crossbow', 'Tempered Steel Frame', 'Resonance Fork');
    const frozen = dummyAt(world, 200, 0);
    const plain = dummyAt(world, 200, 300);
    triggerStatus(world, frozen, 0, 'Frozen');
    hitEnemy(world, frozen, 0);
    hitEnemy(world, plain, 0);
    expect(lost(plain)).toBeCloseTo(22, 10);
    // The Fork's 20 per cent joins the frame's 10 per cent: one source type, so they add.
    expect(lost(frozen)).toBeCloseTo(20 * 1.3, 10);
  });

  it('Marking Chalk: builds Marked, and Precise weapons take Marked enemies first', () => {
    const world = makeWorld({ weapons: [arm('Repeating Crossbow', 'Marking Chalk')], invincible: true });
    const far = dummyAt(world, 200, 0);
    stepSeconds(world, 2);
    expect(far.marked).toBe(true);
    const near = dummyAt(world, -60, 0);
    world.weapons[0]!.targetSlot = -1;
    stepSeconds(world, 0.7);
    expect(lost(near)).toBe(0);
  });

  it('Parasite Larvae: Infected enemies release a parasite on death, which seeks a new host', () => {
    const world = quiet('Crossbow', 'Parasite Larvae');
    const host = dummyAt(world, 200, 0, PLAIN_ENEMY, 1);
    // Beyond the reach of an ordinary spread, inside the parasite's range.
    const distant = dummyAt(world, 200, 300);
    triggerStatus(world, host, 0, 'Infected');
    stepSeconds(world, 0.6);
    expect(host.active).toBe(false);
    expect(hasStatus(distant, 'Infected')).toBe(false);
    stepSeconds(world, 2);
    expect(hasStatus(distant, 'Infected')).toBe(true);
    expect(lost(distant)).toBeGreaterThan(0);
  });
});

describe('chain limits (GDD 7.20)', () => {
  it('stops infection spread at the depth limit', () => {
    const world = quiet();
    const host = dummyAt(world, 200, 0);
    dummyAt(world, 260, 0);
    expect(spreadInfection(world, host, 0, 4, 1)).toBe(0);
    expect(spreadInfection(world, host, 0, 3, 1)).toBe(1);
  });

  it('raises the depth limit by one with a Grand Calculus Engine', () => {
    const world = quiet('Crossbow', 'Grand Calculus Engine');
    expect(world.weapons[0]!.resolved.chainDepthLimit).toBe(5);
    const host = dummyAt(world, 200, 0);
    dummyAt(world, 260, 0);
    expect(spreadInfection(world, host, 0, 4, 1)).toBe(1);
  });

  it('keeps Royal Footman data from GDD 9.11', () => {
    expect(FOOTMAN.weakTo).toEqual(['Corrosive', 'Electric']);
    expect(FOOTMAN.resists).toEqual(['Slashing']);
  });
});
