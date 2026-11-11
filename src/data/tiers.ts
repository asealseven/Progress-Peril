// Tier names and the starting numbers from CLAUDE.md "Turning tiers into numbers".
// Milestone 12 tunes these values.

export const TIERS = ['Minimal', 'Low', 'Medium', 'High', 'Extreme'] as const;
export type Tier = (typeof TIERS)[number];
export type TierTable = Readonly<Record<Tier, number>>;

function row(minimal: number, low: number, medium: number, high: number, extreme: number): TierTable {
  return { Minimal: minimal, Low: low, Medium: medium, High: high, Extreme: extreme };
}

export const TIER_TABLES = {
  /** Enemy Health in Territory 1. */
  enemyHealth: row(6, 15, 35, 90, 400),
  /** Enemy Damage per hit. */
  enemyDamage: row(2, 4, 7, 12, 20),
  /** Enemy Speed, pixels per second. */
  enemySpeed: row(40, 70, 100, 140, 200),
  /** Enemy attack Range, pixels. */
  enemyRange: row(30, 120, 250, 400, 550),
  /** Armour, damage reduction for enemies and the player. */
  armour: row(0, 0.1, 0.25, 0.4, 0.6),
  /** Weapon Damage per hit. */
  weaponDamage: row(4, 7, 12, 20, 35),
  /** Weapon Attack Speed, attacks per second. */
  weaponAttackSpeed: row(0.4, 0.7, 1.1, 1.8, 3.0),
  /** Weapon Range, pixels. */
  weaponRange: row(60, 120, 220, 340, 480),
  /** Weapon Area radius, pixels. Minimal means single target. */
  weaponArea: row(0, 30, 55, 85, 120),
  playerMaxHealth: row(60, 90, 120, 160, 220),
  /** Player Move Speed, pixels per second. */
  playerMoveSpeed: row(140, 170, 200, 240, 280),
  /** Regeneration, health per second. */
  regeneration: row(0.2, 0.5, 1, 2, 3.5),
  evasion: row(0.03, 0.08, 0.15, 0.22, 0.3),
  criticalChance: row(0.02, 0.05, 0.1, 0.2, 0.35),
  /** Critical Damage multiplier. */
  criticalDamage: row(1.25, 1.5, 1.75, 2.0, 2.5),
  /** Pickup Radius, pixels. */
  pickupRadius: row(40, 70, 110, 160, 230),
  /** Status Build-up per hit, share of a Normal enemy meter. */
  statusBuildUp: row(0.1, 0.2, 0.33, 0.5, 0.8),
  /** Modifier size for "up" or "down" effects. */
  modifierSize: row(0.05, 0.1, 0.2, 0.35, 0.6),
} as const;

export type TierStat = keyof typeof TIER_TABLES;

export function tierIndex(tier: Tier): number {
  return TIERS.indexOf(tier);
}

export function tierValue(stat: TierStat, tier: Tier): number {
  return TIER_TABLES[stat][tier];
}

/** Moves a tier by a number of steps, clamped to Minimal and Extreme. */
export function stepTier(tier: Tier, steps: number): Tier {
  const index = Math.min(TIERS.length - 1, Math.max(0, tierIndex(tier) + steps));
  return TIERS[index] ?? tier;
}

/** Each step above Extreme multiplies the Extreme value by this factor (GDD 9.10). */
export const ABOVE_EXTREME_FACTOR = 2.5;

/**
 * Tier value after a shift of whole steps. Steps past Extreme multiply the
 * Extreme value by 2.5 each, as territory scaling needs (GDD 9.10).
 */
export function scaledTierValue(stat: TierStat, tier: Tier, steps: number): number {
  const target = tierIndex(tier) + steps;
  const top = TIERS.length - 1;
  if (target <= top) return tierValue(stat, stepTier(tier, steps));
  return tierValue(stat, 'Extreme') * ABOVE_EXTREME_FACTOR ** (target - top);
}

/** Stacked Armour approaches this reduction without reaching the limit (GDD 3.7). */
export const ARMOUR_LIMIT = 0.75;

/** Damage adaptation (GDD 3.7). */
export const ADAPTATION = {
  /** Resistance gained per hit taken. */
  perHit: 0.005,
  /** The Low cap. */
  baseCap: 0.1,
  /** Each extra cap step. */
  capStep: 0.05,
} as const;

