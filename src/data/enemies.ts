// Enemy roster: 23 enemies (GDD 9.8, 9.10, 9.11, 9.16).
// Names, tiers, properties, weaknesses, resistances and behaviour wording come
// from GDD.md. Personalities, attack shapes, attack damage types and traits
// fill gaps. NOTES.md records each choice.

import type { DamageType } from './damageTypes';
import type { FactionName, KingdomName } from './palette';
import { PLACEHOLDER_RADIUS } from './tiers';
import type { Tier } from './tiers';

export type EnemyRole =
  | 'Swarmer'
  | 'Bruiser'
  | 'Skirmisher'
  | 'Ranged attacker'
  | 'Tank'
  | 'Support'
  | 'Controller'
  | 'Summoner'
  | 'Specialist';

/** Personality traits (GDD 9.6). */
export const PERSONALITIES = [
  'Aggressive',
  'Defensive',
  'Cowardly',
  'Disciplined',
  'Territorial',
  'Unstable',
  'Predatory',
] as const;
export type Personality = (typeof PERSONALITIES)[number];

/**
 * The shape of an enemy's basic attack. Each runs wind-up, strike and recovery
 * behind a telegraph (GDD 9.15).
 * - melee: a strike on the player inside Range.
 * - ranged: a shot toward the player.
 * - charge: a dash in a straight line.
 * - slam: an area strike in front of the enemy.
 * - detonate: the enemy explodes.
 * - shockwave: a ring travelling across the arena.
 */
export type AttackKind = 'melee' | 'ranged' | 'charge' | 'slam' | 'detonate' | 'shockwave';

/** Signature behaviours (GDD 9.11). Each trait has one handler in the simulation. */
export const ENEMY_TRAITS = [
  'shield-line',
  'kite',
  'volley',
  'tower-shield',
  'latch',
  'guard-mechanist',
  'magnetic-weak',
  'repair',
  'deploy-crawlers',
  'acid-trail',
  'toxic-burst',
  'regenerate',
  'blast-allies',
  'strike-retreat',
  'shell',
  'spore-pods',
  'steal-gold',
  'mines',
  'experimental-weapon',
  'command',
  'teleport',
  'shifting-resistance',
  'dormant',
  'suppress-auxiliary',
  'short-statuses',
  'burning-slam',
  'mutate',
  'stall-on-wall',
  'death-burst',
  'seed',
] as const;

export type EnemyTrait = (typeof ENEMY_TRAITS)[number];

/** Numbers for a charge attack. */
export interface ChargeDef {
  /** The wind-up starts at this gap to the player or closer, pixels. */
  readonly trigger: number;
  /** Pixels covered by the dash. */
  readonly distance: number;
  /** Dash speed, pixels per second. */
  readonly speed: number;
  /** Wind-up seconds. */
  readonly windup: number;
}

export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly faction: FactionName;
  /** First role in GDD 9.10. */
  readonly role: EnemyRole;
  /** Every role in GDD 9.10. Enemies may have overlapping roles (GDD 9.2). */
  readonly roles: readonly EnemyRole[];
  readonly health: Tier;
  readonly damage: Tier;
  readonly speed: Tier;
  readonly range: Tier;
  readonly armour: Tier;
  readonly threat: Tier;
  readonly properties: readonly string[];
  readonly weakTo: readonly DamageType[];
  readonly resists: readonly DamageType[];
  /** Immune means no damage and no status (GDD 9.11). */
  readonly immune?: readonly DamageType[];
  /** Damage type of the enemy's attacks. See NOTES.md, GDD 9.10. */
  readonly damageType: DamageType;
  /** Signature behaviour wording from GDD 9.11. */
  readonly behaviour: string;
  /** Placeholder circle radius, logical pixels. */
  readonly radius: number;
  readonly personality: Personality;
  readonly attack: AttackKind;
  readonly traits: readonly EnemyTrait[];
  readonly charge?: ChargeDef;
  /** Leaders issue squad orders (GDD 9.5). */
  readonly leader?: boolean;
  /** Signature enemies appear in their home kingdom (GDD 9.16). */
  readonly signatureOf?: KingdomName;
}

