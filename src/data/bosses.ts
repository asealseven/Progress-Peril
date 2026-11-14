// Territory bosses (GDD 10.1 to 10.4, 10.6). Names, phases, signature attacks
// and counters come from GDD.md. Body stats, attack shapes and numbers fill
// gaps. NOTES.md records each choice.

import type { DamageType } from './damageTypes';
import type { EnemyDef } from './enemies';
import type { KingdomName } from './palette';
import { PLACEHOLDER_RADIUS } from './tiers';

export type BossId = 'iron-regent' | 'abomination' | 'grand-automaton' | 'the-unmaking' | 'spore-sovereign';

/** Attack patterns a boss controller runs. Signature attacks feed Convergence (GDD 4.10). */
export type BossAttackId =
  // Iron Regent.
  | 'sword-sweep'
  | 'shield-charge'
  | 'royal-decree'
  // Abomination.
  | 'claw-slam'
  | 'mutagenic-spew'
  // Grand Automaton.
  | 'stomp'
  | 'gatling-sweep'
  | 'steam-vents'
  // The Unmaking.
  | 'void-bolts'
  | 'displacement'
  | 'null-field'
  // Spore Sovereign.
  | 'thorn-lash'
  | 'spore-burst'
  | 'uprooted-charge'
  // Mini-bosses.
  | 'halberd-sweep'
  | 'war-banner'
  | 'flask-throw'
  | 'shatter-vat'
  | 'cannon-shot'
  | 'lay-mines'
  | 'wall-climb'
  | 'spider-charge'
  | 'place-pylon'
  | 'pylon-chain'
  | 'rod-overload'
  | 'hedge-charge'
  | 'call-thornlings';

export interface PhaseDef {
  readonly name: string;
  /** GDD 10.4 wording. */
  readonly text: string;
  /** Attacks in rotation during this phase. */
  readonly attacks: readonly BossAttackId[];
}

export interface BossDef {
  readonly id: BossId;
  readonly name: string;
  readonly kingdom: KingdomName;
  /** GDD 10.1 concept lines. */
  readonly concept: readonly string[];
  readonly signature: { readonly id: BossAttackId; readonly name: string; readonly text: string };
  readonly counters: string;
  readonly phases: readonly [PhaseDef, PhaseDef, PhaseDef];
  /** The body as the combat simulation sees it. Health comes from BOSS_RULES. */
  readonly body: EnemyDef;
}

const boss = PLACEHOLDER_RADIUS.boss;

function body(
  id: string,
  name: string,
  faction: EnemyDef['faction'],
  properties: readonly string[],
  weakTo: readonly DamageType[],
  resists: readonly DamageType[],
  damageType: DamageType,
  armour: EnemyDef['armour'],
  speed: EnemyDef['speed'],
  radius: number,
  behaviour: string,
): EnemyDef {
  return {
    id,
    name,
    faction,
    role: 'Tank',
    roles: ['Tank'],
    health: 'Extreme',
    damage: radius >= boss ? 'High' : 'Medium',
    speed,
    range: 'Minimal',
    armour,
    threat: 'Extreme',
    properties,
    weakTo,
    resists,
    damageType,
    behaviour,
    radius,
    personality: 'Aggressive',
    attack: 'melee',
    traits: [],
  };
}

