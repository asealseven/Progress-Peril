// Environmental hazards (GDD 5.10). Hazards hit players and enemies alike,
// warn before dealing damage and scale with territory like enemy Damage.
// Numbers with no GDD value sit in HAZARD_RULES. NOTES.md records each choice.

import type { DamageType } from './damageTypes';
import type { KingdomName } from './palette';
import type { Tier } from './tiers';

export type HazardId =
  | 'molten-channel'
  | 'slag-wave'
  | 'falling-ingot'
  | 'toxic-puddle'
  | 'volatile-vat'
  | 'acid-pool'
  | 'conveyor-belt'
  | 'stamping-press'
  | 'lightning-strike'
  | 'gravity-well'
  | 'erased-tile'
  | 'vine-patch'
  | 'thorn-hedge'
  | 'healing-bloom'
  | 'fungal-growth';

export interface HazardDef {
  readonly id: HazardId;
  readonly name: string;
  readonly kingdom: KingdomName;
  /** Undefined for hazards with no damage. */
  readonly damageType?: DamageType;
  /** GDD effect and warning wording, for tooltips and the Codex. */
  readonly effect: string;
  readonly warning: string;
  /**
   * Damage tier on the enemy Damage row, before territory scaling. Damage
   * over time deals this much per second. Bursts deal it once.
   */
  readonly damage?: Tier;
}

export const HAZARDS: Readonly<Record<HazardId, HazardDef>> = {
  'molten-channel': {
    id: 'molten-channel',
    name: 'Molten channel',
    kingdom: 'Keldrath',
    damageType: 'Fire',
    effect: 'Damage over time while inside',
    warning: 'Glow brightens before opening',
    damage: 'Medium',
  },
  'slag-wave': {
    id: 'slag-wave',
    name: 'Slag wave',
    kingdom: 'Keldrath',
    damageType: 'Fire',
    effect: 'Heavy damage across half the arena',
    warning: 'Crucible tilts first',
    damage: 'Extreme',
  },
  'falling-ingot': {
    id: 'falling-ingot',
    name: 'Falling ingot',
    kingdom: 'Keldrath',
    damageType: 'Impact',
    effect: 'Burst damage in a small circle',
    warning: 'Shadow on the floor',
    damage: 'High',
  },
  'toxic-puddle': {
    id: 'toxic-puddle',
    name: 'Toxic puddle',
    kingdom: 'Myrathis',
    damageType: 'Toxic',
    effect: 'Damage over time while inside',
    warning: 'Green pool',
    damage: 'Low',
  },
  'volatile-vat': {
    id: 'volatile-vat',
    name: 'Volatile vat',
    kingdom: 'Myrathis',
    damageType: 'Fire',
    effect: 'Explodes when hit. Joins chain reactions',
    warning: 'Vat bubbles near breaking',
    damage: 'High',
  },
  'acid-pool': {
    id: 'acid-pool',
    name: 'Acid pool',
    kingdom: 'Myrathis',
    damageType: 'Corrosive',
    effect: 'Damage over time. Lowers Armour',
    warning: 'Yellow pool',
    damage: 'Low',
  },
  'conveyor-belt': {
    id: 'conveyor-belt',
    name: 'Conveyor belt',
    kingdom: 'Merovant',
    effect: 'Pushes anyone standing on the belt',
    warning: 'Moving arrows',
  },
  'stamping-press': {
    id: 'stamping-press',
    name: 'Stamping press',
    kingdom: 'Merovant',
    damageType: 'Impact',
    effect: 'Heavy burst damage on one tile',
    warning: 'Tile flashes',
    damage: 'Extreme',
  },
  'lightning-strike': {
    id: 'lightning-strike',
    name: 'Lightning strike',
    kingdom: 'Orthelyn',
    damageType: 'Electric',
    effect: 'Burst damage, arcs to nearby targets',
    warning: 'Marked circle crackles',
    damage: 'High',
  },
  'gravity-well': {
    id: 'gravity-well',
    name: 'Gravity well',
    kingdom: 'Orthelyn',
    effect: 'Pulls everything nearby, projectiles included',
    warning: 'Distortion ring',
  },
  'erased-tile': {
    id: 'erased-tile',
    name: 'Erased tile',
    kingdom: 'Orthelyn',
    effect: 'Enemies pushed off die. Players take damage and return to the nearest tile',
    warning: 'Tile flickers before vanishing',
    damage: 'High',
  },
  'vine-patch': {
    id: 'vine-patch',
    name: 'Vine patch',
    kingdom: 'Nymora',
    effect: 'Slows movement',
    warning: 'Creeping green edge',
  },
  'thorn-hedge': {
    id: 'thorn-hedge',
    name: 'Thorn hedge',
    kingdom: 'Nymora',
    damageType: 'Slashing',
    effect: 'Blocks movement and Straight projectiles. Contact damage',
    warning: 'Hedge sprouts over a second',
    damage: 'Low',
  },
  'healing-bloom': {
    id: 'healing-bloom',
    name: 'Healing bloom',
    kingdom: 'Nymora',
    effect: 'Heals anyone inside, enemies included',
    warning: 'Glowing flower',
  },
  'fungal-growth': {
    id: 'fungal-growth',
    name: 'Fungal growth',
    kingdom: 'Nymora',
    damageType: 'Biological',
    effect: 'Damage over time. Fire burns patches away',
    warning: 'Spreading spores',
    damage: 'Low',
  },
};

