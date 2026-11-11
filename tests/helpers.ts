import { ARENAS } from '../src/data/arenas';
import type { ArenaDef } from '../src/data/arenas';
import { CHARACTERS } from '../src/data/characters';
import { ENEMIES } from '../src/data/enemies';
import { WEAPONS } from '../src/data/weapons';
import { resolvePlayerStats, resolveWeaponStats } from '../src/sim/run';
import type { PlayerStats, SpawnEntry, StepInput, WorldConfig } from '../src/sim/world/types';
import { World } from '../src/sim/world/world';

export const IDLE: StepInput = { moveX: 0, moveY: 0 };
export const FOOTMAN = ENEMIES['royal-footman'];

/** An arena with no obstacles, for tests needing clear lines. */
export const OPEN_ARENA: ArenaDef = {
  ...ARENAS['great-foundry'],
  id: 'open',
  obstacles: [],
  playerStart: { x: 1200, y: 800 },
};

export interface TestWorldOptions {
  arena?: ArenaDef;
  seed?: number;
  duration?: number;
  spawns?: SpawnEntry[];
  playerStats?: Partial<PlayerStats>;
  armed?: boolean;
  invincible?: boolean;
}

export function makeWorld(options: TestWorldOptions = {}): World {
  const playerStats = { ...resolvePlayerStats(CHARACTERS.inventor), ...options.playerStats };
  const config: WorldConfig = {
    arena: options.arena ?? OPEN_ARENA,
    seed: options.seed ?? 12345,
    round: 1,
    duration: options.duration ?? 30,
    spawns: options.spawns ?? [],
    playerStats,
    weapons:
      options.armed === false
        ? []
        : [{ def: WEAPONS.crossbow, stats: resolveWeaponStats(WEAPONS.crossbow, playerStats) }],
    invincible: options.invincible,
  };
  return new World(config);
}

export function stepSeconds(world: World, seconds: number, input: StepInput = IDLE): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) world.step(input);
}