/** Status meters (GDD 9.14). Sizes are multiples of a Normal enemy meter. */
export const STATUS_METER = {
  elite: 2,
  champion: 3,
  boss: 5,
  /** Share of the meter drained per second without build-up. */
  drainPerSecond: 0.1,
} as const;

/** Elite and champion Health steps on top of territory scaling (GDD 9.12, 9.13). */
export const RANK_HEALTH_STEPS = { elite: 1, champion: 2 } as const;

export const TERRITORY_HEALTH_FACTOR = [1, 2, 3.5] as const;
export const MINI_BOSS_HEALTH = 1200;
export const MINI_BOSS_ESCORT_SHARE = 0.7;
export const TERRITORY_BOSS_HEALTH = 4000;

/** Threat units in Round 1 (GDD 14.3). */
export const ROUND_ONE_THREAT = 40;

/** Budget units per threat tier (GDD 4.11). */
export const THREAT_COST: TierTable = row(1, 2, 4, 8, 16);

/** Each arena measures 2400 by 1600 logical pixels. */
export const ARENA_SIZE = { width: 2400, height: 1600 } as const;

/** Placeholder radii by role (CLAUDE.md "Placeholder art"). */
export const PLACEHOLDER_RADIUS = {
  swarmer: 10,
  standard: 14,
  tank: 22,
  miniBoss: 36,
  boss: 56,
} as const;

/**
 * Combat values with no number in GDD.md or CLAUDE.md. NOTES.md records each
 * choice. Milestone 12 tunes them with the tier tables.
 */
export const COMBAT = {
  /** Simulation steps per second (GDD 15.14). */
  stepsPerSecond: 60,
  /** Fast-forward speed (GDD 3.12). */
  fastForward: 1.5,
  playerRadius: 16,
  /** Invulnerability window after a hit, seconds (GDD 3.7). */
  playerInvulnerability: 0.5,
  /** Straight projectile speed, pixels per second. */
  projectileSpeed: 700,
  projectileRadius: 4,
  /** Delay before a weapon first fires in a round, seconds. */
  weaponStartDelay: 0.4,
  /** Melee enemy wind-up before a strike, seconds (GDD 15.3). */
  enemyMeleeWindup: 0.45,
  /** Melee enemy pause after a strike, seconds. */
  enemyMeleeRecover: 0.9,
  /** Enemies spawn at least this far from the player, outside the camera view (GDD 4.11). */
  spawnMinDistance: 900,
  /** Enemies in one group spawn inside this radius. */
  spawnGroupSpread: 70,
} as const;

/** Knockback push per hit, pixels, for "Knockback up" effects (GDD 7.14). Sources add. */
export const KNOCKBACK_PIXELS: TierTable = row(5, 10, 20, 35, 60);

/**
 * Weapon and component numbers with no value in GDD.md (GDD 7.16 to 7.18).
 * NOTES.md records each choice. Milestone 12 tunes them.
 */
