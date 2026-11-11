import { ARENAS } from '../src/data/arenas';
import type { ArenaDef } from '../src/data/arenas';
import { CHARACTERS } from '../src/data/characters';
import { componentByName } from '../src/data/components';
import { ENEMIES } from '../src/data/enemies';
import type { EnemyDef } from '../src/data/enemies';
import { RESEARCH_SYNERGY_IDS } from '../src/data/synergies';
import { weaponByName } from '../src/data/weapons';
import { createWeapon, installComponent, resolveLoadout } from '../src/sim/loadout';
import type { ResolvedWeapon, WeaponInstance } from '../src/sim/loadout';
import { resolvePlayerStats } from '../src/sim/run';
import { spawnEnemy } from '../src/sim/world/enemies';
import type { Enemy, PlayerStats, SpawnEntry, StepInput } from '../src/sim/world/types';
import { World } from '../src/sim/world/world';

export const IDLE: StepInput = { moveX: 0, moveY: 0 };
export const FOOTMAN = ENEMIES['royal-footman'];
export const BASE_STATS = resolvePlayerStats(CHARACTERS.inventor);

/** A spawn far in the future keeps the round open for a test. */
export const HOLD_OPEN: SpawnEntry[] = [{ time: 9999, enemy: FOOTMAN, count: 1, kind: 'trickle' }];

/** An arena with no obstacles, for tests needing clear lines. */
export const OPEN_ARENA: ArenaDef = {
  ...ARENAS['great-foundry'],
  id: 'open',
  obstacles: [],
  playerStart: { x: 1200, y: 800 },
};

/** Builds a weapon by GDD name with components by GDD name. Auxiliary parts raise the weapon to Grade III. */
export function arm(weaponName: string, ...componentNames: string[]): WeaponInstance {
  const def = weaponByName(weaponName);
  if (!def) throw new Error(`Unknown weapon: ${weaponName}`);
  const weapon = createWeapon(def);
  for (const name of componentNames) {
    const component = componentByName(name);
    if (!component) throw new Error(`Unknown component: ${name}`);
    if (component.slot === 'Auxiliary') weapon.grade = 3;
    installComponent(weapon, component);
  }
  return weapon;
}

/** Resolves one weapon with The Inventor's base stats. */
export function resolved(weaponName: string, ...componentNames: string[]): ResolvedWeapon {
  const weapon = resolveLoadout([arm(weaponName, ...componentNames)], BASE_STATS).weapons[0];
  if (!weapon) throw new Error('No weapon resolved');
  return weapon;
}

export interface TestWorldOptions {
  arena?: ArenaDef;
  seed?: number;
  duration?: number;
  spawns?: SpawnEntry[];
  playerStats?: Partial<PlayerStats>;
  /** Weapons to equip. Default: one Crossbow. */
  weapons?: WeaponInstance[];
  armed?: boolean;
  invincible?: boolean;
  /** Critical Chance 0 removes the critical roll from a test. */
  noCriticals?: boolean;
  /** Critical Chance 1 makes every primary hit critical. */
  alwaysCritical?: boolean;
  /** Research synergies opened, by id. 'all' opens every one. */
  research?: readonly string[] | 'all';
}

export function makeWorld(options: TestWorldOptions = {}): World {
  const base = { ...BASE_STATS, ...options.playerStats };
  const instances = options.armed === false ? [] : (options.weapons ?? [arm('Crossbow')]);
  const researchSynergies = options.research === 'all' ? RESEARCH_SYNERGY_IDS : (options.research ?? []);
  const loadout = resolveLoadout(instances, base, { researchSynergies });
  let weapons = loadout.weapons;
  if (options.noCriticals) weapons = weapons.map((weapon) => ({ ...weapon, criticalChance: 0 }));
  if (options.alwaysCritical) weapons = weapons.map((weapon) => ({ ...weapon, criticalChance: 1 }));
  return new World({
    arena: options.arena ?? OPEN_ARENA,
    seed: options.seed ?? 12345,
    round: 1,
    duration: options.duration ?? 30,
    spawns: options.spawns ?? HOLD_OPEN,
    playerStats: loadout.playerStats,
    weapons,
    synergies: loadout.synergies,
    invincible: options.invincible,
  });
}

export function stepSeconds(world: World, seconds: number, input: StepInput = IDLE): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) world.step(input);
}

/** Spawns a Royal Footman at an offset from the player. Speed 0 keeps the enemy in place. */
export function footmanAt(world: World, dx: number, dy: number, still = true): Enemy {
  const enemy = spawnEnemy(world, FOOTMAN, world.player.x + dx, world.player.y + dy);
  if (!enemy) throw new Error('Enemy pool full');
  if (still) enemy.speed = 0;
  // Area queries read the grid, which the world rebuilds once per step.
  world.grid.insert(enemy.slot, enemy.x, enemy.y);
  return enemy;
}

/**
 * Test enemies. They exist only in tests, to reach rules no Milestone 3 enemy
 * shows yet: a target with no weakness, resistance or Armour, and an Artificial one.
 */
export const PLAIN_ENEMY: EnemyDef = {
  ...FOOTMAN,
  id: 'test-plain',
  name: 'Test Dummy',
  armour: 'Minimal',
  properties: ['Organic'],
  weakTo: [],
  resists: [],
};

export const ARTIFICIAL_ENEMY: EnemyDef = {
  ...PLAIN_ENEMY,
  id: 'test-artificial',
  name: 'Test Automaton',
  properties: ['Artificial', 'Mechanical', 'Metallic'],
  immune: ['Toxic', 'Biological'],
};

/** Spawns a test enemy at an offset from the player, standing still, with a set health pool. */
export function dummyAt(world: World, dx: number, dy: number, def: EnemyDef = PLAIN_ENEMY, health = 100000): Enemy {
  const enemy = spawnEnemy(world, def, world.player.x + dx, world.player.y + dy);
  if (!enemy) throw new Error('Enemy pool full');
  enemy.speed = 0;
  enemy.health = enemy.maxHealth = health;
  world.grid.insert(enemy.slot, enemy.x, enemy.y);
  return enemy;
}

/** Stops every weapon from attacking, for tests driving hits by hand. */
export function holdFire(world: World): void {
  for (const weapon of world.weapons) {
    weapon.cooldown = 1e9;
    weapon.deployTimer = 1e9;
    weapon.lightningTimer = 1e9;
  }
}
