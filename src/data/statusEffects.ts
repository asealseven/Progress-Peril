// Status effects and status reactions (GDD 9.9, 9.14).
// Numbers with no GDD value sit in STATUS_RULES and REACTION_RULES in tiers.ts.

import type { DamageType } from './damageTypes';
import { DAMAGE_TYPE_COLOURS, PALETTE } from './palette';

export const STATUS_EFFECTS = [
  'Burning',
  'Poisoned',
  'Corroded',
  'Electrified',
  'Frozen',
  'Bleeding',
  'Stunned',
  'Infected',
  'Marked',
  'Overheated',
  'Short-circuited',
] as const;

export type StatusEffect = (typeof STATUS_EFFECTS)[number];

export const STATUS_COUNT = STATUS_EFFECTS.length;

/** Position of each status in per-enemy meter arrays. */
export const STATUS_INDEX: Readonly<Record<StatusEffect, number>> = Object.fromEntries(
  STATUS_EFFECTS.map((status, index) => [status, index]),
) as Record<StatusEffect, number>;

export interface StatusDef {
  readonly name: StatusEffect;
  /** Source wording from GDD 9.14. */
  readonly source: string;
  /** The damage type of hits counting as this status's source, where one exists. */
  readonly sourceType?: DamageType;
  /** Behaviour wording from GDD 9.14. */
  readonly behaviour: string;
  /** Artificial enemies wording from GDD 9.14. */
  readonly artificial: string;
  /** Damage type of the damage over time, where the status deals damage. */
  readonly damageType?: DamageType;
  /** Meter and outline colour: the colour of the source damage type (GDD 15.1). */
  readonly colour: string;
}

export const STATUS_DEFS: Readonly<Record<StatusEffect, StatusDef>> = {
  Burning: {
    name: 'Burning',
    source: 'Fire',
    sourceType: 'Fire',
    behaviour: 'Damage over time',
    artificial: 'Become Overheated instead',
    damageType: 'Fire',
    colour: DAMAGE_TYPE_COLOURS.Fire,
  },
  Poisoned: {
    name: 'Poisoned',
    source: 'Toxic',
    sourceType: 'Toxic',
    behaviour: 'Damage over time, ignores Armour',
    artificial: 'Immune',
    damageType: 'Toxic',
    colour: DAMAGE_TYPE_COLOURS.Toxic,
  },
  Corroded: {
    name: 'Corroded',
    source: 'Corrosive',
    sourceType: 'Corrosive',
    behaviour: 'Lowers Armour. Stronger against Metallic enemies',
    artificial: 'Full effect',
    colour: DAMAGE_TYPE_COLOURS.Corrosive,
  },
  Electrified: {
    name: 'Electrified',
    source: 'Electric',
    sourceType: 'Electric',
    behaviour: 'Damage over time with a chance to arc',
    artificial: 'Short-circuited instead: a brief stop',
    damageType: 'Electric',
    colour: DAMAGE_TYPE_COLOURS.Electric,
  },
  Frozen: {
    name: 'Frozen',
    source: 'Cold',
    sourceType: 'Cold',
    behaviour: 'Each hit slows. A full meter freezes the target',
    artificial: 'Full effect',
    colour: DAMAGE_TYPE_COLOURS.Cold,
  },
  Bleeding: {
    name: 'Bleeding',
    source: 'Slashing',
    sourceType: 'Slashing',
    behaviour: 'Damage over time, faster while the target moves',
    artificial: 'Immune',
    damageType: 'Slashing',
    colour: DAMAGE_TYPE_COLOURS.Slashing,
  },
  Stunned: {
    name: 'Stunned',
    source: 'Impact',
    sourceType: 'Impact',
    behaviour: 'Brief stop. The Stun meter grows after each stun',
    artificial: 'Full effect',
    colour: DAMAGE_TYPE_COLOURS.Impact,
  },
  Infected: {
    name: 'Infected',
    source: 'Biological',
    sourceType: 'Biological',
    behaviour: 'Damage over time. Spreads to a nearby enemy on death',
    artificial: 'Immune',
    damageType: 'Biological',
    colour: DAMAGE_TYPE_COLOURS.Biological,
  },
  Marked: {
    name: 'Marked',
    source: 'Precise',
    behaviour: 'Critical Chance against the target up',
    artificial: 'Full effect',
    colour: PALETTE.brass,
  },
  Overheated: {
    name: 'Overheated',
    source: 'Fire on Artificial enemies',
    behaviour: 'Slower attacks. Extra Electric and Cold damage taken',
    artificial: 'Artificial only',
    colour: DAMAGE_TYPE_COLOURS.Fire,
  },
  // GDD 9.14 names this effect in the Electrified row: the Artificial replacement.
  'Short-circuited': {
    name: 'Short-circuited',
    source: 'Electric on Artificial enemies',
    behaviour: 'A brief stop',
    artificial: 'Artificial only',
    colour: DAMAGE_TYPE_COLOURS.Electric,
  },
};

