// The launch set of 24 weapons, four per family (GDD 7.17).
// Names, tiers, tags, damage types and behaviour wording come from GDD.md.
// Numbers with no GDD value sit in the delivery fields below and in
// WEAPON_RULES in tiers.ts. NOTES.md records each choice.

import type { DamageType } from './damageTypes';
import type { Tag } from './tags';
import type { Tier } from './tiers';

export const WEAPON_FAMILIES = ['Melee', 'Ranged', 'Siege', 'Mechanical', 'Alchemical', 'Experimental'] as const;
export type WeaponFamily = (typeof WEAPON_FAMILIES)[number];

/** Targeting rules from GDD 7.15. */
export const TARGETING_RULES = ['Nearest', 'Strongest', 'Clustered', 'Highest threat', 'Marked first', 'Random'] as const;
export type TargetingRule = (typeof TARGETING_RULES)[number];

/** Projectile behaviours from GDD 7.16. */
export const PROJECTILE_BEHAVIOURS = [
  'Straight',
  'Arcing',
  'Piercing',
  'Ricochet',
  'Homing',
  'Chain',
  'Beam',
  'Cone',
  'Aura',
  'Orbit',
] as const;
export type ProjectileBehaviour = (typeof PROJECTILE_BEHAVIOURS)[number];

/**
 * How a weapon delivers its attack in the simulation.
 * - sweep, slam, thrust: instant melee shapes.
 * - straight, arcing: travelling projectiles.
 * - cone, aura, orbit, chain, beam: the matching GDD 7.16 behaviours.
 * - turret, companion, trap: constructs. They ignore manual focus (GDD 3.4).
 */
export type Delivery =
  | 'sweep'
  | 'slam'
  | 'thrust'
  | 'straight'
  | 'arcing'
  | 'cone'
  | 'aura'
  | 'orbit'
  | 'chain'
  | 'beam'
  | 'turret'
  | 'companion'
  | 'trap';

export type Discipline = 'Engineering' | 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics';

/** A lingering area left by an attack (GDD 7.17). */
export interface WeaponZone {
  readonly kind: 'burning' | 'rubble';
  readonly seconds: number;
}

export interface WeaponDef {
  readonly id: string;
  readonly name: string;
  readonly family: WeaponFamily;
  readonly damage: Tier;
  readonly attackSpeed: Tier;
  readonly range: Tier;
  readonly area: Tier;
  /** Intrinsic tags (GDD 7.5). */
  readonly tags: readonly Tag[];
  /** One or two damage types. Two types split the damage evenly. */
  readonly damageTypes: readonly DamageType[];
  readonly delivery: Delivery;
  /** GDD 7.16 behaviours this weapon shows with no components. */
  readonly behaviours: readonly ProjectileBehaviour[];
  /** Default targeting rule (GDD 7.15). */
  readonly targeting: TargetingRule;
  readonly disciplines: readonly Discipline[];
  /** Behaviour wording from GDD 7.17, for tooltips. */
  readonly description: string;
  /** Weapon Critical Chance tier, where GDD 7.17 names one. */
  readonly criticalChance?: Tier;
  /** One of the six starting weapons with no research (CLAUDE.md "Characters"). */
  readonly starting?: boolean;

  // Delivery numbers. Defaults: one projectile, no spread, no penetration, no bounces.
  readonly projectiles?: number;
  /** Total fan angle for several projectiles, degrees. */
  readonly spreadDegrees?: number;
  /** Enemies a projectile passes through. */
  readonly penetration?: number;
  readonly bounces?: number;
  /** Extra enemies a Chain attack jumps to. */
  readonly chainJumps?: number;
  readonly projectileSpeedFactor?: number;
  /** Projectile or landing hits strike every enemy inside weapon Area. */
  readonly blast?: boolean;
  readonly zone?: WeaponZone;
  /** Kills set off a chain explosion. */
  readonly killExplosion?: boolean;
  /** Status the weapon builds by itself (GDD 7.17). Active from Milestone 3. */
  readonly builds?: string;
}

/** Penetration value meaning "through a full line". */
export const UNLIMITED_PENETRATION = 99;

