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
  /**
   * Status Build-up per hit, share of a Normal enemy meter. Medium is one third
   * (33 per cent in CLAUDE.md), so three Medium hits fill a meter (GDD 9.14).
   */
  statusBuildUp: row(0.1, 0.2, 1 / 3, 0.5, 0.8),
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

/** One damage step for a weakness or a resistance (GDD 9.11). Immune means no damage and no status. */
export const DAMAGE_STEP = { weak: 1.7, resist: 0.6 } as const;

/**
 * Status effect numbers with no value in GDD.md (GDD 9.14). Damage over time
 * is a share of the triggering weapon's damage per hit, spread over the duration.
 */
export const STATUS_RULES = {
  /** Seconds between damage ticks. */
  tickSeconds: 0.5,
  /** Seconds with no build-up before a meter starts to drain. */
  drainDelay: 1,
  /** Build-up tier for elemental weapons and for weapons whose GDD 7.17 text names a status. */
  intrinsicBuild: 'Low',
  burning: { seconds: 4, damageShare: 1 },
  poisoned: { seconds: 5, damageShare: 1 },
  /** Bleeding ticks faster while the target moves. */
  bleeding: { seconds: 4, damageShare: 0.75, movingRate: 2 },
  /** Each Electrified tick has a chance to arc to a nearby enemy. */
  electrified: { seconds: 4, damageShare: 0.75, arcChance: 0.25 },
  infected: { seconds: 6, damageShare: 0.75, spreadRange: 160 },
  /** Corroded lowers Armour by tier steps, more against Metallic enemies. */
  corroded: { seconds: 5, armourSteps: 1, metallicSteps: 2 },
  /** Each Cold hit slows. A full meter freezes the target. */
  frozen: { seconds: 2, hitSlowFactor: 0.7, hitSlowSeconds: 1.5 },
  /** The Stun meter grows by this factor after each stun. */
  stunned: { seconds: 1, meterGrowth: 1.5 },
  marked: { seconds: 6, criticalChance: 'Medium' },
  overheated: { seconds: 5, attackSlow: 1.5, extraDamage: 'Medium' },
  shortCircuited: { seconds: 1 },
} as const;

/** Status reaction numbers with no value in GDD.md (GDD 9.14). */
export const REACTION_RULES = {
  /** Shatter: bonus on the Impact hit, as a share of the hit. */
  shatterBonus: 1,
  steamRadius: 60,
  steamDamageShare: 0.5,
  fumesRadius: 60,
  fumesSeconds: 3,
  /** Toxic Fumes: share of weapon damage per tick. */
  fumesDamageShare: 0.25,
  /** Seconds before the same enemy releases fumes again. */
  fumesCooldown: 3,
  /** Galvanic Surge: Electric damage up against the target. */
  galvanicBonus: 'High',
  /** Galvanic Corrosion: share of the Electric hit arcing to one nearby enemy. */
  galvanicArcShare: 0.5,
  /** Septic Wound: seconds between spreads to a nearby enemy. */
  septicSpreadSeconds: 1.5,
  shortCircuitBonus: 1,
  shortCircuitStun: 1,
  /** Calculated Strike: Critical Damage up for the hit. */
  calculatedStrikeBonus: 'High',
} as const;

/** Synergy numbers with no value in GDD.md (GDD 7.19). */
export const SYNERGY_RULES = {
  flashpointRadius: 30,
  flashpointDamageShare: 0.5,
  /** Envenomed Edge: Poisoned tick rate on Bleeding enemies. */
  envenomedTickRate: 2,
  overgrowthSpreads: 2,
  /** Fungal Network: share of a hit spread to other Infected enemies, and the reach. */
  fungalShare: 0.25,
  fungalRange: 150,
  /** Kill Zone: seconds an enemy counts as trapped after a trap hit. */
  trappedSeconds: 3,
  /** Combined Arms: seconds an enemy counts as recently hit by melee. */
  meleeMarkSeconds: 3,
  magneticSlowRange: 200,
  magneticSlow: 'Medium',
  /** Chemical Ballistics: trail spacing, size, life and build-up per tick. */
  trailSpacing: 60,
  trailRadius: 18,
  trailSeconds: 1,
  trailBuild: 'Minimal',
  launcherPenetration: 1,
  /** Bioengineering: regeneration per second and growth per round. */
  bioRegenPerSecond: 0.03,
  bioGrowthPerRound: 'Minimal',
  bioGrowthCap: 'High',
  /** Conductive Toxins: most jumps one chain makes through Poisoned enemies. */
  conductiveJumpCap: 8,
  recursiveAreaShare: 0.6,
  recursiveDamageShare: 0.5,
  adaptiveFactor: 2,
  /** Grand Calculus Engine: extra chain depth (GDD 7.20). */
  calculusChainDepth: 1,
  /** Resonance Fork: bonus damage against listed statuses. */
  resonanceBonus: 'Medium',
  parasiteSpeed: 260,
  parasiteRange: 420,
  parasiteTurn: 6,
} as const;

