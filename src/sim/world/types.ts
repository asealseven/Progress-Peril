// Entities and events of the combat simulation.

import type { SpecialisationRule } from '../../data/specialisations';
import type { Discipline } from '../../data/weapons';
import type { ResearchRule } from '../../data/research';
import type { EventId } from '../../data/events';
import type { RelicRule } from '../../data/relics';
import type { BossBody, BossPlan } from './bosses';
import type { HazardId } from '../../data/hazards';
import type { ArenaDef } from '../../data/arenas';
import type { ChampionTraitId } from '../../data/champions';
import type { ComponentDef } from '../../data/components';
import type { Material } from '../../data/economy';
import type { DamageType } from '../../data/damageTypes';
import type { EliteModifierId } from '../../data/eliteModifiers';
import type { EnemyDef } from '../../data/enemies';
import type { FactionName } from '../../data/palette';
import type { Reaction, StatusEffect } from '../../data/statusEffects';
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
  /** Multiplier for status meter fill, strength and duration (GDD 3.6). 1 at the base tier. */
  readonly statusPotency: number;
  /** Multiplier for Research Points gained (GDD 3.6). 1 at the base tier. */
  readonly researchYield: number;
  /** Added share for drop chances (GDD 3.6). 0 at the base tier. */
  readonly fortune: number;
  /** Multiplier for construct health and damage (GDD 3.6). 1 at the base tier. */
  readonly constructStrength: number;
  /** Multiplier for material drop chances (GDD 3.6). 1 at the base tier. */
  readonly materialYield: number;
}

/** Grand Archive effects in a round (GDD 3.8, 8.13, 11.12). */
export interface ArchivePerks {
  readonly rules: ReadonlyMap<SpecialisationRule, number>;
  /** Extra meter fill per status: the Toxicologist. */
  readonly statusFill: ReadonlyMap<StatusEffect, number>;
  /** Disciplines at Master: their rule change is on. */
  readonly masters: readonly Discipline[];
  /** The Chemistry Master status. */
  readonly masterStatus: StatusEffect;
  /** One revival waits this round (GDD 3.8). */
  readonly revival: boolean;
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
  /** Direction of the last movement, for flanking enemies (GDD 9.15). */
  faceX: number;
  faceY: number;
  /** Seconds of slow left and the speed multiplier while slowed (latching crawlers, spore clouds). */
  slowTimer: number;
  slowFactor: number;
}

/** Runtime state of one equipped weapon. */
export interface WeaponState {
  /** The numbers in use now. The Unstable swaps in the suppressed set (GDD 9.11). */
  resolved: ResolvedWeapon;
  readonly full: ResolvedWeapon;
  /** The weapon with its Auxiliary component switched off. */
  readonly suppressed: ResolvedWeapon;
  /** The weapon inside a Null Field: no synergies, no Auxiliary component (GDD 10.3). */
  readonly nulled: ResolvedWeapon;
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
  /** Steady Hand: ids of enemies this weapon has hit. */
  readonly firstHits: Set<number>;
  damageDealt: number;
  kills: number;
}

/**
 * What the enemy's body is doing. Every attack runs wind-up, strike and
 * recovery (GDD 9.15). cast is the wind-up of an ability, charge a dash,
 * stall a Gear Lancer after a wall hit, dormant a sleeping Ancient Guardian.
 */
export type EnemyAction = 'chase' | 'windup' | 'charge' | 'recover' | 'cast' | 'stall' | 'dormant';

/** The six actions an enemy scores (GDD 9.15). */
export type AiAction = 'attack' | 'protect' | 'retreat' | 'regroup' | 'flank' | 'ability';

export type EnemyRank = 'normal' | 'elite' | 'champion';

export type AbilityKind = 'repair' | 'deploy' | 'spores' | 'mine' | 'teleport';

/** Squad goals set by the encounter director (GDD 9.15). */
export type SquadOrder = 'Surround' | 'Pin' | 'Protect';