const { swarmer, standard, tank } = PLACEHOLDER_RADIUS;

export const ENEMIES = {
  // --- Kingdom Armies ----------------------------------------------------------
  'royal-footman': {
    id: 'royal-footman',
    name: 'Royal Footman',
    faction: 'Kingdom Armies',
    role: 'Bruiser',
    roles: ['Bruiser'],
    health: 'Medium',
    damage: 'Medium',
    speed: 'Medium',
    range: 'Minimal',
    armour: 'Medium',
    threat: 'Low',
    properties: ['Human', 'Organic', 'Metallic'],
    weakTo: ['Corrosive', 'Electric'],
    resists: ['Slashing'],
    damageType: 'Slashing',
    behaviour: 'Holds shield lines behind a Bastion. Follows leader orders.',
    radius: standard,
    personality: 'Disciplined',
    attack: 'melee',
    traits: ['shield-line'],
  },
  'royal-longbowman': {
    id: 'royal-longbowman',
    name: 'Royal Longbowman',
    faction: 'Kingdom Armies',
    role: 'Ranged attacker',
    roles: ['Ranged attacker'],
    health: 'Low',
    damage: 'Medium',
    speed: 'Medium',
    range: 'High',
    armour: 'Low',
    threat: 'Medium',
    properties: ['Human', 'Organic'],
    weakTo: ['Fire', 'Slashing'],
    resists: [],
    damageType: 'Piercing',
    behaviour: 'Keeps distance. Fires volleys on command.',
    radius: standard,
    personality: 'Disciplined',
    attack: 'ranged',
    traits: ['kite', 'volley'],
  },
  'royal-bastion': {
    id: 'royal-bastion',
    name: 'Royal Bastion',
    faction: 'Kingdom Armies',
    role: 'Tank',
    roles: ['Tank', 'Support'],
    health: 'High',
    damage: 'Low',
    speed: 'Low',
    range: 'Minimal',
    armour: 'High',
    threat: 'Medium',
    properties: ['Human', 'Metallic', 'Armoured', 'Heavy'],
    weakTo: ['Corrosive', 'Impact'],
    resists: ['Piercing', 'Slashing'],
    damageType: 'Impact',
    behaviour: 'Tower shield blocks frontal projectiles for allies behind.',
    radius: tank,
    personality: 'Defensive',
    attack: 'melee',
    traits: ['tower-shield'],
  },
  'forgeguard-knight': {
    id: 'forgeguard-knight',
    name: 'Forgeguard Knight',
    faction: 'Kingdom Armies',
    role: 'Bruiser',
    roles: ['Bruiser'],
    health: 'Medium',
    damage: 'High',
    speed: 'Low',
    range: 'Minimal',
    armour: 'High',
    threat: 'Medium',
    properties: ['Human', 'Metallic', 'Armoured', 'Heavy', 'Thermal'],
    weakTo: ['Cold', 'Corrosive'],
    resists: ['Fire', 'Slashing'],
    damageType: 'Impact',
    behaviour: 'Heated plate. Hammer slams leave burning ground for a short time.',
    radius: standard,
    personality: 'Aggressive',
    attack: 'slam',
    traits: ['burning-slam'],
    signatureOf: 'Keldrath',
  },

  // --- Clockwork Legions -------------------------------------------------------
  'clockwork-crawler': {
    id: 'clockwork-crawler',
    name: 'Clockwork Crawler',
    faction: 'Clockwork Legions',
    role: 'Swarmer',
    roles: ['Swarmer'],
    health: 'Minimal',
    damage: 'Low',
    speed: 'High',
    range: 'Minimal',
    armour: 'Low',
    threat: 'Minimal',
    properties: ['Artificial', 'Mechanical', 'Metallic'],
    weakTo: ['Electric', 'Impact'],
    resists: [],
    immune: ['Toxic', 'Biological'],
    damageType: 'Piercing',
    behaviour: 'Swarms in packs. Latches on and slows the player.',
    radius: swarmer,
    personality: 'Aggressive',
    attack: 'melee',
    traits: ['latch'],
  },
  'iron-sentinel': {
    id: 'iron-sentinel',
    name: 'Iron Sentinel',
    faction: 'Clockwork Legions',
    role: 'Tank',
    roles: ['Tank'],
    health: 'High',
    damage: 'Medium',
    speed: 'Low',
    range: 'Low',
    armour: 'Extreme',
    threat: 'High',
    properties: ['Artificial', 'Mechanical', 'Metallic', 'Armoured'],
    weakTo: ['Electric', 'Corrosive'],
    resists: ['Piercing', 'Slashing'],
    immune: ['Toxic'],
    damageType: 'Impact',
    behaviour: 'Slow advance. Guards Mechanists.',
    radius: tank,
    personality: 'Defensive',
    attack: 'melee',
    traits: ['guard-mechanist', 'magnetic-weak'],
  },
  mechanist: {
    id: 'mechanist',
    name: 'Mechanist',
    faction: 'Clockwork Legions',
    role: 'Support',
    roles: ['Support', 'Summoner'],
    health: 'Low',
    damage: 'Low',
    speed: 'Medium',
    range: 'Medium',
    armour: 'Low',
    threat: 'Medium',
    properties: ['Human', 'Organic'],
    weakTo: ['Slashing', 'Toxic'],
    resists: [],
    damageType: 'Impact',
    behaviour: 'Repairs mechanical allies. Deploys Clockwork Crawlers.',
    radius: standard,
    personality: 'Cowardly',
    attack: 'ranged',
    traits: ['repair', 'deploy-crawlers', 'kite'],
  },
  'gear-lancer': {
    id: 'gear-lancer',
    name: 'Gear Lancer',
    faction: 'Clockwork Legions',
    role: 'Skirmisher',
    roles: ['Skirmisher'],
    health: 'Low',
    damage: 'High',
    speed: 'High',
    range: 'Low',
    armour: 'Medium',
    threat: 'Medium',
    properties: ['Artificial', 'Mechanical', 'Metallic'],
    weakTo: ['Electric', 'Impact'],
    resists: ['Piercing'],
    immune: ['Toxic', 'Biological'],
    damageType: 'Piercing',
    behaviour: 'Winds up, then charges in a straight line. Stalls after hitting a wall.',
    radius: standard,
    personality: 'Aggressive',
    attack: 'charge',
    traits: ['stall-on-wall'],
    charge: { trigger: 340, distance: 560, speed: 520, windup: 0.8 },
    signatureOf: 'Merovant',
  },

  // --- Failed Experiments ------------------------------------------------------
  'chemical-crawler': {
    id: 'chemical-crawler',
    name: 'Chemical Crawler',
    faction: 'Failed Experiments',
    role: 'Swarmer',
    roles: ['Swarmer'],
    health: 'Low',
    damage: 'Low',
    speed: 'High',
    range: 'Minimal',
    armour: 'Minimal',
    threat: 'Low',
    properties: ['Biological', 'Toxic', 'Volatile'],
    weakTo: ['Fire', 'Cold'],
    resists: ['Toxic', 'Corrosive'],
    damageType: 'Corrosive',
    behaviour: 'Leaves an acid trail. Bursts into a toxic pool on death.',
    radius: swarmer,
    personality: 'Aggressive',
    attack: 'melee',
    traits: ['acid-trail', 'toxic-burst'],
  },
  regenerator: {
    id: 'regenerator',
    name: 'Regenerator',
    faction: 'Failed Experiments',
    role: 'Bruiser',
    roles: ['Bruiser'],
    health: 'High',
    damage: 'Medium',
    speed: 'Medium',
    range: 'Minimal',
    armour: 'Low',
    threat: 'Medium',
    properties: ['Biological', 'Organic', 'Regenerating'],
    weakTo: ['Fire', 'Corrosive'],
    resists: ['Toxic', 'Slashing'],
    damageType: 'Impact',
    behaviour: 'Regenerates after a short time without damage. Burning and Corroded stop regeneration.',
    radius: standard,
    personality: 'Aggressive',
    attack: 'melee',
    traits: ['regenerate'],
  },
  'volatile-specimen': {
    id: 'volatile-specimen',
    name: 'Volatile Specimen',
    faction: 'Failed Experiments',
    role: 'Specialist',
    roles: ['Specialist'],
    health: 'Low',
    damage: 'High',
    speed: 'Medium',
    range: 'Low',
    armour: 'Minimal',
    threat: 'Medium',
    properties: ['Biological', 'Volatile', 'Explosive'],
    weakTo: ['Piercing', 'Cold'],
    resists: ['Fire'],
    damageType: 'Fire',
    behaviour: 'Rushes the player and detonates. The blast hurts other enemies too.',
    radius: standard,
    personality: 'Unstable',
    attack: 'detonate',
    traits: ['blast-allies'],
  },
  'vat-chimera': {
    id: 'vat-chimera',
    name: 'Vat Chimera',
    faction: 'Failed Experiments',
    role: 'Bruiser',
    roles: ['Bruiser'],
    health: 'High',
    damage: 'Medium',
    speed: 'Medium',
    range: 'Minimal',
    armour: 'Low',
    threat: 'Medium',
    properties: ['Biological', 'Organic', 'Mutated'],
    weakTo: ['Fire', 'Slashing'],
    resists: ['Toxic', 'Corrosive'],
    damageType: 'Toxic',
    behaviour: 'Gains a random elite modifier at half health.',
    radius: standard,
    personality: 'Unstable',
    attack: 'melee',
    traits: ['mutate'],
    signatureOf: 'Myrathis',
  },

  // --- Wilds -------------------------------------------------------------------
  'hunting-hound': {
    id: 'hunting-hound',
    name: 'Hunting Hound',
    faction: 'Wilds',
    role: 'Skirmisher',
    roles: ['Skirmisher'],
    health: 'Low',
    damage: 'Medium',
    speed: 'Extreme',
    range: 'Minimal',
    armour: 'Minimal',
    threat: 'Low',
    properties: ['Beast', 'Organic'],
    weakTo: ['Slashing', 'Fire'],
    resists: [],
    damageType: 'Slashing',
    behaviour: 'Packs flank, strike, then retreat.',
    radius: standard,
    personality: 'Predatory',
    attack: 'melee',
    traits: ['strike-retreat'],
  },
  'ironback-beetle': {
    id: 'ironback-beetle',
    name: 'Ironback Beetle',
    faction: 'Wilds',
    role: 'Tank',
    roles: ['Tank'],
    health: 'High',
    damage: 'Low',
    speed: 'Low',
    range: 'Minimal',
    armour: 'High',
    threat: 'Medium',
    properties: ['Beast', 'Organic', 'Armoured'],
    weakTo: ['Impact', 'Toxic'],
    // Piercing from the front: the shell trait applies the resistance by hit direction.
    resists: [],
    damageType: 'Impact',
    behaviour: 'Charges. The shell guards the front. The rear takes extra damage.',
    radius: tank,
    personality: 'Aggressive',
    attack: 'charge',
    traits: ['shell'],
    charge: { trigger: 300, distance: 420, speed: 360, windup: 0.7 },
  },
  'spore-mother': {
    id: 'spore-mother',
    name: 'Spore Mother',
    faction: 'Wilds',
    role: 'Summoner',
    roles: ['Summoner', 'Controller'],
    health: 'Medium',
    damage: 'Low',
    speed: 'Minimal',
    range: 'Medium',
    armour: 'Low',
    threat: 'High',
    properties: ['Fungal', 'Organic', 'Biological'],
    weakTo: ['Fire', 'Corrosive'],
    resists: ['Toxic', 'Biological'],
    damageType: 'Biological',
    behaviour: 'Spawns spore pods. Spreads slowing spore clouds.',
    radius: standard,
    personality: 'Territorial',
    attack: 'ranged',
    traits: ['spore-pods'],
  },
  thornling: {
    id: 'thornling',
    name: 'Thornling',
    faction: 'Wilds',
    role: 'Swarmer',
    roles: ['Swarmer'],
    health: 'Minimal',
    damage: 'Low',
    speed: 'High',
    range: 'Minimal',
    armour: 'Low',
    threat: 'Minimal',
    properties: ['Organic', 'Plant'],
    weakTo: ['Fire', 'Slashing'],
    resists: ['Toxic'],
    damageType: 'Piercing',
    behaviour: 'Swarms the player. Leaves a seed on death, which sprouts again unless burned.',
    radius: swarmer,
    personality: 'Aggressive',
    attack: 'melee',
    traits: ['seed'],
    signatureOf: 'Nymora',
  },

  // --- Outlaws -----------------------------------------------------------------
  highwayman: {
    id: 'highwayman',
    name: 'Highwayman',
    faction: 'Outlaws',
    role: 'Skirmisher',
    roles: ['Skirmisher'],
    health: 'Low',
    damage: 'Medium',
    speed: 'High',
    range: 'Low',
    armour: 'Low',
    threat: 'Low',
    properties: ['Human', 'Organic'],
    weakTo: ['Impact', 'Slashing'],
    resists: [],
    damageType: 'Slashing',
    behaviour: 'Dashes in. Steals gold on hit and drops the gold on death.',
    radius: standard,
    personality: 'Predatory',
    attack: 'charge',
    traits: ['steal-gold'],
    charge: { trigger: 150, distance: 230, speed: 460, windup: 0.4 },
  },
  'rogue-inventor': {
    id: 'rogue-inventor',
    name: 'Rogue Inventor',
    faction: 'Outlaws',
    role: 'Controller',
    roles: ['Controller'],
    health: 'Low',
    damage: 'Medium',
    speed: 'Medium',
    range: 'High',
    armour: 'Low',
    threat: 'Medium',
    properties: ['Human', 'Organic', 'Mechanical'],
    weakTo: ['Electric', 'Slashing'],
    resists: [],
    damageType: 'Impact',
    behaviour: 'Throws traps and mines. Carries a random experimental weapon.',
    radius: standard,
    personality: 'Cowardly',
    attack: 'ranged',
    traits: ['mines', 'experimental-weapon', 'kite'],
  },
  'mercenary-captain': {
    id: 'mercenary-captain',
    name: 'Mercenary Captain',
    faction: 'Outlaws',
    role: 'Support',
    roles: ['Support'],
    health: 'Medium',
    damage: 'High',
    speed: 'Medium',
    range: 'Low',
    armour: 'Medium',
    threat: 'High',
    properties: ['Human', 'Metallic', 'Leader'],
    weakTo: ['Corrosive', 'Toxic'],
    resists: ['Slashing'],
    damageType: 'Slashing',
    behaviour: 'Commands Outlaws. Raises nearby ally damage. Orders flanks.',
    radius: standard,
    personality: 'Disciplined',
    attack: 'melee',
    traits: ['command'],
    leader: true,
  },

  // --- Unknown -----------------------------------------------------------------
  anomaly: {
    id: 'anomaly',
    name: 'Anomaly',
    faction: 'Unknown',
    role: 'Specialist',
    roles: ['Specialist'],
    health: 'Medium',
    damage: 'Medium',
    speed: 'High',
    range: 'Medium',
    armour: 'Minimal',
    threat: 'High',
    properties: ['Anomalous', 'Unstable'],
    weakTo: ['Electric'],
    // Shifts on a visible cycle: the shifting-resistance trait holds the resisted type.
    resists: [],
    damageType: 'Electric',
    behaviour: 'Teleports short distances. Resistance changes every few seconds.',
    radius: standard,
    personality: 'Unstable',
    attack: 'ranged',
    traits: ['teleport', 'shifting-resistance'],
  },
  'ancient-guardian': {
    id: 'ancient-guardian',
    name: 'Ancient Guardian',
    faction: 'Unknown',
    role: 'Tank',
    roles: ['Tank', 'Controller'],
    health: 'Extreme',
    damage: 'High',
    speed: 'Minimal',
    range: 'Medium',
    armour: 'High',
    threat: 'Extreme',
    properties: ['Anomalous', 'Stone', 'Construct'],
    weakTo: ['Impact', 'Corrosive'],
    resists: ['Fire', 'Cold', 'Electric'],
    damageType: 'Impact',
    behaviour: 'Dormant until disturbed. Sends shockwaves across the arena.',
    radius: tank,
    personality: 'Territorial',
    attack: 'shockwave',
    traits: ['dormant'],
  },
  'the-unstable': {
    id: 'the-unstable',
    name: 'The Unstable',
    faction: 'Unknown',
    role: 'Specialist',
    roles: ['Specialist'],
    health: 'Medium',
    damage: 'High',
    speed: 'Medium',
    range: 'Medium',
    armour: 'Low',
    threat: 'High',
    properties: ['Anomalous', 'Volatile', 'Unstable'],
    weakTo: ['Cold'],
    // Shorter status durations: the short-statuses trait applies the resistance.
    resists: [],
    damageType: 'Fire',
    behaviour: 'Suppresses Auxiliary components on nearby player weapons.',
    radius: standard,
    personality: 'Unstable',
    attack: 'ranged',
    traits: ['suppress-auxiliary', 'short-statuses'],
  },
  'static-mote': {
    id: 'static-mote',
    name: 'Static Mote',
    faction: 'Unknown',
    role: 'Swarmer',
    roles: ['Swarmer'],
    health: 'Minimal',
    damage: 'Low',
    speed: 'Medium',
    range: 'Minimal',
    armour: 'Minimal',
    threat: 'Minimal',
    properties: ['Anomalous', 'Electric', 'Conductive'],
    weakTo: ['Impact', 'Cold'],
    resists: ['Electric'],
    damageType: 'Electric',
    behaviour:
      'Drifts in clusters. Bursts on death, arcing Electric damage to everything nearby, enemies included.',
    radius: swarmer,
    personality: 'Unstable',
    attack: 'melee',
    traits: ['death-burst'],
    signatureOf: 'Orthelyn',
  },
} as const satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;

export const ENEMY_LIST: readonly EnemyDef[] = Object.values(ENEMIES);

export function enemyByName(name: string): EnemyDef | undefined {
  return ENEMY_LIST.find((enemy) => enemy.name === name);
}

export function enemiesOfFaction(faction: FactionName): EnemyDef[] {
  return ENEMY_LIST.filter((enemy) => enemy.faction === faction);
}

/** The cheapest enemy of a faction outside the signature enemies: the escort a Warlord champion summons (GDD 9.13). */
export function escortOf(faction: FactionName): EnemyDef {
  const order: readonly string[] = ['Minimal', 'Low', 'Medium', 'High', 'Extreme'];
  const choices = ENEMY_LIST.filter((enemy) => enemy.faction === faction && !enemy.signatureOf).sort(
    (a, b) => order.indexOf(a.threat) - order.indexOf(b.threat),
  );
  return choices[0] ?? ENEMIES['royal-footman'];
}