/**
 * Performance limits (GDD 7.21, 15.11). Milestone 12 sets final numbers from profiling.
 * activeEnemies holds the limit for Rounds 1 to 6, 7 to 14 and 15 to 21 (GDD 4.11):
 * Medium, High, Extreme on PC and Low, Medium, High on mobile.
 */
export interface PerformanceLimits {
  readonly projectiles: number;
  readonly areaEffects: number;
  readonly constructs: number;
  readonly traps: number;
  readonly chainEventsPerStep: number;
  /** Enemy pools, clouds, mines and seeds. */
  readonly hazards: number;
  readonly enemyShots: number;
  readonly activeEnemies: readonly [number, number, number];
}

export const PERFORMANCE_LIMITS = {
  pc: {
    projectiles: 400,
    areaEffects: 30,
    constructs: 6,
    traps: 18,
    chainEventsPerStep: 12,
    hazards: 160,
    enemyShots: 200,
    activeEnemies: [120, 200, 300],
  },
  mobile: {
    projectiles: 250,
    areaEffects: 16,
    constructs: 6,
    traps: 12,
    chainEventsPerStep: 6,
    hazards: 80,
    enemyShots: 100,
    activeEnemies: [40, 60, 100],
  },
} as const satisfies Record<string, PerformanceLimits>;

/** Active enemy limit for a campaign round (GDD 4.11). Round 7 already uses the second band. */
export function activeEnemyLimit(limits: PerformanceLimits, round: number): number {
  const band = round <= 6 ? 0 : round <= 14 ? 1 : 2;
  return limits.activeEnemies[band];
}

/**
 * Enemy behaviour numbers with no value in GDD.md (GDD 9.10 to 9.16).
 * NOTES.md records each choice. Milestone 12 tunes them.
 */
export const ENEMY_RULES = {
  /** Speed steps past Extreme add this share each, so Swift hounds stay readable. */
  speedStepAboveExtreme: 0.2,
  /** One attack speed step divides wind-up and recovery by this factor. */
  attackSpeedStep: 1.3,
  /** Seconds between two attacks of one enemy, on top of the recovery. */
  attackCooldown: 0.4,

  rangedWindup: 0.6,
  rangedRecover: 1.5,
  shotSpeed: 360,
  shotRadius: 5,
  /** Ranged enemies with the kite trait back away inside this share of their Range. */
  kiteShare: 0.45,
  /** Ranged enemies hold at this share of their Range. */
  holdShare: 0.8,

  slamWindup: 0.7,
  slamRecover: 1.1,
  slamRadius: 70,
  slamReach: 34,
  burningGroundSeconds: 2.5,

  detonateGap: 34,
  detonateWindup: 0.6,
  detonateRadius: 90,
  /** Enemy blasts deal this multiple of their damage to other enemies. */
  allyBlastFactor: 3,

  chargeRecover: 0.9,
  /** Gear Lancer: seconds stalled after hitting a wall. */
  stallSeconds: 2,

  shockwaveWindup: 1.2,
  shockwaveRecover: 3,
  shockwaveSpeed: 420,
  shockwaveRadius: 900,
  /** The ring hits bodies this close to its front, pixels. */
  shockwaveWidth: 24,
  /** The Ancient Guardian wakes when the player comes this close, or on damage. */
  wakeRadius: 260,

  /** Seconds between damage ticks of enemy pools. */
  hazardTick: 0.5,
  /** Pools deal this share of the owner's damage per tick. */
  hazardDamageShare: 0.5,
  acidRadius: 16,
  acidSeconds: 2,
  acidSpacing: 60,
  toxicPoolRadius: 55,
  toxicPoolSeconds: 4,

  /** Clockwork Crawler latch: speed multiplier per stack, lowest multiplier and seconds. */
  latchSlow: 0.85,
  latchSlowMin: 0.55,
  latchSeconds: 1.5,

  sporeCooldown: 5,
  sporeCast: 0.6,
  sporePodSeconds: 2.5,
  sporePodRange: 260,
  sporeCloudRadius: 90,
  sporeCloudSeconds: 5,
  sporeSlow: 0.6,

  mineCooldown: 6,
  mineCast: 0.6,
  mineThrowRange: 340,
  mineArmSeconds: 1,
  mineTriggerRadius: 42,
  mineBlastRadius: 80,
  mineSeconds: 12,

  repairCooldown: 4,
  repairCast: 0.6,
  repairRange: 280,
  repairShare: 0.2,
  deployCooldown: 8,
  deployCast: 0.8,
  deployCount: 2,
  /** Crawlers one Mechanist deploys in a round. */
  deployCap: 6,

  /** Regenerator: seconds without damage before healing, and share of Health per second. */
  regenDelay: 3,
  regenPerSecond: 0.06,
  /** Regenerating elites heal this share of Health per second. */
  eliteRegenPerSecond: 0.02,

  /** Cosine of the half-angle of a frontal shield or shell: 60 degrees each side. */
  frontCos: 0.5,
  /** Shield carriers turn this fast, radians per second, so flanking works. */
  shieldTurnRate: 2.2,

  /** Gold a Highwayman takes per hit. */
  stealGold: 5,
  commandRadius: 220,
  commandBonus: 'Low',

  teleportCooldown: 4,
  teleportCast: 0.5,
  teleportMin: 150,
  teleportMax: 260,
  /** Anomaly: seconds each resistance lasts. */
  shiftSeconds: 4,

  suppressRadius: 300,
  /** The Unstable: status durations multiply by this factor. */
  shortStatusFactor: 0.5,
  mutateHealthShare: 0.5,

  deathBurstRadius: 60,
  seedSeconds: 4,
  seedRadius: 8,

  /** Seconds between two volleys called by a squad leader. */
  volleySeconds: 3.5,
  /** Hunting Hound: seconds of retreat after a strike. */
  retreatSeconds: 1.6,

  // Elite modifiers (GDD 9.12).
  armouredSteps: 2,
  volatileRadius: 80,
  volatileDamageFactor: 1.5,
  splitCopies: 2,
  splitHealthShare: 0.4,
  splitRadiusShare: 0.75,
  magnetRadius: 160,
  magnetTurnRate: 4,
  vampiricHealShare: 0.1,

  // Champion traits (GDD 9.13).
  warlordThresholds: [0.66, 0.33],
  warlordEscorts: 4,
  purifySeconds: 6,
  /** Phase-Shifter: share of Health lost inside the window, the window and the jump. */
  phaseBurstShare: 0.15,
  phaseWindow: 1,
  phaseDistance: 320,
  /** Reactive Plating: seconds between checks. The resistance lasts until the next check. */
  platingSeconds: 5,
  overclockedSteps: 2,
  overclockedHealthShare: 0.5,
  /** Siege Breaker: gap at which the champion strikes a construct or trap. */
  siegeReach: 30,
} as const;