/** A squad's shared blackboard: leader orders, formation and target data (GDD 9.15). */
export interface Squad {
  readonly id: number;
  order: SquadOrder;
  readonly faction: FactionName;
  /** Enemy id of the leader. -1 for a squad with no leader. */
  leaderId: number;
  leaderSlot: number;
  /** False after the leader dies: the squad keeps the last order and loses formation bonuses. */
  leaderAlive: boolean;
  members: number;
  /** Centre of the living members. */
  x: number;
  y: number;
  /** Step of the next volley called by the leader. */
  volleyAt: number;
  /** Members holding formation slots so far. */
  slots: number;
}

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
  /** Seconds left in the current wind-up, cast, stall or recovery. */
  actionTimer: number;
  /** Full length of the current wind-up or cast, for drawing the telegraph. */
  actionDuration: number;

  // Rank (GDD 9.3, 9.12, 9.13).
  rank: EnemyRank;
  readonly modifiers: EliteModifierId[];
  /** Elite modifiers as bit flags, in ELITE_MODIFIER_IDS order. */
  modifierBits: number;
  championTrait: ChampionTraitId | undefined;
  /** Signature traits as bit flags. */
  traitBits: number;

  // Decisions (GDD 9.15).
  ai: AiAction;
  /** Step of the next utility scoring. */
  decideAt: number;
  squad: number;
  formationSlot: number;
  /** The enemy holds an attack token. */
  hasToken: boolean;
  flankSlot: number;
  /** Desired movement this step: direction times a speed share from 0 to 1. */
  moveX: number;
  moveY: number;
  /** Territorial enemies defend this point. */
  homeX: number;
  homeY: number;
  /** Side an enemy circles toward while waiting: 1 or -1. */
  strafe: number;
  /** Ally the enemy guards or repairs. -1 means none. */
  wardSlot: number;
  wardId: number;

  // Attacks and abilities.
  attackCooldown: number;
  /** Speed of wind-up and recovery. Swift and Overclocked raise the rate. */
  attackRate: number;
  /** Damage type of this enemy's attacks. A Rogue Inventor rolls one at spawn. */
  attackType: DamageType;
  /** Target point of the current attack, for telegraphs. */
  aimX: number;
  aimY: number;
  /** Pixels left in a charge, and whether the charge has hit the player. */
  chargeLeft: number;
  chargeHit: boolean;
  /** Id of the last construct a charge ran over. */
  runOverId: number;
  ability: AbilityKind | undefined;
  /** Seconds until the first and the second ability are ready. */
  abilityCooldown: number;
  abilityCooldown2: number;

  // Trait state.
  sinceDamage: number;
  retreatTimer: number;
  /** Position of the last acid drop. */
  trailX: number;
  trailY: number;
  carriedGold: number;
  summoned: number;
  /** Seconds until the Anomaly's resistance shifts, and the position in the cycle. */
  shiftTimer: number;
  shiftIndex: number;
  /** Damage type resisted now: Resistant elites and Anomalies. */
  resistType: DamageType | undefined;
  /** Status a Hardened elite ignores. */
  hardened: StatusEffect | undefined;
  mutated: boolean;
  /** Sprouted Thornlings and split copies leave nothing behind on death. */
  noLegacy: boolean;
  /** Speed before Swift and Overclocked. */
  baseSpeed: number;

  // Champion state (GDD 9.13).
  purifyTimer: number;
  burstDamage: number;
  burstTimer: number;
  plateTimer: number;
  plateType: DamageType | undefined;
  /** Damage taken per type since the last Reactive Plating check, in DAMAGE_TYPES order. */
  readonly typeTaken: number[];

  // Boss state (GDD 10.4, 10.5). Undefined for every other enemy.
  boss: BossBody | undefined;
  /** Damage taken as a multiplier: 0 during a phase transition or for a decoy copy, more for an exposed core. */
  takenFactor: number;
  /** Weaknesses added by a boss phase: Glowing Plate, Overload, an exposed core. */
  extraWeak: readonly DamageType[];
  /** The Thornback Matriarch's thorn shell: the front resists all but Fire, the rear is weak. */
  thornShell: boolean;
  thresholdIndex: number;
  overclocked: boolean;

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
  /** True while the Marked status is active (GDD 9.14). */
  marked: boolean;
  /** Seconds the enemy ignores further chain generations (GDD 7.20). */
  chainGuard: number;
  /** Velocity over the last step, pushes included, for shots leading the target. */
  vx: number;
  vy: number;
  /** Position at the start of the last step. */
  prevX: number;
  prevY: number;

  // Status meters (GDD 9.14). One entry per status, in STATUS_EFFECTS order.
  /** Meter fill, from 0 to the meter size. */
  readonly statusMeter: number[];
  /** Seconds of the active effect left. 0 means inactive. */
  readonly statusActive: number[];
  /** Weapon index credited with the active effect. */
  readonly statusSource: number[];
  /** Seconds until the next damage tick. */
  readonly statusTick: number[];
  /** Damage per tick. */
  readonly statusDamage: number[];
  /** Seconds since the last build-up. */
  readonly statusSince: number[];
  /** Chain generation of the active effect, for spreading infections (GDD 7.20). */
  readonly statusGeneration: number[];
  /** Meter size multiplier by rank: Normal 1, Elite 2, Champion 3, Boss 5. */
  meterScale: number;
  /** The Stun meter grows after each stun. */
  stunGrowth: number;
  fumesCooldown: number;
  septicTimer: number;
  /** Kill Zone: seconds the enemy counts as trapped. */
  trapped: number;
  /** Combined Arms: seconds the enemy counts as recently hit by melee. */
  meleeMark: number;
  /** Passive reactions already announced, as bit flags. */
  reactionFlags: number;
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
  /** Shots from turrets roll critical hits only with Clockwork Precision. */
  fromConstruct: boolean;
  /** Parasite Larvae: the projectile infects the first enemy touched and deals no damage. */
  parasite: boolean;
  /** Chemical Ballistics: pixels travelled since the last trail drop. */
  trailDistance: number;
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