/** The status each damage type builds (GDD 7.13). Piercing builds none. */
export const STATUS_FOR_DAMAGE_TYPE: Readonly<Partial<Record<DamageType, StatusEffect>>> = {
  Slashing: 'Bleeding',
  Impact: 'Stunned',
  Fire: 'Burning',
  Cold: 'Frozen',
  Electric: 'Electrified',
  Toxic: 'Poisoned',
  Corrosive: 'Corroded',
  Biological: 'Infected',
};

/** Statuses from Chemistry damage types, for the Chemical Ballistics synergy (GDD 7.19). */
export const CHEMISTRY_STATUSES: readonly StatusEffect[] = ['Burning', 'Corroded'];

/** Artificial enemies swap two statuses and shrug off three (GDD 9.11, 9.14). */
export const ARTIFICIAL_REPLACEMENT: Readonly<Partial<Record<StatusEffect, StatusEffect>>> = {
  Burning: 'Overheated',
  Electrified: 'Short-circuited',
};
export const ARTIFICIAL_IMMUNE: readonly StatusEffect[] = ['Poisoned', 'Bleeding', 'Infected'];

export const REACTIONS = [
  'Shatter',
  'Steam Burst',
  'Toxic Fumes',
  'Galvanic Surge',
  'Septic Wound',
  'Short Circuit',
  'Calculated Strike',
] as const;

export type Reaction = (typeof REACTIONS)[number];

export interface ReactionDef {
  readonly name: Reaction;
  /** Trigger and effect wording from GDD 9.14. */
  readonly trigger: string;
  readonly effect: string;
  readonly colour: string;
}

export const REACTION_DEFS: Readonly<Record<Reaction, ReactionDef>> = {
  Shatter: {
    name: 'Shatter',
    trigger: 'Impact hit on a Frozen enemy',
    effect: 'Burst damage. Ends Frozen',
    colour: DAMAGE_TYPE_COLOURS.Cold,
  },
  'Steam Burst': {
    name: 'Steam Burst',
    trigger: 'Fire hit on a Frozen enemy, or Cold hit on a Burning enemy',
    effect: 'Small area burst. Ends both effects',
    colour: DAMAGE_TYPE_COLOURS.Slashing,
  },
  'Toxic Fumes': {
    name: 'Toxic Fumes',
    trigger: 'Burning and Poisoned together',
    effect: 'Poison cloud around the target',
    colour: DAMAGE_TYPE_COLOURS.Toxic,
  },
  'Galvanic Surge': {
    name: 'Galvanic Surge',
    trigger: 'Electrified and Corroded together',
    effect: 'Electric damage up against the target',
    colour: DAMAGE_TYPE_COLOURS.Electric,
  },
  'Septic Wound': {
    name: 'Septic Wound',
    trigger: 'Bleeding and Infected together',
    effect: 'Infection spreads faster',
    colour: DAMAGE_TYPE_COLOURS.Biological,
  },
  'Short Circuit': {
    name: 'Short Circuit',
    trigger: 'Electric hit on an Overheated enemy',
    effect: 'Stun plus burst damage',
    colour: DAMAGE_TYPE_COLOURS.Electric,
  },
  'Calculated Strike': {
    name: 'Calculated Strike',
    trigger: 'Critical hit on a Marked enemy',
    effect: 'Critical Damage up for the hit, then Marked ends',
    colour: PALETTE.brass,
  },
};
