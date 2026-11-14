// Shops (GDD 6.1 to 6.6): three keepers with separate stock, visit rules,
// prices by quality and stock odds by territory.

import type { ComponentDef, Quality } from './components';
import type { WeaponDef, WeaponFamily } from './weapons';

export const SHOP_IDS = ['blacksmith', 'alchemist', 'royal-inventor'] as const;
export type ShopId = (typeof SHOP_IDS)[number];

export interface ShopDef {
  readonly id: ShopId;
  readonly name: string;
  /** Keeper personality from GDD 15.8. */
  readonly keeper: string;
  /** Stock wording from GDD 6.6. */
  readonly stockText: string;
  readonly weaponFamilies: readonly WeaponFamily[];
}

export const SHOPS: Readonly<Record<ShopId, ShopDef>> = {
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    keeper: 'A gruff blacksmith',
    stockText: 'Melee, Ranged and Siege weapons. Structure and Mechanism components.',
    weaponFamilies: ['Melee', 'Ranged', 'Siege'],
  },
  alchemist: {
    id: 'alchemist',
    name: 'Alchemist',
    keeper: 'A twitchy alchemist',
    stockText: 'Alchemical weapons. Payload components. Chemistry and Biology parts.',
    weaponFamilies: ['Alchemical'],
  },
  'royal-inventor': {
    id: 'royal-inventor',
    name: 'Royal Inventor',
    keeper: 'A pompous royal inventor',
    stockText: 'Mechanical and Experimental weapons. Auxiliary components. Physics and Mathematics parts.',
    weaponFamilies: ['Mechanical', 'Experimental'],
  },
};

/** Tags by discipline, for the stock rules in GDD 6.6 (NOTES.md). */
const CHEMISTRY_BIOLOGY: readonly string[] = [
  'Fire',
  'Toxic',
  'Corrosive',
  'Volatile',
  'Explosive',
  'Spray',
  'Biological',
  'Organic',
  'Fungal',
  'Parasite',
];
const PHYSICS_MATHEMATICS: readonly string[] = [
  'Electric',
  'Conductive',
  'Magnetic',
  'Cold',
  'Thermal',
  'Anomalous',
  'Precise',
  'Experimental',
];

/**
 * The one shop stocking a component (GDD 6.6). Payload parts go to the
 * Alchemist and Auxiliary parts to the Royal Inventor. Structure and
 * Mechanism parts follow their tags, and the rest go to the Blacksmith.
 */
export function shopForComponent(component: ComponentDef): ShopId {
  if (component.slot === 'Payload') return 'alchemist';
  if (component.slot === 'Auxiliary') return 'royal-inventor';
  if (component.tags.some((tag) => CHEMISTRY_BIOLOGY.includes(tag))) return 'alchemist';
  if (component.tags.some((tag) => PHYSICS_MATHEMATICS.includes(tag))) return 'royal-inventor';
  return 'blacksmith';
}

export function shopForWeapon(weapon: WeaponDef): ShopId {
  for (const id of SHOP_IDS) {
    if (SHOPS[id].weaponFamilies.includes(weapon.family)) return id;
  }
  return 'blacksmith';
}

/** Visit rules (GDD 6.4, 6.5). */
export const SHOP_RULES = {
  visitFee: 20,
  paidSlots: 5,
  freeSlots: 6,
  rerollBase: 5,
  rerollStep: 5,
  purchasesPerVisit: 100,
  /** High-ranking caps per visit. */
  experimentalCap: 2,
  extraordinaryCap: 1,
  /** Shop prices rise 20 per cent per territory. */
  territoryPriceGrowth: 0.2,
} as const;

/** Territory 1 base prices in gold (GDD 6.6). */
export const SHOP_PRICES: Readonly<Record<Quality, { readonly component: number; readonly weapon: number }>> = {
  Common: { component: 25, weapon: 40 },
  Uncommon: { component: 45, weapon: 70 },
  Rare: { component: 75, weapon: 110 },
  Experimental: { component: 120, weapon: 160 },
  Extraordinary: { component: 180, weapon: 220 },
};

/** Stock odds per slot by territory, in per cent, Common to Extraordinary (GDD 6.6). */
export const STOCK_ODDS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [60, 30, 9, 1, 0],
  [40, 35, 20, 4, 1],
  [25, 35, 28, 9, 3],
];

/** Colours for quality labels on cards. */
export const QUALITY_COLOURS: Readonly<Record<Quality, string>> = {
  Common: '#6B635A',
  Uncommon: '#4E7A3A',
  Rare: '#2F6A8A',
  Experimental: '#6E4FA3',
  Extraordinary: '#C8902A',
};