/** Enemy projectiles lean dark ink (GDD 15.1). */
export interface EnemyShot extends Poolable {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  radius: number;
  damage: number;
  damageType: DamageType;
  distanceLeft: number;
}

/**
 * Enemy area effects: acid trails, toxic pools, burning ground, spore pods and
 * clouds, mines, Thornling seeds and shockwave rings.
 */
export type HazardKind = 'acid' | 'toxic' | 'burning' | 'spores' | 'pod' | 'mine' | 'seed' | 'shockwave';

export interface Hazard extends Poolable {
  kind: HazardKind;
  x: number;
  y: number;
  /** Current radius. A shockwave grows each step. */
  radius: number;
  timeLeft: number;
  duration: number;
  /** Seconds until the next damage tick. */
  tick: number;
  damage: number;
  damageType: DamageType;
  /** Mines: seconds until armed. */
  arming: number;
  /** Seeds: the enemy that sprouts. */
  sprout: EnemyDef | undefined;
  born: number;
}

/** Gold, materials and components on the ground (GDD 14.1, 14.2). */
export interface Pickup extends Poolable {
  kind: 'gold' | 'material' | 'component' | 'herb';
  x: number;
  y: number;
  amount: number;
  material: Material;
  component: ComponentDef | undefined;
  /** Inside Pickup Radius once: the pickup flies to the player. */
  attracted: boolean;
}

/** An enemy blast waiting for its step, so death bursts never recurse (GDD 7.20). */
export interface PendingBlast {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly damage: number;
  readonly damageType: DamageType;
  /** The blast hurts other enemies too. */
  readonly hurtsEnemies: boolean;
}

export type ZoneKind = 'burning' | 'rubble' | 'smoke' | 'fumes' | 'trail';

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

export interface SpawnMember {
  readonly enemy: EnemyDef;
  readonly count: number;
  readonly rank?: EnemyRank;
}

/** How a group enters the arena (GDD 4.7). */
export type Formation = 'cluster' | 'line' | 'pincer' | 'ring';