export const WEAPONS = {
  // --- Melee ---------------------------------------------------------------
  'forged-longsword': {
    id: 'forged-longsword',
    name: 'Forged Longsword',
    family: 'Melee',
    damage: 'Medium',
    attackSpeed: 'Medium',
    range: 'Low',
    area: 'Medium',
    tags: ['Blade', 'Metallic'],
    damageTypes: ['Slashing'],
    delivery: 'sweep',
    behaviours: [],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Wide sweep in front of the player.',
    starting: true,
  },
  'war-hammer': {
    id: 'war-hammer',
    name: 'War Hammer',
    family: 'Melee',
    damage: 'High',
    attackSpeed: 'Low',
    range: 'Low',
    area: 'Medium',
    tags: ['Blunt', 'Metallic', 'Heavy'],
    damageTypes: ['Impact'],
    delivery: 'slam',
    behaviours: [],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Overhead slam with a Stun chance.',
    starting: true,
    builds: 'Stunned',
  },
  pike: {
    id: 'pike',
    name: 'Pike',
    family: 'Melee',
    damage: 'Medium',
    attackSpeed: 'Medium',
    range: 'Medium',
    area: 'Low',
    tags: ['Polearm', 'Piercing'],
    damageTypes: ['Piercing'],
    delivery: 'thrust',
    behaviours: ['Piercing'],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Thrust hits every enemy along a line.',
    starting: true,
  },
  'gear-flail': {
    id: 'gear-flail',
    name: 'Gear Flail',
    family: 'Melee',
    damage: 'Low',
    attackSpeed: 'High',
    range: 'Low',
    area: 'High',
    tags: ['Blunt', 'Mechanical', 'Orbit'],
    damageTypes: ['Impact'],
    delivery: 'orbit',
    behaviours: ['Orbit'],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Spinning head circles the player.',
  },

  // --- Ranged --------------------------------------------------------------
  crossbow: {
    id: 'crossbow',
    name: 'Crossbow',
    family: 'Ranged',
    damage: 'High',
    attackSpeed: 'Low',
    range: 'High',
    area: 'Minimal',
    tags: ['Bolt', 'Projectile'],
    damageTypes: ['Piercing'],
    delivery: 'straight',
    behaviours: ['Straight'],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'High Critical Chance.',
    criticalChance: 'High',
    starting: true,
  },
  'repeating-crossbow': {
    id: 'repeating-crossbow',
    name: 'Repeating Crossbow',
    family: 'Ranged',
    damage: 'Low',
    attackSpeed: 'High',
    range: 'Medium',
    area: 'Minimal',
    tags: ['Bolt', 'Projectile', 'Mechanical'],
    damageTypes: ['Piercing'],
    delivery: 'straight',
    behaviours: ['Straight'],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Rapid volleys.',
  },
  longbow: {
    id: 'longbow',
    name: 'Longbow',
    family: 'Ranged',
    damage: 'Medium',
    attackSpeed: 'Medium',
    range: 'High',
    area: 'Minimal',
    tags: ['Arrow', 'Projectile', 'Arcing'],
    damageTypes: ['Piercing'],
    delivery: 'arcing',
    behaviours: ['Arcing'],
    targeting: 'Clustered',
    disciplines: ['Physics'],
    description: 'Arrows pass over shields.',
    starting: true,
  },
  'knife-bandolier': {
    id: 'knife-bandolier',
    name: 'Knife Bandolier',
    family: 'Ranged',
    damage: 'Low',
    attackSpeed: 'High',
    range: 'Medium',
    area: 'Low',
    tags: ['Blade', 'Thrown'],
    damageTypes: ['Slashing'],
    delivery: 'straight',
    behaviours: ['Straight'],
    targeting: 'Nearest',
    disciplines: ['Mathematics'],
    description: 'Fan of three knives.',
    starting: true,
    projectiles: 3,
    spreadDegrees: 24,
  },

  // --- Siege ---------------------------------------------------------------
  'field-cannon': {
    id: 'field-cannon',
    name: 'Field Cannon',
    family: 'Siege',
    damage: 'Extreme',
    attackSpeed: 'Minimal',
    range: 'High',
    area: 'High',
    tags: ['Heavy', 'Explosive', 'Projectile'],
    damageTypes: ['Impact', 'Fire'],
    delivery: 'straight',
    behaviours: ['Straight'],
    targeting: 'Strongest',
    disciplines: ['Chemistry'],
    description: 'Large blast.',
    blast: true,
  },
  mortar: {
    id: 'mortar',
    name: 'Mortar',
    family: 'Siege',
    damage: 'High',
    attackSpeed: 'Low',
    range: 'Extreme',
    area: 'High',
    tags: ['Arcing', 'Explosive'],
    damageTypes: ['Impact', 'Fire'],
    delivery: 'arcing',
    behaviours: ['Arcing'],
    targeting: 'Clustered',
    disciplines: ['Chemistry'],
    description: 'Targets the densest group.',
    blast: true,
  },
  ballista: {
    id: 'ballista',
    name: 'Ballista',
    family: 'Siege',
    damage: 'High',
    attackSpeed: 'Low',
    range: 'Extreme',
    area: 'Low',
    tags: ['Bolt', 'Heavy', 'Piercing'],
    damageTypes: ['Piercing'],
    delivery: 'straight',
    behaviours: ['Straight', 'Piercing'],
    targeting: 'Strongest',
    disciplines: ['Engineering'],
    description: 'Long bolt through a full line.',
    penetration: UNLIMITED_PENETRATION,
  },
  'siege-catapult': {
    id: 'siege-catapult',
    name: 'Siege Catapult',
    family: 'Siege',
    damage: 'Extreme',
    attackSpeed: 'Minimal',
    range: 'High',
    area: 'Medium',
    tags: ['Heavy', 'Arcing'],
    damageTypes: ['Impact'],
    delivery: 'arcing',
    behaviours: ['Arcing'],
    targeting: 'Clustered',
    disciplines: ['Physics'],
    description: 'Boulders leave rubble, which slows enemies.',
    blast: true,
    zone: { kind: 'rubble', seconds: 4 },
  },

  // --- Mechanical ----------------------------------------------------------
  'clockwork-turret': {
    id: 'clockwork-turret',
    name: 'Clockwork Turret',
    family: 'Mechanical',
    damage: 'Low',
    attackSpeed: 'High',
    range: 'Medium',
    area: 'Minimal',
    tags: ['Construct', 'Projectile', 'Mechanical'],
    damageTypes: ['Piercing'],
    delivery: 'turret',
    behaviours: ['Straight'],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Deploys turrets near the player up to a limit.',
  },
  'clockwork-hound': {
    id: 'clockwork-hound',
    name: 'Clockwork Hound',
    family: 'Mechanical',
    damage: 'Medium',
    attackSpeed: 'Medium',
    range: 'Medium',
    area: 'Low',
    tags: ['Construct', 'Companion', 'Mechanical', 'Metallic'],
    damageTypes: ['Slashing'],
    delivery: 'companion',
    behaviours: [],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Chases and bites enemies near the player.',
  },
  'spring-trap-layer': {
    id: 'spring-trap-layer',
    name: 'Spring Trap Layer',
    family: 'Mechanical',
    damage: 'High',
    attackSpeed: 'Low',
    range: 'Low',
    area: 'Low',
    tags: ['Trap', 'Mechanical', 'Blade'],
    damageTypes: ['Slashing'],
    delivery: 'trap',
    behaviours: [],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Places snap traps along the player path. Builds Bleeding.',
    blast: true,
    builds: 'Bleeding',
  },
  'sawblade-launcher': {
    id: 'sawblade-launcher',
    name: 'Sawblade Launcher',
    family: 'Mechanical',
    damage: 'Medium',
    attackSpeed: 'Medium',
    range: 'Medium',
    area: 'Low',
    tags: ['Blade', 'Projectile', 'Ricochet', 'Mechanical'],
    damageTypes: ['Slashing'],
    delivery: 'straight',
    behaviours: ['Straight', 'Ricochet'],
    targeting: 'Nearest',
    disciplines: ['Engineering'],
    description: 'Blades bounce between enemies.',
    bounces: 3,
  },

  // --- Alchemical ----------------------------------------------------------
  'firebomb-satchel': {
    id: 'firebomb-satchel',
    name: 'Firebomb Satchel',
    family: 'Alchemical',
    damage: 'Medium',
    attackSpeed: 'Low',
    range: 'Medium',
    area: 'Medium',
    tags: ['Thrown', 'Fire', 'Volatile'],
    damageTypes: ['Fire'],
    delivery: 'arcing',
    behaviours: ['Arcing'],
    targeting: 'Clustered',
    disciplines: ['Chemistry'],
    description: 'Flasks leave burning pools.',
    blast: true,
    zone: { kind: 'burning', seconds: 3 },
  },
  'acid-sprayer': {
    id: 'acid-sprayer',
    name: 'Acid Sprayer',
    family: 'Alchemical',
    damage: 'Low',
    attackSpeed: 'Extreme',
    range: 'Low',
    area: 'Medium',
    tags: ['Spray', 'Corrosive'],
    damageTypes: ['Corrosive'],
    delivery: 'cone',
    behaviours: ['Cone'],
    targeting: 'Clustered',
    disciplines: ['Chemistry'],
    description: 'Constant cone strips Armour.',
    builds: 'Corroded',
  },
  'spore-censer': {
    id: 'spore-censer',
    name: 'Spore Censer',
    family: 'Alchemical',
    damage: 'Low',
    attackSpeed: 'High',
    range: 'Low',
    area: 'High',
    tags: ['Aura', 'Biological', 'Fungal'],
    damageTypes: ['Biological'],
    delivery: 'aura',
    behaviours: ['Aura'],
    targeting: 'Clustered',
    disciplines: ['Biology'],
    description: 'Spore cloud around the player builds Infected.',
    builds: 'Infected',
  },
  'alchemical-chain-reactor': {
    id: 'alchemical-chain-reactor',
    name: 'Alchemical Chain-Reactor',
    family: 'Alchemical',
    damage: 'Medium',
    attackSpeed: 'Low',
    range: 'Medium',
    area: 'High',
    tags: ['Explosive', 'Volatile', 'Chain'],
    damageTypes: ['Fire'],
    delivery: 'arcing',
    behaviours: ['Arcing'],
    targeting: 'Clustered',
    disciplines: ['Chemistry', 'Mathematics'],
    description: 'Kills set off chain explosions.',
    blast: true,
    killExplosion: true,
  },

  // --- Experimental --------------------------------------------------------
  'electromagnetic-repeater': {
    id: 'electromagnetic-repeater',
    name: 'Electromagnetic Repeater',
    family: 'Experimental',
    damage: 'Medium',
    attackSpeed: 'High',
    range: 'High',
    area: 'Minimal',
    tags: ['Projectile', 'Electric', 'Magnetic', 'Metallic'],
    damageTypes: ['Piercing', 'Electric'],
    delivery: 'straight',
    behaviours: ['Straight', 'Piercing'],
    targeting: 'Nearest',
    disciplines: ['Physics', 'Engineering'],
    description: 'Fast penetrating slugs.',
    penetration: 2,
    projectileSpeedFactor: 1.6,
  },
  'living-arsenal': {
    id: 'living-arsenal',
    name: 'Living Arsenal',
    family: 'Experimental',
    damage: 'Medium',
    attackSpeed: 'Medium',
    range: 'Low',
    area: 'Medium',
    tags: ['Companion', 'Biological', 'Organic', 'Toxic'],
    damageTypes: ['Toxic'],
    delivery: 'companion',
    behaviours: [],
    targeting: 'Nearest',
    disciplines: ['Biology', 'Engineering'],
    description: 'Autonomous creature, secretes toxins and adapts each round.',
    blast: true,
    builds: 'Poisoned',
  },
  'tesla-rod': {
    id: 'tesla-rod',
    name: 'Tesla Rod',
    family: 'Experimental',
    damage: 'Low',
    attackSpeed: 'High',
    range: 'Medium',
    area: 'Low',
    tags: ['Electric', 'Chain', 'Conductive'],
    damageTypes: ['Electric'],
    delivery: 'chain',
    behaviours: ['Chain'],
    targeting: 'Nearest',
    disciplines: ['Physics'],
    description: 'Lightning arcs across several enemies.',
    chainJumps: 3,
    builds: 'Electrified',
  },
  'burning-mirror': {
    id: 'burning-mirror',
    name: 'Burning Mirror',
    family: 'Experimental',
    damage: 'Low',
    attackSpeed: 'Extreme',
    range: 'High',
    area: 'Minimal',
    tags: ['Beam', 'Fire', 'Precise'],
    damageTypes: ['Fire'],
    delivery: 'beam',
    behaviours: ['Beam'],
    targeting: 'Nearest',
    disciplines: ['Physics', 'Mathematics'],
    description: 'Focused sunbeam. Damage rises the longer the beam holds one target.',
    builds: 'Burning',
  },
} as const satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;

export const WEAPON_LIST: readonly WeaponDef[] = Object.values(WEAPONS);

/** The six weapons with no research, in CLAUDE.md order. */
export const STARTING_WEAPONS: readonly WeaponDef[] = [
  WEAPONS['forged-longsword'],
  WEAPONS['war-hammer'],
  WEAPONS.pike,
  WEAPONS.crossbow,
  WEAPONS.longbow,
  WEAPONS['knife-bandolier'],
];

export function weaponByName(name: string): WeaponDef | undefined {
  return WEAPON_LIST.find((weapon) => weapon.name === name);
}
