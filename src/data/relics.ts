// Kingdom Relics (GDD 5.12): the unique territory reward. After each
// territory boss the player picks one of the beaten kingdom's three relics.
// Relics last for the rest of the run and take no slots. Effects are typed
// descriptors. One modifier system applies them under the 'relics' source.

import type { DamageType } from './damageTypes';
import type { KingdomName } from './palette';
import type { Tier } from './tiers';

export type RelicId =
  | 'regents-crown'
  | 'crucible-heart'
  | 'royal-writ'
  | 'mutagen-flask'
  | 'abomination-gland'
  | 'catalyst-stone'
  | 'automaton-core'
  | 'gearwork-heart'
  | 'assembly-blueprints'
  | 'shard-of-the-unmaking'
  | 'probability-lens'
  | 'gravity-anchor'
  | 'sovereign-spore'
  | 'heartwood-seed'
  | 'bloom-crown';

/** Named relic rules: effects no stat descriptor covers. */
export type RelicRule =
  | 'shopDiscount'
  | 'recipeHalfGold'
  | 'mutagenFlask'
  | 'shardTags'
  | 'gravitySlow'
  | 'bloomDrops'
  | 'adaptationCap'
  | 'infectedSpread'
  | 'reactionDamage';

export type RelicEffect =
  /** Moves a player stat up whole steps on its tier row (GDD 3.6). */
  | { readonly kind: 'playerSteps'; readonly stat: 'armour' | 'regeneration' | 'fortune' | 'constructStrength'; readonly steps: number }
  /** "Up, Tier": a percentage of the modifier size row. */
  | { readonly kind: 'playerStat'; readonly stat: 'pickupRadius'; readonly tier: Tier }
  | {
      readonly kind: 'weaponStat';
      readonly stat: 'damage' | 'attackSpeed' | 'criticalChance';
      readonly tier: Tier;
      readonly damageType?: DamageType;
    }
  | { readonly kind: 'rule'; readonly rule: RelicRule; readonly amount: number };

export interface RelicDef {
  readonly id: RelicId;
  readonly name: string;
  readonly kingdom: KingdomName;
  /** GDD 5.12 effect wording, for tooltips. */
  readonly effect: string;
  readonly effects: readonly RelicEffect[];
}

const relic = (id: RelicId, name: string, kingdom: KingdomName, effect: string, effects: readonly RelicEffect[]): RelicDef => ({
  id,
  name,
  kingdom,
  effect,
  effects,
});