export const BOSSES: Readonly<Record<BossId, BossDef>> = {
  'iron-regent': {
    id: 'iron-regent',
    name: 'Iron Regent',
    kingdom: 'Keldrath',
    concept: ['Armoured ruler reinforced by engineers.'],
    signature: { id: 'royal-decree', name: 'Royal Decree', text: 'A hammer slam sending three shockwaves in a cone' },
    counters: 'Corrosive and Cold strip armour. Kill the engineers',
    phases: [
      {
        name: 'Court of Steel',
        text: "Sword sweeps and a shield charge. Two engineers repair the Regent's armour. Killing the engineers stops repairs.",
        attacks: ['sword-sweep', 'shield-charge', 'royal-decree'],
      },
      {
        name: 'Glowing Plate',
        text: 'The armour heats up: Fire resistance, Cold weakness. Molten channels open around the throne.',
        attacks: ['sword-sweep', 'shield-charge', 'royal-decree'],
      },
      {
        name: 'Unbound',
        text: 'The Regent sheds the armour, moves faster and uses Royal Decree often. Forgeguard Knights join.',
        attacks: ['royal-decree', 'sword-sweep', 'royal-decree', 'shield-charge'],
      },
    ],
    body: body('iron-regent', 'Iron Regent', 'Kingdom Armies', ['Human', 'Metallic', 'Armoured', 'Heavy'], ['Corrosive', 'Cold'], ['Slashing'], 'Slashing', 'High', 'Low', boss, 'Armoured ruler reinforced by engineers.'),
  },
  abomination: {
    id: 'abomination',
    name: 'Abomination',
    kingdom: 'Myrathis',
    concept: ['Mutating biological creature.', 'Changes resistances and attack patterns.'],
    signature: { id: 'mutagenic-spew', name: 'Mutagenic Spew', text: 'A cone of bile leaving acid pools' },
    counters: 'Mixed damage types. Fire on the exposed core',
    phases: [
      {
        name: 'Adaptation',
        text: 'Every few seconds the Abomination resists the damage type taken most, shown by colour. Mixed builds keep pressure up.',
        attacks: ['claw-slam', 'mutagenic-spew'],
      },
      {
        name: 'Overgrowth',
        text: 'Grows extra limbs and spawns Chemical Crawlers from the vats.',
        attacks: ['claw-slam', 'claw-slam', 'mutagenic-spew'],
      },
      {
        name: 'Meltdown',
        text: 'Frenzied attacks. After each Mutagenic Spew, the core sits exposed for a short window.',
        attacks: ['mutagenic-spew', 'claw-slam'],
      },
    ],
    body: body('abomination', 'Abomination', 'Failed Experiments', ['Biological', 'Organic', 'Mutated'], [], [], 'Corrosive', 'Low', 'Low', boss, 'Mutating biological creature.'),
  },
  'grand-automaton': {
    id: 'grand-automaton',
    name: 'Grand Automaton',
    kingdom: 'Merovant',
    concept: ['Deploys mechanical enemies.', 'Changes behaviour as components are destroyed.'],
    signature: { id: 'gatling-sweep', name: 'Gatling Sweep', text: 'A rotating barrage from the arm turrets' },
    counters: 'Electric and Impact. Destroy arms and belts',
    phases: [
      {
        name: 'Defensive systems',
        text: 'A frontal shield blocks projectiles. Arm turrets fire Gatling Sweeps. Destroying an arm removes the matching attack.',
        attacks: ['gatling-sweep', 'stomp'],
      },
      {
        name: 'Overload',
        text: 'Steam vents open around the body. The Automaton takes extra Electric and Cold damage.',
        attacks: ['gatling-sweep', 'steam-vents', 'stomp'],
      },
      {
        name: 'Emergency protocol',
        text: 'Releases swarms of Clockwork Crawlers and self-repairs from belt parts until the player destroys the belts.',
        attacks: ['gatling-sweep', 'steam-vents', 'stomp'],
      },
    ],
    body: body('grand-automaton', 'Grand Automaton', 'Clockwork Legions', ['Artificial', 'Mechanical', 'Metallic', 'Armoured'], ['Electric', 'Impact'], ['Piercing'], 'Piercing', 'High', 'Minimal', boss, 'Deploys mechanical enemies.'),
  },
  'the-unmaking': {
    id: 'the-unmaking',
    name: 'The Unmaking',
    kingdom: 'Orthelyn',
    concept: ['Manipulates the battlefield.', 'Disrupts scientific effects.'],
    signature: {
      id: 'null-field',
      name: 'Null Field',
      text: 'An expanding ring suppressing synergies and Auxiliary components inside',
    },
    counters: 'Movement. Marked and critical hits reveal the real body',
    phases: [
      { name: 'Displacement', text: 'Teleports between plaza points and erases tiles.', attacks: ['void-bolts', 'displacement', 'void-bolts'] },
      {
        name: 'Null and gravity',
        text: 'Null Fields spread while gravity flips between pull and push.',
        attacks: ['null-field', 'void-bolts', 'displacement'],
      },
      {
        name: 'Probability',
        text: 'Splits into three copies. Only one takes damage. Marked and critical hits reveal the real body.',
        attacks: ['void-bolts', 'null-field', 'displacement'],
      },
    ],
    body: body('the-unmaking', 'The Unmaking', 'Unknown', ['Anomalous', 'Unstable'], [], [], 'Electric', 'Medium', 'Low', boss, 'Manipulates the battlefield.'),
  },
  'spore-sovereign': {
    id: 'spore-sovereign',
    name: 'Spore Sovereign',
    kingdom: 'Nymora',
    concept: ['Spreads fungal growth.', 'Summons supporting creatures.'],
    signature: { id: 'spore-burst', name: 'Spore Burst', text: 'A ring of pods hatching Thornlings' },
    counters: 'Fire and Area damage. Burn the fungal growth',
    phases: [
      { name: 'Rooted', text: 'Rooted in the fountain. Spreads fungal growth and fires Spore Bursts.', attacks: ['spore-burst', 'thorn-lash'] },
      { name: 'Uprooted', text: 'Leaves the fountain and charges along vine paths.', attacks: ['uprooted-charge', 'thorn-lash', 'spore-burst'] },
      {
        name: 'Full Bloom',
        text: 'Heals from fungal growth. Burning the growth stops the healing.',
        attacks: ['spore-burst', 'uprooted-charge', 'thorn-lash'],
      },
    ],
    body: body('spore-sovereign', 'Spore Sovereign', 'Wilds', ['Fungal', 'Organic', 'Biological'], ['Fire'], ['Biological', 'Toxic'], 'Biological', 'Medium', 'Low', boss, 'Spreads fungal growth.'),
  },
};