/** AI numbers with no value in GDD.md (GDD 9.15). */
export const AI_RULES = {
  /** Each enemy scores its actions this many times per second. */
  decisionsPerSecond: 4,
  /** Update frequency by distance: every step, every few steps, a few times per second. */
  nearDistance: 700,
  midDistance: 1100,
  midSteps: 4,
  farSteps: 15,
  /** Attack tokens by territory: enemies allowed to attack the player at once. */
  attackTokens: [6, 8, 10],
  flankSlots: 8,
  flankRadius: 230,
  /** Enemies without a token circle at this gap to the player. */
  waitGap: 90,
  /** Squad members further than this from the squad centre want to regroup. */
  regroupDistance: 420,
  /** Territorial enemies defend this radius around their home point. */
  homeRadius: 420,
  /** Predatory enemies press a player below this share of Health. */
  weakTargetShare: 0.5,
  /** Enemies below this share of Health consider a retreat. */
  retreatHealthShare: 0.35,
  /** A guard holds this far in front of its ward. */
  guardDistance: 60,
  /** Enemies look for wards and squad mates inside this radius. */
  allyRadius: 520,
  /** Enemies steer around obstacles inside this margin, pixels. */
  avoidMargin: 26,
  /** Personality weights by tier (GDD 9.15). */
  weights: { Minimal: 0.2, Low: 0.6, Medium: 1, High: 1.5, Extreme: 2 },
  /** Squad orders multiply the matching action. */
  orderBonus: 1.6,
  /** A squad with a dead leader leans toward regrouping. */
  leaderlessRegroup: 1.5,
} as const;

/** Encounter director numbers with no value in GDD.md (GDD 4.11, 4.12, 9.12, 9.13). */
export const DIRECTOR_RULES = {
  /** Share of the round duration: trickle end, groups window and the closing assault. */
  trickleEnd: 0.8,
  groupsStart: 0.15,
  groupsEnd: 0.7,
  assaultTime: 0.85,
  firstSpawnSeconds: 1,
  groupSizeMin: 3,
  groupSizeMax: 5,
  /** Threat units one group spends, as a share of the Round 1 budget. */
  groupBudgetShare: 0.3,
  /** Enemies of a threat tier appear from this campaign round. */
  tierFirstRound: { Minimal: 1, Low: 1, Medium: 2, High: 5, Extreme: 8 },
  /** Elites appear from Round 5 (GDD 4.12). Odds per enemy, as Critical Chance tiers, by territory. */
  eliteFirstRound: 5,
  eliteOdds: ['Low', 'Medium', 'Medium'],
  /** Champion odds per group from Round 15. One champion per round at most. */
  championOdds: 'Low',
  eliteCostFactor: 3,
  championCostFactor: 6,
  /** Groups of this size or larger show a warning marker before they enter. */
  warningSize: 5,
  warningSeconds: 1.5,
  /** Formations start at Round 5, flanking at Round 12, three-way assaults at Round 15 (GDD 4.11). */
  formationFirstRound: 5,
  flankFirstRound: 12,
  coordinatedFirstRound: 15,
  defensiveFirstRound: 19,
} as const;

/** Player stat caps as tiers (GDD 3.6), for the stats Milestone 2 changes. */
export const PLAYER_STAT_CAPS = {
  armour: 'High',
  evasion: 'Medium',
} as const;