export const RELICS: Readonly<Record<RelicId, RelicDef>> = {
  'regents-crown': relic('regents-crown', "Regent's Crown", 'Keldrath', 'Armour up two steps', [
    { kind: 'playerSteps', stat: 'armour', steps: 2 },
  ]),
  'crucible-heart': relic('crucible-heart', 'Crucible Heart', 'Keldrath', 'Fire and Impact damage up, Medium', [
    { kind: 'weaponStat', stat: 'damage', tier: 'Medium', damageType: 'Fire' },
    { kind: 'weaponStat', stat: 'damage', tier: 'Medium', damageType: 'Impact' },
  ]),
  'royal-writ': relic('royal-writ', 'Royal Writ', 'Keldrath', 'Shop prices down 15 per cent for the rest of the run', [
    { kind: 'rule', rule: 'shopDiscount', amount: 0.15 },
  ]),
  'mutagen-flask': relic('mutagen-flask', 'Mutagen Flask', 'Myrathis', 'Each round, one random stat gains a step for the round', [
    { kind: 'rule', rule: 'mutagenFlask', amount: 1 },
  ]),
  'abomination-gland': relic('abomination-gland', 'Abomination Gland', 'Myrathis', 'Damage adaptation cap up one step', [
    { kind: 'rule', rule: 'adaptationCap', amount: 1 },
  ]),
  'catalyst-stone': relic('catalyst-stone', 'Catalyst Stone', 'Myrathis', 'Status reaction damage up, High', [
    { kind: 'rule', rule: 'reactionDamage', amount: 1 },
  ]),
  'automaton-core': relic('automaton-core', 'Automaton Core', 'Merovant', 'Construct Strength up two steps', [
    { kind: 'playerSteps', stat: 'constructStrength', steps: 2 },
  ]),
  'gearwork-heart': relic('gearwork-heart', 'Gearwork Heart', 'Merovant', 'Attack Speed up, Medium', [
    { kind: 'weaponStat', stat: 'attackSpeed', tier: 'Medium' },
  ]),
  'assembly-blueprints': relic('assembly-blueprints', 'Assembly Blueprints', 'Merovant', 'Workshop recipes cost half gold', [
    { kind: 'rule', rule: 'recipeHalfGold', amount: 0.5 },
  ]),
  'shard-of-the-unmaking': relic('shard-of-the-unmaking', 'Shard of the Unmaking', 'Orthelyn', 'Each round, every weapon gains one random extra tag', [
    { kind: 'rule', rule: 'shardTags', amount: 1 },
  ]),
  'probability-lens': relic('probability-lens', 'Probability Lens', 'Orthelyn', 'Fortune up two steps. Critical Chance up, Low', [
    { kind: 'playerSteps', stat: 'fortune', steps: 2 },
    { kind: 'weaponStat', stat: 'criticalChance', tier: 'Low' },
  ]),
  'gravity-anchor': relic('gravity-anchor', 'Gravity Anchor', 'Orthelyn', 'Pickup Radius up, Extreme. Enemies near the player slow down', [
    { kind: 'playerStat', stat: 'pickupRadius', tier: 'Extreme' },
    { kind: 'rule', rule: 'gravitySlow', amount: 1 },
  ]),
  'sovereign-spore': relic('sovereign-spore', 'Sovereign Spore', 'Nymora', 'Infected spreads to two extra enemies on death', [
    { kind: 'rule', rule: 'infectedSpread', amount: 2 },
  ]),
  'heartwood-seed': relic('heartwood-seed', 'Heartwood Seed', 'Nymora', 'Regeneration up two steps', [
    { kind: 'playerSteps', stat: 'regeneration', steps: 2 },
  ]),
  'bloom-crown': relic('bloom-crown', 'Bloom Crown', 'Nymora', 'Kills sometimes drop healing blooms', [
    { kind: 'rule', rule: 'bloomDrops', amount: 1 },
  ]),
};

export const RELIC_LIST: readonly RelicDef[] = Object.values(RELICS);

/** The summed amount of a relic rule across the relics held. 0 means the rule is off. */
export function relicRuleTotal(relics: readonly RelicId[], rule: RelicRule): number {
  let total = 0;
  for (const id of relics) {
    for (const effect of RELICS[id].effects) if (effect.kind === 'rule' && effect.rule === rule) total += effect.amount;
  }
  return total;
}

/** Every stat effect of a kind across the relics held. */
export function relicEffects<K extends RelicEffect['kind']>(relics: readonly RelicId[], kind: K): Array<Extract<RelicEffect, { kind: K }>> {
  const found: Array<Extract<RelicEffect, { kind: K }>> = [];
  for (const id of relics) {
    for (const effect of RELICS[id].effects) if (effect.kind === kind) found.push(effect as Extract<RelicEffect, { kind: K }>);
  }
  return found;
}

export function relicsOf(kingdom: KingdomName): RelicDef[] {
  return RELIC_LIST.filter((entry) => entry.kingdom === kingdom);
}

/** Numbers with no GDD value. NOTES.md records each choice. */
export const RELIC_RULES = {
  /** One step of a stat with no tier row, such as Construct Strength or Fortune, as a share. */
  stepShare: 0.2,
  /** Gravity Anchor: enemies inside this radius move at this speed share. */
  gravityRadius: 180,
  gravitySlow: 0.75,
  /** Bloom Crown: "sometimes" means this chance per kill. */
  bloomChance: 0.04,
  bloomSeconds: 6,
} as const;
