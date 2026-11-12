// Economy tables: drops (GDD 14.1, 14.2), weapon grades (GDD 7.22), recipes,
// dismantling and merging (GDD 7.9, 7.23). Shop prices and stock sit in shop.ts.
// Numbers come from GDD.md as written. NOTES.md records the gaps.

import type { Quality } from './components';
import type { FactionName } from './palette';
import type { Tier } from './tiers';

export const MATERIALS = ['Scrap', 'Reagents', 'Crystals', 'Specimens'] as const;
export type Material = (typeof MATERIALS)[number];
export type MaterialStock = Record<Material, number>;

export function emptyMaterials(): MaterialStock {
  return { Scrap: 0, Reagents: 0, Crystals: 0, Specimens: 0 };
}

/** Gold per source (GDD 14.1). Mini-boss and boss gold arrive with Milestone 8. */
export const GOLD_DROPS = {
  normal: 1,
  elite: 4,
  champion: 12,
  miniBoss: 20,
  escortMiniBoss: 0,
  boss: 40,
} as const;

/** Materials and components per source (GDD 14.2). */
export const MATERIAL_DROPS = {
  /** Normal enemy: 6 per cent chance of 1. */
  normalChance: 0.06,
  /** Elite: 1, plus a 25 per cent chance of a second. */
  elite: 1,
  eliteSecondChance: 0.25,
  /** Elite: 5 per cent chance of a component. */
  eliteComponentChance: 0.05,
  /** Champion: 3 materials and one Rare or better component. */
  champion: 3,
  miniBoss: 4,
  boss: 8,
} as const;

/** Material types by faction (GDD 14.2). */
export const FACTION_MATERIALS: Readonly<Record<FactionName, readonly Material[]>> = {
  'Kingdom Armies': ['Scrap'],
  'Clockwork Legions': ['Scrap', 'Crystals'],
  'Failed Experiments': ['Reagents', 'Specimens'],
  Wilds: ['Specimens'],
  Outlaws: ['Scrap', 'Reagents'],
  Unknown: ['Crystals'],
};

/** The first matching tag of a component sets the material type (GDD 7.23). */
export const MATERIAL_TAGS: Readonly<Record<Material, readonly string[]>> = {
  Scrap: ['Metallic', 'Mechanical', 'Heavy', 'Light', 'Blade', 'Piercing', 'Ricochet', 'Orbit'],
  Reagents: ['Fire', 'Volatile', 'Toxic', 'Corrosive', 'Explosive', 'Spray', 'Chain'],
  Crystals: ['Electric', 'Conductive', 'Magnetic', 'Cold', 'Precise', 'Thermal', 'Anomalous', 'Experimental'],
  Specimens: ['Biological', 'Organic', 'Fungal', 'Parasite', 'Armoured'],
};

/** Weapon grades I to IV: gold and Scrap (GDD 7.22). Grades are bought in order. */
export const UPGRADE_COSTS: ReadonlyArray<{ readonly gold: number; readonly scrap: number }> = [
  { gold: 25, scrap: 2 },
  { gold: 50, scrap: 4 },
  { gold: 90, scrap: 6 },
  { gold: 140, scrap: 8 },
];

export const MAX_GRADE = 4;
export const GRADE_NUMERALS = ['', 'I', 'II', 'III', 'IV'] as const;

/** Stats a grade raises by one step (GDD 7.22). */
export const UPGRADE_STATS = ['damage', 'attackSpeed', 'criticalChance', 'range', 'area', 'statusBuildUp'] as const;
export type UpgradeStat = (typeof UPGRADE_STATS)[number];

/** Upgrade categories (GDD 7.8). */
export const UPGRADE_CATEGORY: Readonly<Record<UpgradeStat, 'Performance' | 'Efficiency' | 'Specialisation'>> = {
  damage: 'Performance',
  attackSpeed: 'Efficiency',
  criticalChance: 'Specialisation',
  range: 'Specialisation',
  area: 'Specialisation',
  statusBuildUp: 'Specialisation',
};

export const UPGRADE_LABELS: Readonly<Record<UpgradeStat, string>> = {
  damage: 'Damage',
  attackSpeed: 'Attack Speed',
  criticalChance: 'Critical Chance',
  range: 'Range',
  area: 'Area',
  statusBuildUp: 'Status Build-up',
};

/** Recipes: gold and materials by quality (GDD 7.23). Extraordinary components are not buildable. */
export const RECIPE_COSTS: Readonly<Record<Quality, { readonly gold: number; readonly materials: number } | undefined>> = {
  Common: { gold: 10, materials: 2 },
  Uncommon: { gold: 20, materials: 4 },
  Rare: { gold: 35, materials: 7 },
  Experimental: { gold: 60, materials: 9 },
  Extraordinary: undefined,
};

/** Merging two copies of a weapon costs 50 gold at the workshop (GDD 7.23). */
export const MERGE_COST = 50;

/**
 * Economy numbers with no value in GDD.md. NOTES.md records each choice.
 */
export const ECONOMY_RULES = {
  /** Each merge raises the survivor's Damage by this size (GDD 7.10, "improve base statistics"). */
  mergeDamage: 'Low' as Tier,
  /** A status build-up step multiplies the meter fill by this factor, close to one row step. */
  statusStepFactor: 1.6,
  /** Specimen Jar: chance of one extra Specimen per kill, as a modifier size. */
  resourceOnKillChance: 'Low' as Tier,
  /** Pickups fly to the player at this speed, pixels per second. */
  pickupSpeed: 520,
  /** Gold pickups closer than this merge into one, pixels. */
  pickupMergeDistance: 26,
  /** Stat steps and default components a weapon gains by quality (GDD 7.17). */
  qualitySteps: { Common: 0, Uncommon: 0, Rare: 1, Experimental: 1, Extraordinary: 2 },
  qualityDefaults: { Common: 0, Uncommon: 1, Rare: 1, Experimental: 2, Extraordinary: 2 },
  /** Share of shop slots holding a component when the shop stocks both kinds at the rolled quality. */
  componentShare: 0.65,
} as const;
