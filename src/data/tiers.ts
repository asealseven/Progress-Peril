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