/** One scheduled spawn from the encounter director. Every member enters as one squad. */
export interface SpawnEntry {
  /** Seconds from the start of the round. */
  readonly time: number;
  readonly enemy: EnemyDef;
  readonly count: number;
  readonly rank?: EnemyRank;
  readonly kind: 'trickle' | 'group' | 'assault';
  /** More members entering with the first. */
  readonly with?: readonly SpawnMember[];
  readonly order?: SquadOrder;
  readonly formation?: Formation;
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
  | { readonly type: 'hazardBurst'; readonly hazard: HazardId; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly type: 'hazardArc'; readonly fromX: number; readonly fromY: number; readonly toX: number; readonly toY: number }
  | { readonly type: 'tilesErased'; readonly stage: number }
  | { readonly type: 'bossPhase'; readonly x: number; readonly y: number; readonly name: string; readonly phase: number; readonly role: string }
  | { readonly type: 'bossStrike'; readonly x: number; readonly y: number; readonly radius: number; readonly damageType: DamageType }
  | { readonly type: 'bossWave'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly damageType: DamageType }
  | { readonly type: 'bossNull'; readonly x: number; readonly y: number; readonly radius: number }
  | { readonly type: 'bossRepair'; readonly x: number; readonly y: number }
  | { readonly type: 'bossDefeated'; readonly x: number; readonly y: number; readonly name: string }
  | { readonly type: 'revived' }
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
  /** A status meter filled and the effect began (GDD 9.14). */
  | { readonly type: 'status'; readonly status: StatusEffect; readonly x: number; readonly y: number }
  | { readonly type: 'reaction'; readonly reaction: Reaction; readonly x: number; readonly y: number }
  | { readonly type: 'jam'; readonly weaponIndex: number }
  /** A large group enters here soon (GDD 4.11). */
  | { readonly type: 'spawnWarning'; readonly x: number; readonly y: number; readonly count: number }
  | {
      readonly type: 'enemyBlast';
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly damageType: DamageType;
    }
  | { readonly type: 'teleport'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: 'repair'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly type: 'goldStolen'; readonly amount: number; readonly x: number; readonly y: number }
  | { readonly type: 'goldReturned'; readonly amount: number; readonly x: number; readonly y: number }
  | { readonly type: 'constructDestroyed'; readonly x: number; readonly y: number }
  /** The Unstable switched Auxiliary components off or on (GDD 9.11). */
  | { readonly type: 'suppressed'; readonly active: boolean }
  | { readonly type: 'mutated'; readonly x: number; readonly y: number; readonly modifier: EliteModifierId }
  | {
      readonly type: 'pickup';
      readonly kind: 'gold' | 'material' | 'component' | 'herb';
      readonly amount: number;
      readonly x: number;
      readonly y: number;
    };

export interface WorldConfig {
  readonly arena: ArenaDef;
  readonly seed: number;
  readonly round: number;
  /** Target combat duration in seconds (GDD 4.3). */
  readonly duration: number;
  readonly spawns: readonly SpawnEntry[];
  readonly playerStats: PlayerStats;
  readonly weapons: readonly ResolvedWeapon[];
  /** The same weapons with Auxiliary components switched off, for The Unstable (GDD 9.11). */
  readonly suppressedWeapons?: readonly ResolvedWeapon[];
  /** Most enemies alive at once (GDD 4.11). Defaults to the limit for the round. */
  readonly activeLimit?: number;
  /** Gold carried into the round. Highwaymen steal from this (GDD 9.11). */
  readonly gold?: number;
  /** Ids of every active synergy (GDD 7.19). */
  readonly synergies?: readonly string[];
  /** Adaptation carried over from earlier rounds in the territory. */
  readonly adaptation?: AdaptationMap;
  /** Performance limits (GDD 7.21). Defaults to the PC limits. */
  readonly limits?: PerformanceLimits;
  /** Debug tool: the player takes no damage. */
  readonly invincible?: boolean;
  /** Named research rules and how many researched nodes carry each (GDD 8.12). */
  readonly research?: ReadonlyMap<ResearchRule, number>;
  /** Round within the territory, 1 to 7, for arena changes (GDD 5.9). Defaults from the round. */
  readonly localRound?: number;
  /** The territory event running this round (GDD 5.11). */
  readonly event?: EventId;
  /** Grand Archive effects (GDD 3.8, 8.13, 11.12). */
  readonly perks?: ArchivePerks;
  /** Enemy Health and Damage steps from Challenge Tiers, Assist mode and endless loops (GDD 3.9, 13.3). */
  readonly enemySteps?: { readonly health: number; readonly damage: number };
  /** Enemy ids to spawn as the trial's priority target (GDD 3.11). */
  readonly priorityTarget?: string;
  /** Relic rules held, with their summed amounts (GDD 5.12). */
  readonly relicRules?: ReadonlyMap<RelicRule, number>;
  /** The round's mini-boss, or boss and escort (GDD 4.10). */
  readonly bosses?: BossPlan;
  /** The weapons with synergies and Auxiliary components switched off, for the Null Field (GDD 10.3). */
  readonly nulledWeapons?: readonly ResolvedWeapon[];
}
