// Run state: the campaign between rounds. Milestone 1 holds one territory,
// one weapon and no economy. Later milestones add kingdoms, resources,
// weapons, components and relics.

import { ARENAS } from '../data/arenas';
import type { ArenaDef } from '../data/arenas';
import type { CharacterDef } from '../data/characters';
import { ENEMIES } from '../data/enemies';
import { roundDuration } from '../data/rounds';
import { ADAPTATION, tierValue } from '../data/tiers';
import type { WeaponDef } from '../data/weapons';
import { planRound } from './director';
import { Rng } from './rng';
import type { AdaptationMap, PlayerStats, RoundStats, WeaponStats } from './world/types';
import { World } from './world/world';

/**
 * Rounds playable in the current build. Milestone 1 ends after three
 * encounter rounds, before the first mini-boss round (GDD 4.2).
 */
export const PLAYABLE_ROUNDS = 3;

export type RunStatus = 'active' | 'dead' | 'complete';

export interface RoundResult {
  readonly round: number;
  readonly survived: boolean;
  /** Seconds of combat. */
  readonly seconds: number;
  readonly stats: Readonly<RoundStats>;
}

export interface RunState {
  readonly seed: number;
  readonly character: CharacterDef;
  readonly weapons: WeaponDef[];
  readonly arena: ArenaDef;
  /** The round about to start or in progress, from 1. */
  round: number;
  status: RunStatus;
  /** Adaptation lasts for a territory (GDD 3.7). */
  adaptation: AdaptationMap;
  readonly history: RoundResult[];
}

export function createRun(seed: number, character: CharacterDef, startingWeapon: WeaponDef): RunState {
  return {
    seed: seed >>> 0,
    character,
    weapons: [startingWeapon],
    arena: ARENAS['great-foundry'],
    round: 1,
    status: 'active',
    adaptation: {},
    history: [],
  };
}

/** Player numbers from the character's base tiers (GDD 3.6). */
export function resolvePlayerStats(character: CharacterDef): PlayerStats {
  const base = character.baseStats;
  return {
    maxHealth: tierValue('playerMaxHealth', base.maxHealth),
    armour: tierValue('armour', base.armour),
    regeneration: tierValue('regeneration', base.regeneration),
    evasion: tierValue('evasion', base.evasion),
    moveSpeed: tierValue('playerMoveSpeed', base.moveSpeed),
    pickupRadius: tierValue('pickupRadius', base.pickupRadius),
    criticalChance: tierValue('criticalChance', base.criticalChance),
    criticalDamage: tierValue('criticalDamage', base.criticalDamage),
    adaptationPerHit: ADAPTATION.perHit,
    adaptationCap: ADAPTATION.baseCap,
  };
}

/** Weapon numbers from the weapon's tiers (GDD 7.14) and the player's critical stats. */
export function resolveWeaponStats(weapon: WeaponDef, player: PlayerStats): WeaponStats {
  return {
    damage: tierValue('weaponDamage', weapon.damage),
    attacksPerSecond: tierValue('weaponAttackSpeed', weapon.attackSpeed),
    range: tierValue('weaponRange', weapon.range),
    area: tierValue('weaponArea', weapon.area),
    criticalChance: weapon.criticalChance
      ? tierValue('criticalChance', weapon.criticalChance)
      : player.criticalChance,
    criticalDamage: player.criticalDamage,
  };
}

/** Builds the combat simulation for the run's current round. */
export function createWorldForRound(run: RunState): World {
  // One generator per round, so a round replays the same way from the run seed.
  const roundRng = new Rng(run.seed).fork(run.round);
  const playerStats = resolvePlayerStats(run.character);
  return new World({
    arena: run.arena,
    seed: roundRng.int(0, 0xffffffff),
    round: run.round,
    duration: roundDuration(run.round),
    spawns: planRound(run.round, ENEMIES['royal-footman'], roundRng),
    playerStats,
    weapons: run.weapons.map((def) => ({ def, stats: resolveWeaponStats(def, playerStats) })),
    adaptation: run.adaptation,
  });
}

/** Records a finished round and moves the run on. The player heals in full before the next round (GDD 3.7). */
export function finishRound(run: RunState, world: World): RoundResult {
  const survived = world.phase === 'cleared';
  const result: RoundResult = {
    round: run.round,
    survived,
    seconds: world.elapsed,
    stats: { ...world.stats },
  };
  run.history.push(result);
  run.adaptation = { ...world.player.adaptation };

  if (!survived) {
    run.status = 'dead';
  } else if (run.round >= PLAYABLE_ROUNDS) {
    run.status = 'complete';
  } else {
    run.round++;
  }
  return result;
}

/** Totals across every round played so far. */
export function runTotals(run: RunState): RoundStats & { seconds: number; roundsSurvived: number } {
  const totals = {
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    hitsTaken: 0,
    hitsEvaded: 0,
    shotsFired: 0,
    criticalHits: 0,
    seconds: 0,
    roundsSurvived: 0,
  };
  for (const result of run.history) {
    totals.kills += result.stats.kills;
    totals.damageDealt += result.stats.damageDealt;
    totals.damageTaken += result.stats.damageTaken;
    totals.hitsTaken += result.stats.hitsTaken;
    totals.hitsEvaded += result.stats.hitsEvaded;
    totals.shotsFired += result.stats.shotsFired;
    totals.criticalHits += result.stats.criticalHits;
    totals.seconds += result.seconds;
    if (result.survived) totals.roundsSurvived++;
  }
  return totals;
}
