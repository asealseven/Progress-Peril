// The synergy database (GDD 7.19): 8 internal, 8 cross-weapon and 7 research synergies.
// `requires` and `effect` keep the GDD wording for the build panel.
// `requirement` is the typed form src/sim/synergies.ts evaluates.

import type { Tag } from './tags';
import type { WeaponFamily } from './weapons';

export type SynergyType = 'Internal' | 'Cross-weapon' | 'Research';

/** One thing a weapon must have. */
export type SynergyTerm =
  | { readonly tag: Tag }
  | { readonly family: WeaponFamily }
  /** A payload component building a Chemistry status (GDD 7.19, Chemical Ballistics). */
  | { readonly chemistryPayload: true };

export type SynergyRequirement =
  /** Every term on one weapon. Internal and research synergies. */
  | { readonly kind: 'oneWeapon'; readonly all: readonly SynergyTerm[] }
  /** One term on each of two different weapons. Cross-weapon synergies. */
  | { readonly kind: 'twoWeapons'; readonly first: SynergyTerm; readonly second: SynergyTerm }
  /** A number of different statuses built across the equipped weapons. */
  | { readonly kind: 'statuses'; readonly count: number };

export interface SynergyDef {
  readonly id: string;
  readonly name: string;
  readonly type: SynergyType;
  /** "Requires" wording from GDD 7.19. */
  readonly requires: string;
  /** Effect wording from GDD 7.19. */
  readonly effect: string;
  readonly requirement: SynergyRequirement;
}

function one(...all: SynergyTerm[]): SynergyRequirement {
  return { kind: 'oneWeapon', all };
}

function two(first: SynergyTerm, second: SynergyTerm): SynergyRequirement {
  return { kind: 'twoWeapons', first, second };
}

const tag = (name: Tag): SynergyTerm => ({ tag: name });
const family = (name: WeaponFamily): SynergyTerm => ({ family: name });

