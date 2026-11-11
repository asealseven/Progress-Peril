// Entities and events of the combat simulation.

import type { ArenaDef } from '../../data/arenas';
import type { DamageType } from '../../data/damageTypes';
import type { EnemyDef } from '../../data/enemies';
import type { PerformanceLimits } from '../../data/tiers';
import type { ResolvedWeapon } from '../loadout';
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

/** Runtime state of one equipped weapon. */
export interface WeaponState {
  readonly resolved: ResolvedWeapon;
  /** Seconds until the next attack. */
  cooldown: number;
  /** Held target (GDD 7.15). -1 means none. */
  targetSlot: number;
  targetId: number;
  /** Aim direction of the last attack, for drawing. */
  aimX: number;
  aimY: number;
  attackCount: number;
  /** Gear Train Accelerator: stacks and seconds since the last attack. */
  rampStacks: number;
  sinceAttack: number;
  /** Feedback Loop Gear: stacks and seconds left. */
  killStacks: number;
  killStackTimer: number;
  /** Prototype Overclock: seconds of jam left. */
  jamTimer: number;
  /** Grappling Line: the next hit of this attack pulls its target. */
  grappleReady: boolean;
  /** Orbit: current angle, radians. */
  orbitAngle: number;
  /** Orbit and aura: enemy id to the step when the next contact hit lands. */
  readonly contactReady: Map<number, number>;
  /** Beam: held target, ticks on the target and the end point for drawing. */
  beamTargetId: number;
  beamTicks: number;
  beamActive: boolean;
  beamX: number;
  beamY: number;
  /** Turrets: seconds until the next deployment. */
  deployTimer: number;
  lightningTimer: number;
  bayonetTimer: number;
  smokeTimer: number;
  damageDealt: number;
  kills: number;
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
  /** Threat cost in budget units (GDD 4.11). */
  threat: number;
  action: EnemyAction;
  /** Seconds left in the current wind-up or recovery. */
  actionTimer: number;
  /** Seconds of white flash left after a hit (GDD 15.3). */
  hitFlash: number;
  /** Direction faced, for the lunge animation. */
  faceX: number;
  faceY: number;
  /** Seconds of slow left, and the speed multiplier while slowed. */
  slowTimer: number;
  slowFactor: number;
  /** Seconds the enemy has lost its target, for example inside smoke. */
  confused: number;
  /** Marked status (GDD 9.14). Milestone 3 sets the flag. */
  marked: boolean;
  /** Seconds the enemy ignores further chain generations (GDD 7.20). */
  chainGuard: number;
}

export interface Projectile extends Poolable {
  kind: 'straight' | 'arcing';
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
  /** Share of weapon damage a hit deals. */
  damageScale: number;
  /** Primary hits run the weapon's on-hit effects. */
  primary: boolean;
  /** Fragments deal this damage type instead of the weapon's types. */
  forcedType: DamageType | undefined;
  pierceLeft: number;
  bouncesLeft: number;
  /** Ids of enemies already hit. */
  readonly hitIds: number[];
  /** Homing turn rate, radians per second. */
  homing: number;
  /** Radius of the blast on contact. 0 means none. */
  blastRadius: number;
  // Arcing flight.
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  flight: number;
  elapsed: number;
  /** Single-target Arcing shots follow this enemy. -1 means a fixed landing point. */
  trackSlot: number;
  trackId: number;
  /** Step of the launch, for retiring the oldest projectile at the limit. */
  born: number;
}

export type ConstructKind = 'turret' | 'hound' | 'creature';

/** Turrets and companions (GDD 7.17). They ignore manual focus. */
export interface Construct extends Poolable {
  id: number;
  kind: ConstructKind;
  weaponIndex: number;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  cooldown: number;
  targetSlot: number;
  targetId: number;
  faceX: number;
  faceY: number;
  born: number;
}

export interface Trap extends Poolable {
  weaponIndex: number;
  x: number;
  y: number;
  /** Seconds until the trap arms. */
  arming: number;
  born: number;
}

export type ZoneKind = 'burning' | 'rubble' | 'smoke';

/** Lingering area effects: pools, rubble and smoke (GDD 7.21). */
export interface Zone extends Poolable {
  kind: ZoneKind;
  weaponIndex: number;
  x: number;
  y: number;
  radius: number;
  timeLeft: number;
  duration: number;
  tick: number;
}

/** A chain explosion waiting for its step (GDD 7.20). */
export interface PendingExplosion {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly weaponIndex: number;
  /** Share of weapon damage, before the generation falloff. */
  readonly damageScale: number;
  readonly generation: number;
  /** The explosion deals Impact and Fire instead of the weapon's types (GDD 7.13). */
  readonly explosive: boolean;
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
  /** Manual focus point in arena pixels, while the focus input is held (GDD 3.4). */
  readonly focusX?: number;
  readonly focusY?: number;
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
  | { readonly type: 'playerHealed'; readonly amount: number }
  | { readonly type: 'enemySpawned'; readonly x: number; readonly y: number }
  | {
      readonly type: 'sweep' | 'cone';
      readonly x: number;
      readonly y: number;
      /** Centre angle and full arc, radians. */
      readonly angle: number;
      readonly arc: number;
      readonly radius: number;
      readonly damageType: DamageType;
    }
  | { readonly type: 'slam'; readonly x: number; readonly y: number; readonly radius: number; readonly damageType: DamageType }
  | {
      readonly type: 'thrust';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly halfWidth: number;
      readonly damageType: DamageType;
    }
  | {
      readonly type: 'explosion';
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly damageType: DamageType;
      readonly generation: number;
    }
  /** Lightning between points: x and y pairs. */
  | { readonly type: 'chain'; readonly points: readonly number[]; readonly damageType: DamageType }
  | { readonly type: 'trapSnap'; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly type: 'jam'; readonly weaponIndex: number };

export interface WorldConfig {
  readonly arena: ArenaDef;
  readonly seed: number;
  readonly round: number;
  /** Target combat duration in seconds (GDD 4.3). */
  readonly duration: number;
  readonly spawns: readonly SpawnEntry[];
  readonly playerStats: PlayerStats;
  readonly weapons: readonly ResolvedWeapon[];
  /** Adaptation carried over from earlier rounds in the territory. */
  readonly adaptation?: AdaptationMap;
  /** Performance limits (GDD 7.21). Defaults to the PC limits. */
  readonly limits?: PerformanceLimits;
  /** Debug tool: the player takes no damage. */
  readonly invincible?: boolean;
}