export const BOSS_LIST: readonly BossDef[] = Object.values(BOSSES);

export const BOSS_BY_KINGDOM: Readonly<Record<KingdomName, BossDef>> = {
  Keldrath: BOSSES['iron-regent'],
  Myrathis: BOSSES.abomination,
  Merovant: BOSSES['grand-automaton'],
  Orthelyn: BOSSES['the-unmaking'],
  Nymora: BOSSES['spore-sovereign'],
};

/** Boss parts: engineers use the Mechanist. These are pieces of a boss, not roster enemies. */
function part(id: string, name: string, faction: EnemyDef['faction'], properties: readonly string[], weakTo: readonly DamageType[], radius: number): EnemyDef {
  return { ...body(id, name, faction, properties, weakTo, [], 'Impact', 'Low', 'Minimal', radius, name), health: 'High', damage: 'Minimal' };
}

export const BOSS_PARTS = {
  'automaton-arm': part('automaton-arm', 'Arm turret', 'Clockwork Legions', ['Artificial', 'Mechanical', 'Metallic'], ['Electric', 'Impact'], 22),
  'belt-motor': part('belt-motor', 'Belt motor', 'Clockwork Legions', ['Artificial', 'Mechanical', 'Metallic'], ['Electric', 'Impact'], 24),
  'war-banner': part('war-banner', 'War banner', 'Kingdom Armies', ['Human', 'Organic'], ['Fire'], 18),
  'tesla-pylon': part('tesla-pylon', 'Pylon', 'Unknown', ['Anomalous', 'Electric', 'Conductive'], ['Impact'], 16),
  'unmaking-copy': { ...BOSSES['the-unmaking'].body, id: 'unmaking-copy', name: 'The Unmaking' },
} as const satisfies Record<string, EnemyDef>;