export const SYNERGY_LIST: readonly SynergyDef[] = [
  // --- Internal: the tags on one weapon -------------------------------------
  {
    id: 'conductive-strike',
    name: 'Conductive Strike',
    type: 'Internal',
    requires: 'Electric + Metallic',
    effect: 'Electric chains jump to one extra enemy',
    requirement: one(tag('Electric'), tag('Metallic')),
  },
  {
    id: 'pressure-burst',
    name: 'Pressure Burst',
    type: 'Internal',
    requires: 'Explosive + Heavy',
    effect: 'Explosion Area up, Medium',
    requirement: one(tag('Explosive'), tag('Heavy')),
  },
  {
    id: 'envenomed-edge',
    name: 'Envenomed Edge',
    type: 'Internal',
    requires: 'Toxic + Blade',
    effect: 'Poisoned damage ticks faster on Bleeding enemies',
    requirement: one(tag('Toxic'), tag('Blade')),
  },
  {
    id: 'flashpoint',
    name: 'Flashpoint',
    type: 'Internal',
    requires: 'Fire + Volatile',
    effect: 'Burning enemies explode on death',
    requirement: one(tag('Fire'), tag('Volatile')),
  },
  {
    id: 'rail-shot',
    name: 'Rail Shot',
    type: 'Internal',
    requires: 'Magnetic + Piercing',
    effect: 'Penetration plus two',
    requirement: one(tag('Magnetic'), tag('Piercing')),
  },
  {
    id: 'clockwork-precision',
    name: 'Clockwork Precision',
    type: 'Internal',
    requires: 'Mechanical + Precise',
    effect: 'Constructs inherit player Critical Chance',
    requirement: one(tag('Mechanical'), tag('Precise')),
  },
  {
    id: 'overgrowth',
    name: 'Overgrowth',
    type: 'Internal',
    requires: 'Organic + Biological',
    effect: 'Infected spreads to two enemies on death instead of one',
    requirement: one(tag('Organic'), tag('Biological')),
  },
  {
    id: 'steady-hand',
    name: 'Steady Hand',
    type: 'Internal',
    requires: 'Precise + Heavy',
    effect: 'The first hit on each enemy is a critical hit',
    requirement: one(tag('Precise'), tag('Heavy')),
  },

  // --- Cross-weapon: the tags spread across equipped weapons ---------------
  {
    id: 'galvanic-corrosion',
    name: 'Galvanic Corrosion',
    type: 'Cross-weapon',
    requires: 'Corrosive weapon + Electric weapon',
    effect: 'Galvanic Surge reactions deal double damage and arc to one nearby enemy',
    requirement: two(tag('Corrosive'), tag('Electric')),
  },
  {
    id: 'thermal-shock',
    name: 'Thermal Shock',
    type: 'Cross-weapon',
    requires: 'Fire weapon + Cold weapon',
    effect: 'Shatter and Steam Burst reactions deal Damage up, High',
    requirement: two(tag('Fire'), tag('Cold')),
  },
  {
    id: 'fungal-network',
    name: 'Fungal Network',
    type: 'Cross-weapon',
    requires: 'Two Biological weapons',
    effect: 'Damage to one Infected enemy spreads in part to other Infected enemies nearby',
    requirement: two(tag('Biological'), tag('Biological')),
  },
  {
    id: 'kill-zone',
    name: 'Kill Zone',
    type: 'Cross-weapon',
    requires: 'Trap weapon + Construct weapon',
    effect: 'Constructs focus trapped enemies with Damage up, Medium',
    requirement: two(tag('Trap'), tag('Construct')),
  },
  {
    id: 'ballistic-tables',
    name: 'Ballistic Tables',
    type: 'Cross-weapon',
    requires: 'Precise weapon + Arcing weapon',
    effect: 'Arcing shots lead moving targets. Area up, Low',
    requirement: two(tag('Precise'), tag('Arcing')),
  },
  {
    id: 'combined-arms',
    name: 'Combined Arms',
    type: 'Cross-weapon',
    requires: 'Melee weapon + Siege weapon',
    effect: 'Siege weapons target enemies recently hit by melee, with Damage up, Low',
    requirement: two(family('Melee'), family('Siege')),
  },
  {
    id: 'magnetic-field',
    name: 'Magnetic Field',
    type: 'Cross-weapon',
    requires: 'Two Magnetic weapons',
    effect: 'Pickup Radius up, High. Metallic enemies slow down near the player',
    requirement: two(tag('Magnetic'), tag('Magnetic')),
  },
  {
    id: 'catalytic-mix',
    name: 'Catalytic Mix',
    type: 'Cross-weapon',
    requires: 'Three different status payloads',
    effect: 'Status reactions deal Damage up, Medium',
    requirement: { kind: 'statuses', count: 3 },
  },

  // --- Research: a research node plus the tags -----------------------------
  {
    id: 'chemical-ballistics',
    name: 'Chemical Ballistics',
    type: 'Research',
    requires: 'Chemistry + Engineering node. Projectile + any Chemistry payload',
    effect: 'Projectiles leave a short trail carrying the payload status',
    requirement: one(tag('Projectile'), { chemistryPayload: true }),
  },
  {
    id: 'electromagnetic-launchers',
    name: 'Electromagnetic Launchers',
    type: 'Research',
    requires: 'Physics + Engineering node. Magnetic + Projectile',
    effect: 'Projectiles gain Piercing and Range up, Medium',
    requirement: one(tag('Magnetic'), tag('Projectile')),
  },
  {
    id: 'bioengineering',
    name: 'Bioengineering',
    type: 'Research',
    requires: 'Biology + Engineering node. Construct + Organic',
    effect: 'Constructs regenerate and grow stronger each round',
    requirement: one(tag('Construct'), tag('Organic')),
  },
  {
    id: 'conductive-toxins',
    name: 'Conductive Toxins',
    type: 'Research',
    requires: 'Chemistry + Physics + Biology node. Toxic + Electric',
    effect: 'Poisoned enemies conduct Electric chains',
    requirement: one(tag('Toxic'), tag('Electric')),
  },
  {
    id: 'recursive-artillery',
    name: 'Recursive Artillery',
    type: 'Research',
    requires: 'Engineering + Mathematics + Chemistry node. Siege + Explosive',
    effect: 'Each explosion triggers one smaller copy',
    requirement: one(family('Siege'), tag('Explosive')),
  },
  {
    id: 'kinetic-probability',
    name: 'Kinetic Probability',
    type: 'Research',
    requires: 'Physics + Mathematics node. Impact + Precise',
    effect: 'Knockback into walls or enemies counts as a critical hit',
    requirement: one(tag('Impact'), tag('Precise')),
  },
  {
    id: 'adaptive-armour',
    name: 'Adaptive Armour',
    type: 'Research',
    requires: 'Biology + Engineering node. Organic + Armoured',
    effect: 'Damage adaptation gain and cap double (Section 3.7)',
    requirement: one(tag('Organic'), tag('Armoured')),
  },
];

export const SYNERGIES: Readonly<Record<string, SynergyDef>> = Object.fromEntries(
  SYNERGY_LIST.map((entry) => [entry.id, entry]),
);

export type SynergyId = (typeof SYNERGY_LIST)[number]['id'];

/** Ids of the seven synergies needing a research node. Milestone 6 opens them through the research web. */
export const RESEARCH_SYNERGY_IDS: readonly string[] = SYNERGY_LIST.filter((entry) => entry.type === 'Research').map(
  (entry) => entry.id,
);
