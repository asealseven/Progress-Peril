// Weapon catalogue (GDD 7.17). Milestone 1 holds the Crossbow. Milestone 2 adds the other 23.

import type { DamageType } from './damageTypes';
import type { Tier } from './tiers';

export type WeaponFamily = 'Melee' | 'Ranged' | 'Mechanical' | 'Siege' | 'Alchemical' | 'Experimental';

/** Targeting rules from GDD 7.15. */
export type TargetingRule = 'Nearest' | 'Strongest' | 'Clustered' | 'Highest threat' | 'Marked first' | 'Random';

/** Projectile behaviours from GDD 7.16. */
export type ProjectileBehaviour =
  | 'Straight'
  | 'Arcing'
  | 'Piercing'
  | 'Ricochet'
  | 'Homing'
  | 'Chain'
  | 'Beam'
  | 'Cone'
  | 'Aura'
  | 'Orbit';

export interface WeaponDef {
  readonly id: string;
  readonly name: string;
  readonly family: WeaponFamily;
  readonly damage: Tier;
  readonly attackSpeed: Tier;
  readonly range: Tier;
  readonly area: Tier;
  readonly tags: readonly string[];
  readonly damageType: DamageType;
  readonly behaviour: ProjectileBehaviour;
  readonly targeting: TargetingRule;
  /** Weapon Critical Chance tier, where GDD 7.17 names one. */
  readonly criticalChance?: Tier;
  readonly discipline: string;
  /** Behaviour wording from GDD 7.17, for tooltips. */
  readonly description: string;
}

export const WEAPONS = {
  crossbow: {
    id: 'crossbow',
    name: 'Crossbow',
    family: 'Ranged',
    damage: 'High',
    attackSpeed: 'Low',
    range: 'High',
    area: 'Minimal',
    tags: ['Bolt', 'Projectile'],
    damageType: 'Piercing',
    behaviour: 'Straight',
    targeting: 'Nearest',
    criticalChance: 'High',
    discipline: 'Engineering',
    description: 'High Critical Chance.',
  },
} as const satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;
