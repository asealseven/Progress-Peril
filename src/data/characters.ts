// Characters. GDD 16.7 has no roster yet, so the game has one: The Inventor
// (CLAUDE.md "Characters"). New characters slot in here later.

import type { Tier } from './tiers';

/** Player stats with a numeric tier table (GDD 3.6). */
export interface CharacterBaseStats {
  readonly maxHealth: Tier;
  readonly armour: Tier;
  readonly regeneration: Tier;
  readonly evasion: Tier;
  readonly moveSpeed: Tier;
  readonly pickupRadius: Tier;
  readonly criticalChance: Tier;
  readonly criticalDamage: Tier;
}

export interface CharacterDef {
  readonly id: string;
  readonly name: string;
  readonly baseStats: CharacterBaseStats;
  /** Names of the weapons the player chooses a starting weapon from. */
  readonly startingWeapons: readonly string[];
}

export const CHARACTERS = {
  inventor: {
    id: 'inventor',
    name: 'The Inventor',
    baseStats: {
      maxHealth: 'Medium',
      armour: 'Low',
      regeneration: 'Minimal',
      evasion: 'Minimal',
      moveSpeed: 'Medium',
      pickupRadius: 'Low',
      criticalChance: 'Low',
      criticalDamage: 'Medium',
    },
    startingWeapons: ['Forged Longsword', 'War Hammer', 'Pike', 'Crossbow', 'Longbow', 'Knife Bandolier'],
  },
} as const satisfies Record<string, CharacterDef>;

export type CharacterId = keyof typeof CHARACTERS;
