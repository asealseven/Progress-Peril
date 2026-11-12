// Bit flags for signature traits and elite modifiers, so the enemy loop tests
// them with one mask instead of a list search.

import { ELITE_MODIFIER_IDS } from '../../data/eliteModifiers';
import type { EliteModifierId } from '../../data/eliteModifiers';
import { ENEMY_TRAITS } from '../../data/enemies';
import type { EnemyDef, EnemyTrait } from '../../data/enemies';
import type { Enemy } from './types';

const TRAIT_BIT = Object.fromEntries(ENEMY_TRAITS.map((trait, index) => [trait, 1 << index])) as Record<
  EnemyTrait,
  number
>;

const MODIFIER_BIT = Object.fromEntries(ELITE_MODIFIER_IDS.map((id, index) => [id, 1 << index])) as Record<
  EliteModifierId,
  number
>;

const cache = new Map<EnemyDef, number>();

export function traitBitsOf(def: EnemyDef): number {
  let bits = cache.get(def);
  if (bits === undefined) {
    bits = 0;
    for (const trait of def.traits) bits |= TRAIT_BIT[trait];
    cache.set(def, bits);
  }
  return bits;
}

export function hasTrait(enemy: Enemy, trait: EnemyTrait): boolean {
  return (enemy.traitBits & TRAIT_BIT[trait]) !== 0;
}

export function hasModifier(enemy: Enemy, id: EliteModifierId): boolean {
  return (enemy.modifierBits & MODIFIER_BIT[id]) !== 0;
}

/** Adds an elite modifier's flag. Returns false when the enemy carries the modifier already. */
export function addModifierFlag(enemy: Enemy, id: EliteModifierId): boolean {
  if (hasModifier(enemy, id)) return false;
  enemy.modifierBits |= MODIFIER_BIT[id];
  enemy.modifiers.push(id);
  return true;
}

/** Juggernaut champions ignore Stun, knockback and slows (GDD 9.13). */
export function isJuggernaut(enemy: Enemy): boolean {
  return enemy.championTrait === 'juggernaut';
}
