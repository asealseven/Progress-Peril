// The nine damage types (GDD 7.13). Milestone 3 adds status effects and matchups.

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
