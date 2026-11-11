// Enemy roster (GDD 9.8, 9.10, 9.11). Milestone 1 holds the Royal Footman.
// Milestone 4 adds the other 22.

import type { DamageType } from './damageTypes';
import type { FactionName } from './palette';
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

export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly faction: FactionName;
  readonly role: EnemyRole;
  readonly health: Tier;
  readonly damage: Tier;
  readonly speed: Tier;
  readonly range: Tier;
  readonly armour: Tier;
  readonly threat: Tier;
  readonly properties: readonly string[];
  readonly weakTo: readonly DamageType[];
  readonly resists: readonly DamageType[];
  /** Damage type of the enemy's attacks. See NOTES.md, GDD 9.10. */
  readonly damageType: DamageType;
  /** Signature behaviour wording from GDD 9.11. */
  readonly behaviour: string;
  /** Placeholder circle radius, logical pixels. */
  readonly radius: number;
}

export const ENEMIES = {
  'royal-footman': {
    id: 'royal-footman',
    name: 'Royal Footman',
    faction: 'Kingdom Armies',
    role: 'Bruiser',
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
    radius: PLACEHOLDER_RADIUS.standard,
  },
} as const satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
