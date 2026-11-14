// Specialisations (GDD 11.12): ten, two per discipline, 100 Archive Points
// each. Each pairs a bonus with a drawback. Effects are typed descriptors
// applied under the 'archive' modifier source.

import type { DamageType } from './damageTypes';
import type { StatusEffect } from './statusEffects';
import type { Tier } from './tiers';
import type { Discipline, WeaponFamily } from './weapons';

export type SpecialisationId =
  | 'pyrotechnist'
  | 'toxicologist'
  | 'electrician'
  | 'kineticist'
  | 'field-medic'
  | 'naturalist'
  | 'mechanic'
  | 'siegewright'
  | 'gambler'
  | 'accountant';

/** Rules no stat descriptor covers. */
export type SpecialisationRule = 'chainJump' | 'directHitDown' | 'specimenYield' | 'goldDown' | 'shopDiscount';

export type SpecialisationEffect =
  | {
      readonly kind: 'weaponStat';
      readonly stat: 'damage' | 'attackSpeed' | 'area' | 'knockback' | 'projectileSpeed' | 'criticalChance';
      readonly tier: Tier;
      readonly direction: 'up' | 'down';
      readonly damageType?: DamageType;
      readonly family?: WeaponFamily;
    }
  | {
      readonly kind: 'playerStat';
      readonly stat: 'maxHealth' | 'regeneration' | 'moveSpeed' | 'armour' | 'fortune' | 'researchYield' | 'constructStrength';
      readonly tier: Tier;
      readonly direction: 'up' | 'down';
    }
  | { readonly kind: 'statusFill'; readonly statuses: readonly StatusEffect[]; readonly tier: Tier }
  | { readonly kind: 'rule'; readonly rule: SpecialisationRule; readonly amount: number };

export interface SpecialisationDef {
  readonly id: SpecialisationId;
  readonly name: string;
  readonly discipline: Discipline;
  readonly bonus: string;
  readonly drawback: string;
  readonly effects: readonly SpecialisationEffect[];
}

const spec = (
  id: SpecialisationId,
  name: string,
  discipline: Discipline,
  bonus: string,
  drawback: string,
  effects: readonly SpecialisationEffect[],
): SpecialisationDef => ({ id, name, discipline, bonus, drawback, effects });

export const SPECIALISATIONS: Readonly<Record<SpecialisationId, SpecialisationDef>> = {
  pyrotechnist: spec('pyrotechnist', 'Pyrotechnist', 'Chemistry', 'Fire damage up, Medium', 'Cold damage down, Low', [
    { kind: 'weaponStat', stat: 'damage', tier: 'Medium', direction: 'up', damageType: 'Fire' },
    { kind: 'weaponStat', stat: 'damage', tier: 'Low', direction: 'down', damageType: 'Cold' },
  ]),
  toxicologist: spec('toxicologist', 'Toxicologist', 'Chemistry', 'Poisoned and Corroded meters fill faster', 'Direct hit damage down, Low', [
    { kind: 'statusFill', statuses: ['Poisoned', 'Corroded'], tier: 'Medium' },
    { kind: 'rule', rule: 'directHitDown', amount: 1 },
  ]),
  electrician: spec('electrician', 'Electrician', 'Physics', 'Electric chains jump to one extra enemy', 'Max Health down, Low', [
    { kind: 'rule', rule: 'chainJump', amount: 1 },
    { kind: 'playerStat', stat: 'maxHealth', tier: 'Low', direction: 'down' },
  ]),
  kineticist: spec('kineticist', 'Kineticist', 'Physics', 'Knockback and projectile speed up, Medium', 'Area down, Low', [
    { kind: 'weaponStat', stat: 'knockback', tier: 'Medium', direction: 'up' },
    { kind: 'weaponStat', stat: 'projectileSpeed', tier: 'Medium', direction: 'up' },
    { kind: 'weaponStat', stat: 'area', tier: 'Low', direction: 'down' },
  ]),
  'field-medic': spec('field-medic', 'Field Medic', 'Biology', 'Regeneration up, Medium', 'Damage down, Low', [
    { kind: 'playerStat', stat: 'regeneration', tier: 'Medium', direction: 'up' },
    { kind: 'weaponStat', stat: 'damage', tier: 'Low', direction: 'down' },
  ]),
  naturalist: spec('naturalist', 'Naturalist', 'Biology', 'Specimen yield up, Medium', 'Gold drops down, Low', [
    { kind: 'rule', rule: 'specimenYield', amount: 1 },
    { kind: 'rule', rule: 'goldDown', amount: 1 },
  ]),
  mechanic: spec('mechanic', 'Mechanic', 'Engineering', 'Construct Strength up, Medium', 'Player Attack Speed down, Low', [
    { kind: 'playerStat', stat: 'constructStrength', tier: 'Medium', direction: 'up' },
    { kind: 'weaponStat', stat: 'attackSpeed', tier: 'Low', direction: 'down' },
  ]),
  siegewright: spec('siegewright', 'Siegewright', 'Engineering', 'Siege damage up, Medium', 'Move Speed down, Low', [
    { kind: 'weaponStat', stat: 'damage', tier: 'Medium', direction: 'up', family: 'Siege' },
    { kind: 'playerStat', stat: 'moveSpeed', tier: 'Low', direction: 'down' },
  ]),
  gambler: spec('gambler', 'Gambler', 'Mathematics', 'Critical Chance and Fortune up, Medium', 'Armour down, Low', [
    { kind: 'weaponStat', stat: 'criticalChance', tier: 'Medium', direction: 'up' },
    { kind: 'playerStat', stat: 'fortune', tier: 'Medium', direction: 'up' },
    { kind: 'playerStat', stat: 'armour', tier: 'Low', direction: 'down' },
  ]),
  accountant: spec('accountant', 'Accountant', 'Mathematics', 'Shop prices down 10 per cent. Research Yield up, Low', 'Damage down, Low', [
    { kind: 'rule', rule: 'shopDiscount', amount: 0.1 },
    { kind: 'playerStat', stat: 'researchYield', tier: 'Low', direction: 'up' },
    { kind: 'weaponStat', stat: 'damage', tier: 'Low', direction: 'down' },
  ]),
};

export const SPECIALISATION_LIST: readonly SpecialisationDef[] = Object.values(SPECIALISATIONS);

export function specialisationEffects<K extends SpecialisationEffect['kind']>(
  ids: readonly SpecialisationId[],
  kind: K,
): Array<Extract<SpecialisationEffect, { kind: K }>> {
  const found: Array<Extract<SpecialisationEffect, { kind: K }>> = [];
  for (const id of ids) {
    for (const effect of SPECIALISATIONS[id].effects) if (effect.kind === kind) found.push(effect as Extract<SpecialisationEffect, { kind: K }>);
  }
  return found;
}

export function specialisationRuleTotal(ids: readonly SpecialisationId[], rule: SpecialisationRule): number {
  let total = 0;
  for (const effect of specialisationEffects(ids, 'rule')) if (effect.rule === rule) total += effect.amount;
  return total;
}