export const HAZARD_LIST: readonly HazardDef[] = Object.values(HAZARDS);

/** Numbers with no GDD value. Milestone 12 tunes them. */
export const HAZARD_RULES = {
  /**
   * Every hazard warns for at least the length of a boss telegraph (GDD 5.10).
   * Bosses arrive in Milestone 8 with telegraphs of this length.
   */
  warningSeconds: 1.5,
  /** Damage over time ticks this often, seconds. */
  tickSeconds: 0.5,
  /** Champions and bosses resist hazard damage by one step (GDD 5.10). */
  resistSteps: 1,
  /** Enemies take this share of hazard damage, so luring helps without clearing rounds alone. */
  enemyShare: 1,
  slagIntervalSeconds: 16,
  ingotIntervalSeconds: 2.5,
  ingotRadius: 55,
  vatBlastRadius: 120,
  /** A vat blast reaches vats inside this radius one step later. */
  vatChainRadius: 220,
  acidIntervalSeconds: 4,
  acidRadius: 90,
  /** Acid spreads this far from the centre per pool. */
  acidSpread: 120,
  /** Player Armour while standing in acid, as a share of normal. */
  acidArmourShare: 0.5,
  /** Corroded build-up per second on enemies in acid, share of a Normal meter. */
  acidCorrodedPerSecond: 0.3,
  puddleRadius: 70,
  beltSpeed: 90,
  beltReverseSeconds: 8,
  pressIntervalSeconds: 4,
  pressesPerStamp: 3,
  lightningIntervalSeconds: 3.5,
  lightningStrikes: 2,
  lightningRadius: 70,
  lightningArcRange: 160,
  lightningArcs: 2,
  /** Arc damage as a share of the strike. */
  lightningArcShare: 0.5,
  gravityWells: 2,
  gravityRadius: 260,
  /** Pull speed at the centre, pixels per second. Falls off to zero at the edge. */
  gravityPull: 110,
  /** Rift Storm moves gravity wells this often, seconds (GDD 5.11). */
  gravityMoveSeconds: 5,
  orreryArms: 2,
  orreryArmLength: 620,
  orreryArmSegments: 6,
  orreryArmRadius: 24,
  /** Orrery arm turn rate, radians per second. */
  orreryTurn: 0.22,
  eraseIntervalSeconds: 14,
  /** Erased rings of tiles at most, so the plaza keeps room to fight. */
  eraseStages: 2,
  vineSlow: 0.6,
  /** Vines creep in from the edges from this depth to the full depth over the round, pixels. */
  vineStartDepth: 80,
  vineFullDepth: 260,
  vineGrowSeconds: 40,
  /** Contact range past the thorn edge, pixels. */
  thornReach: 6,
  bloomIntervalSeconds: 6,
  bloomSeconds: 8,
  bloomRadius: 70,
  /** Health per second inside a bloom. */
  bloomHeal: 4,
  fungalIntervalSeconds: 3,
  fungalRadius: 60,
  fungalLimit: 24,
  /** Biological Bloom: every new patch sprouts one Thornling (GDD 5.11). */
  fungalSprouts: 1,
} as const;