export const WEAPON_RULES = {
  // Shapes from the Range and Area stats.
  /** Sweep arc in degrees: base plus one degree per Area pixel. */
  sweepArcBase: 40,
  sweepArcPerArea: 1,
  /** Cone arc in degrees: base plus a share of Area. */
  coneArcBase: 20,
  coneArcPerArea: 0.6,
  /** Thrust half-width in pixels: base plus half of Area. */
  thrustHalfWidthBase: 10,
  thrustHalfWidthPerArea: 0.5,
  /** Single-target landings and bites reach this far from the impact point. */
  singleTargetReach: 24,
  /** Smallest radius the Clustered rule counts enemies in. */
  clusterRadiusMin: 40,
  /** Area widens non-blast projectiles: extra radius per Area pixel. */
  projectileRadiusPerArea: 0.2,
  /** Aura radius: half of Range plus Area. */
  auraRangeShare: 0.5,
  /** Orbit radius: a share of Range, with an upper limit. */
  orbitRangeShare: 0.75,
  orbitRadiusMax: 150,
  orbitHeadBase: 10,
  orbitHeadPerArea: 0.25,
  /** Orbit turns per second: a share of Attack Speed, inside limits. */
  orbitTurnsPerAttack: 0.5,
  orbitTurnsMin: 0.5,
  orbitTurnsMax: 2,
  /** Fan angle added per extra projectile on a weapon with no fan, degrees. */
  extraProjectileSpread: 8,
  /** Extra Arcing projectiles land this far from the target point. */
  arcingScatter: 36,
  arcingSpeed: 420,
  arcingMinFlight: 0.35,
  /** Homing turn rates, radians per second. */
  homingStrong: 5,
  homingSlight: 1.6,
  homingSeekRange: 320,
  ricochetRange: 220,
  /** Chain jumps (GDD 7.20): reach, damage kept per generation and depth limit. */
  chainRange: 160,
  chainFalloff: 0.75,
  chainDepthLimit: 4,
  /** Seconds an enemy ignores further chain generations after a chain hit. */
  chainGuardSeconds: 0.25,
  /** Beam damage rises by this share per tick on one target, up to the cap. */
  beamRampPerTick: 0.1,
  beamRampCap: 1,
  burningPoolTicksPerSecond: 2,
  burningPoolDamageShare: 0.25,
  /** Speed multiplier for enemies on rubble. */
  rubbleSlow: 0.6,
  killExplosionAreaShare: 0.6,
  killExplosionDamageShare: 0.6,
  turretLimit: 2,
  turretHealth: 40,
  turretDeploySeconds: 4,
  turretReplaceDistance: 450,
  companionSpeed: 230,
  companionHealth: 60,
  companionLeashExtra: 60,
  companionRadius: 10,
  trapLimit: 6,
  trapSpacing: 70,
  trapTriggerRadius: 20,
  trapArmSeconds: 0.4,
  /** Living Arsenal adapts each round: one Minimal step of Damage, capped at High. */
  adaptPerRound: 'Minimal',
  adaptCap: 'High',

  // Components.
  explodeOnHitRadius: 30,
  explodeOnHitDamageShare: 0.5,
  explodeOnKillRadius: 30,
  explodeOnKillDamageShare: 0.5,
  arcOnHitDamageShare: 0.5,
  pullRadius: 90,
  pullDistance: 24,
  /** "Small enemies" for Magnetite Slugs: radius up to the standard placeholder. */
  smallEnemyRadius: 14,
  slowFactor: 0.7,
  slowSeconds: 1.5,
  grappleDistance: 40,
  healOnKill: 1,
  /** Feedback Loop Gear: Attack Speed per kill, duration and cap. */
  killStackSize: 'Minimal',
  killStackSeconds: 3,
  killStackCap: 'High',
  /** Gear Train Accelerator: Attack Speed per attack, cap and reset pause. */
  rampStepSize: 'Minimal',
  rampCap: 'High',
  rampResetSeconds: 1.5,
  jamChance: 0.05,
  jamSeconds: 1.5,
  lightningSeconds: 4,
  lightningDamage: 'Medium',
  lightningRange: 220,
  lightningJumps: 3,
  smokeRadius: 90,
  smokeSeconds: 3,
  smokeCooldown: 8,
  bayonetReach: 26,
  bayonetDamage: 'Low',
  bayonetSeconds: 1,
  fragmentCount: 8,
  fragmentDamageShare: 0.25,
  fragmentRange: 160,
  constructRepairPerSecond: 0.03,
  spreadDownFactor: 0.5,
  /** Size used where GDD 7.18 gives a direction with no tier, such as "Faster projectiles". */
  unsizedTier: 'Medium',
} as const;

/** Performance limits (GDD 7.21). Milestone 12 sets final numbers from profiling. */
export const PERFORMANCE_LIMITS = {
  pc: { projectiles: 400, areaEffects: 30, constructs: 6, traps: 18, chainEventsPerStep: 12 },
  mobile: { projectiles: 250, areaEffects: 16, constructs: 6, traps: 12, chainEventsPerStep: 6 },
} as const;

export type PerformanceLimits = { readonly [K in keyof (typeof PERFORMANCE_LIMITS)['pc']]: number };

/** Player stat caps as tiers (GDD 3.6), for the stats Milestone 2 changes. */
export const PLAYER_STAT_CAPS = {
  armour: 'High',
  evasion: 'Medium',
} as const;
