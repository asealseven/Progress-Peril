// The nine damage types (GDD 7.13).

export const DAMAGE_TYPES = [
  'Slashing',
  'Piercing',
  'Impact',
  'Fire',
  'Cold',
  'Electric',
  'Toxic',
  'Corrosive',
  'Biological',
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

export type Discipline = 'Engineering' | 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics';

export interface DamageTypeDef {
  readonly name: DamageType;
  readonly discipline: Discipline;
  /** Status effect wording from GDD 7.13. */
  readonly statusText: string;
  readonly strongAgainst: string;
  readonly weakAgainst: string;
}

export const DAMAGE_TYPE_DEFS: Readonly<Record<DamageType, DamageTypeDef>> = {
  Slashing: {
    name: 'Slashing',
    discipline: 'Engineering',
    statusText: 'Bleeding',
    strongAgainst: 'Organic, unarmoured',
    weakAgainst: 'Armoured, Artificial',
  },
  Piercing: {
    name: 'Piercing',
    discipline: 'Engineering',
    statusText: 'None. Gains penetration',
    strongAgainst: 'Single targets, lines of enemies',
    weakAgainst: 'Shields, Stone',
  },
  Impact: {
    name: 'Impact',
    discipline: 'Engineering',
    statusText: 'Stunned',
    strongAgainst: 'Armoured, Stone, Chitin shells',
    weakAgainst: 'Fast swarms',
  },
  Fire: {
    name: 'Fire',
    discipline: 'Chemistry',
    statusText: 'Burning. Overheated on Artificial enemies',
    strongAgainst: 'Organic, Fungal',
    weakAgainst: 'Stone, Volatile',
  },
  Cold: {
    name: 'Cold',
    discipline: 'Physics',
    statusText: 'Frozen',
    strongAgainst: 'Fast enemies, Volatile',
    weakAgainst: 'Heavy, Stone',
  },
  Electric: {
    name: 'Electric',
    discipline: 'Physics',
    statusText: 'Electrified. Short-circuited on Artificial enemies',
    strongAgainst: 'Metallic, Mechanical',
    weakAgainst: 'Stone, Fungal',
  },
  Toxic: {
    name: 'Toxic',
    discipline: 'Biology',
    statusText: 'Poisoned',
    strongAgainst: 'Organic, Beast',
    weakAgainst: 'Artificial (immune), Fungal',
  },
  Corrosive: {
    name: 'Corrosive',
    discipline: 'Chemistry',
    statusText: 'Corroded',
    strongAgainst: 'Metallic, Armoured',
    weakAgainst: 'Unarmoured enemies',
  },
  Biological: {
    name: 'Biological',
    discipline: 'Biology',
    statusText: 'Infected',
    strongAgainst: 'Groups of Organic enemies',
    weakAgainst: 'Artificial (immune)',
  },
};

/**
 * Damage types whose weapons build their status with no payload
 * (NOTES.md, Milestone 3). Slashing, Piercing and Impact weapons build a
 * status only where GDD 7.17 names one, or through a payload component.
 */
export const ELEMENTAL_TYPES: readonly DamageType[] = ['Fire', 'Cold', 'Electric', 'Toxic', 'Corrosive', 'Biological'];