export type BossPartId = keyof typeof BOSS_PARTS;

/** Numbers with no GDD value, plus the CLAUDE.md starting values. Milestone 12 tunes them. */
export const BOSS_RULES = {
  /** Phase changes at 70 and 30 per cent health (GDD 10.4). */
  phaseThresholds: [0.7, 0.3],
  /** Mini-bosses change phase at 50 per cent (GDD 10.5). */
  miniPhaseThreshold: 0.5,
  /** The short invulnerable transition between phases (GDD 10.4). */
  transitionSeconds: 1.5,
  /** Every boss attack warns this long. Hazards warn at least as long (GDD 5.10). */
  telegraphSeconds: 1.5,
  /** Seconds between attacks: phase 1, 2, 3. Mini-bosses use the first two. */
  attackGap: [3.2, 2.6, 2],
  /** Escorts attack this much slower, so the opening stays fair (GDD 10.6). */
  escortGapFactor: 1.4,
  /** Bosses and mini-bosses enter this long after the round starts. */
  entrySeconds: 2,
  /** Damage of each attack shape as a share of the body's damage. */
  heavyShare: 1.6,
  lightShare: 1,
  sweepRadius: 170,
  sweepArc: Math.PI * 0.75,
  wideSweepArc: Math.PI * 1.25,
  wideSweepRadius: 220,
  chargeLength: 520,
  chargeWidth: 70,
  chargeSpeed: 700,
  decreeLength: 620,
  decreeWidth: 46,
  decreeSpread: 0.36,
  slamRadius: 150,
  spewRadius: 360,
  spewArc: Math.PI * 0.45,
  spewPools: 3,
  gatlingSeconds: 2.2,
  gatlingShotsPerSecond: 14,
  gatlingArc: Math.PI * 0.9,
  ventRadius: 210,
  voidBolts: 5,
  nullFieldRadius: 420,
  nullFieldSeconds: 2.5,
  /** Null Field effects last this long on the player after the ring passes. */
  nullSuppressSeconds: 4,
  sporePods: 6,
  sporeRingRadius: 260,
  lashRadius: 220,
  lashArc: Math.PI * 0.6,
  /** Engineers clear Corroded from the Regent this often. */
  repairSeconds: 4,
  engineers: 2,
  forgeguardJoin: 3,
  /** Abomination: resistance shifts to the type taken most this often. */
  adaptSeconds: 4,
  overgrowthCrawlers: 3,
  overgrowthSeconds: 9,
  /** Exposed core: damage taken up, and Fire up again. */
  exposedSeconds: 3,
  exposedTaken: 1.5,
  exposedFire: 2,
  armHealthShare: 0.12,
  motorHealthShare: 0.08,
  crawlerSwarm: 6,
  crawlerSwarmSeconds: 8,
  /** Health per second from each living belt motor in Emergency protocol, share of max. */
  beltRepair: 0.003,
  /** Copies reshuffle this often in Probability. */
  copyShuffleSeconds: 7,
  revealSeconds: 4,
  /** Gravity flips between pull and push this often in Null and gravity. */
  gravityFlipSeconds: 4,
  /** Full Bloom: health per second per fungal patch, share of max. */
  bloomHeal: 0.0002,
  // Mini-bosses.
  bannerHealthShare: 0.1,
  bannerDamage: 0.25,
  bannerRadius: 420,
  flaskRadius: 90,
  mineCount: 3,
  wallSeconds: 6,
  pylons: 3,
  pylonHealthShare: 0.08,
  pylonChainWidth: 34,
  thornlingCalls: 3,
  /** Mutation: the Mad Alchemist grows and quickens. */
  mutateSpeed: 1.35,
  mutateDamage: 1.25,
} as const;
