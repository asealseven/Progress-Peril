// Entities and events of the combat simulation.

import type { ArenaDef } from '../../data/arenas';
import type { DamageType } from '../../data/damageTypes';
import type { EnemyDef } from '../../data/enemies';
import type { WeaponDef } from '../../data/weapons';
import type { Poolable } from './pool';

/** Resolved player numbers for one round. */
export interface PlayerStats {
  readonly maxHealth: number;
  /** Damage reduction, 0 to 1. */
  readonly armour: number;
  /** Health per second. */
  readonly regeneration: number;
  readonly evasion: number;
  /** Pixels per second. */
  readonly moveSpeed: number;
  readonly pickupRadius: number;
  readonly criticalChance: number;
  readonly criticalDamage: number;
  readonly adaptationPerHit: number;
  readonly adaptationCap: number;
}

export type AdaptationMap = Partial<Record<DamageType, number>>;

export interface PlayerState {
  x: number;
  y: number;
  /** Velocity of the last step, pixels per second. */
  vx: number;
  vy: number;
  readonly radius: number;
  health: number;
  readonly stats: PlayerStats;
  /** Seconds of invulnerability left after a hit (GDD 3.7). */
  invulnerable: number;
  /** Resistance per damage type, built by taking hits (GDD 3.7). */
  adaptation: AdaptationMap;
}

/** Resolved weapon numbers for one round. */
export interface WeaponStats {
  readonly damage: number;
  readonly attacksPerSecond: number;
  readonly range: number;
  readonly area: number;
  readonly criticalChance: number;
  readonly criticalDamage: number;
}

export interface WeaponState {
  readonly def: WeaponDef;
  readonly stats: WeaponStats;
  /** Seconds until the next attack. */
  cooldown: number;
  /** Held target (GDD 7.15). -1 means none. */
  targetSlot: number;
  targetId: number;
  /** Aim direction of the last attack, for drawing. */
  aimX: number;
  aimY: number;
}

export type EnemyAction = 'chase' | 'windup' | 'recover';

export interface Enemy extends Poolable {
  /** Unique per spawn. A reused slot gets a new id. */
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  /** Damage reduction, 0 to 1. */
  armour: number;
  damage: number;
  /** Pixels per second. */
  speed: number;
  /** Attack range, measured from edge to edge. */
  range: number;
  action: EnemyAction;
  /** Seconds left in the current wind-up or recovery. */
  actionTimer: number;
  /** Seconds of white flash left after a hit (GDD 15.3). */
  hitFlash: number;
  /** Direction faced, for the lunge animation. */
  faceX: number;
  faceY: number;
}

export interface Projectile extends Poolable {
  x: number;
  y: number;
  /** Unit direction. */
  dx: number;
  dy: number;
  speed: number;
  radius: number;
  /** Pixels left before the projectile ends. */
  distanceLeft: number;
  /** Index of the weapon in the player's weapon list. */
  weaponIndex: number;
}

/** One scheduled spawn from the encounter director. */
export interface SpawnEntry {
  /** Seconds from the start of the round. */
  readonly time: number;
  readonly enemy: EnemyDef;
  readonly count: number;
  readonly kind: 'trickle' | 'group' | 'assault';
}

export interface StepInput {
  /** Movement direction. Length 0 to 1. */
  readonly moveX: number;
  readonly moveY: number;
}

export type WorldPhase = 'running' | 'cleared' | 'defeat';

export interface RoundStats {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  hitsTaken: number;
  hitsEvaded: number;
  shotsFired: number;
  criticalHits: number;
}

/** Things a scene draws or plays once: sparks, splatters, sounds. */
export type WorldEvent =
  | { readonly type: 'shot'; readonly weaponIndex: number; readonly x: number; readonly y: number }
  | {
      readonly type: 'enemyHit';
      readonly x: number;
      readonly y: number;
      readonly amount: number;
      readonly critical: boolean;
      readonly damageType: DamageType;
    }
  | { readonly type: 'enemyKilled'; readonly x: number; readonly y: number; readonly enemyId: string }
  | { readonly type: 'projectileBlocked'; readonly x: number; readonly y: number }
  | { readonly type: 'playerHit'; readonly amount: number; readonly damageType: DamageType }
  | { readonly type: 'playerEvaded' }
  | { readonly type: 'enemySpawned'; readonly x: number; readonly y: number };

export interface WorldConfig {
  readonly arena: ArenaDef;
  readonly seed: number;
  readonly round: number;
  /** Target combat duration in seconds (GDD 4.3). */
  readonly duration: number;
  readonly spawns: readonly SpawnEntry[];
  readonly playerStats: PlayerStats;
  readonly weapons: ReadonlyArray<{ readonly def: WeaponDef; readonly stats: WeaponStats }>;
  /** Adaptation carried over from earlier rounds in the territory. */
  readonly adaptation?: AdaptationMap;
  /** Debug tool: the player takes no damage. */
  readonly invincible?: boolean;
}
