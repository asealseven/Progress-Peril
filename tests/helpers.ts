import { ARENAS } from '../src/data/arenas';
import type { ArenaDef } from '../src/data/arenas';
import { CHARACTERS } from '../src/data/characters';
import { componentByName } from '../src/data/components';
import { ENEMIES } from '../src/data/enemies';
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
}

export function makeWorld(options: TestWorldOptions = {}): World {
  const base = { ...BASE_STATS, ...options.playerStats };
  const instances = options.armed === false ? [] : (options.weapons ?? [arm('Crossbow')]);
  const loadout = resolveLoadout(instances, base);
  const weapons = options.noCriticals
    ? loadout.weapons.map((weapon) => ({ ...weapon, criticalChance: 0 }))
    : loadout.weapons;
  return new World({
    arena: options.arena ?? OPEN_ARENA,
    seed: options.seed ?? 12345,
    round: 1,
    duration: options.duration ?? 30,
    spawns: options.spawns ?? HOLD_OPEN,
    playerStats: loadout.playerStats,
    weapons,
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
  return enemy;
}
