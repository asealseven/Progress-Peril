// Tag counting and synergy activation (GDD 7.19).
// Synergies recalculate when the player presses Start (CLAUDE.md rule 7):
// resolveLoadout in loadout.ts calls evaluateSynergies once per round.

import type { StatusEffect } from '../data/statusEffects';
import { CHEMISTRY_STATUSES } from '../data/statusEffects';
import { SYNERGY_LIST } from '../data/synergies';
import type { SynergyDef, SynergyTerm } from '../data/synergies';
import type { Tag } from '../data/tags';
import type { WeaponFamily } from '../data/weapons';

/** What the synergy rules read from one equipped weapon. */
export interface SynergyWeapon {
  readonly tags: readonly Tag[];
  readonly family: WeaponFamily;
  /** Every status the weapon builds. */
  readonly statuses: readonly StatusEffect[];
  /** Statuses from the weapon's payload component. */
  readonly payloadStatuses: readonly StatusEffect[];
  /** Grand Calculus Engine: counts as one extra matching tag for every synergy on this weapon. */
  readonly wildcard: boolean;
}

export interface ActiveSynergy {
  readonly def: SynergyDef;
  /** Indices of the weapons taking part. */
  readonly weapons: readonly number[];
}

export interface NearMiss {
  readonly def: SynergyDef;
  /** Such as "one Electric tag from Conductive Strike" (GDD 7.19). */
  readonly text: string;
}

export interface SynergyReport {
  readonly active: readonly ActiveSynergy[];
  readonly nearMisses: readonly NearMiss[];
  /** Research synergies with matching tags and no research node yet. */
  readonly locked: readonly SynergyDef[];
}

function matches(weapon: SynergyWeapon, term: SynergyTerm): boolean {
  if ('tag' in term) return weapon.tags.includes(term.tag);
  if ('family' in term) return weapon.family === term.family;
  return weapon.payloadStatuses.some((status) => CHEMISTRY_STATUSES.includes(status));
}

function label(term: SynergyTerm, asWeapon: boolean): string {
  if ('tag' in term) return asWeapon ? `${term.tag} weapon` : `${term.tag} tag`;
  if ('family' in term) return `${term.family} weapon`;
  return 'Chemistry payload';
}

interface Outcome {
  weapons: number[];
  missing?: string;
}

/** Every term on one weapon. The wildcard stands in for one missing tag. */
function evaluateOneWeapon(weapons: readonly SynergyWeapon[], terms: readonly SynergyTerm[]): Outcome {
  const active: number[] = [];
  let missing: string | undefined;
  weapons.forEach((weapon, index) => {
    const unmatched = terms.filter((term) => !matches(weapon, term));
    if (unmatched.length === 0) {
      active.push(index);
      return;
    }
    const lone = unmatched[0];
    if (unmatched.length !== 1 || !lone) return;
    if (weapon.wildcard && 'tag' in lone) active.push(index);
    else if (missing === undefined) missing = label(lone, false);
  });
  return { weapons: active, missing: active.length === 0 ? missing : undefined };
}

/** One term on each of two different weapons. */
function evaluateTwoWeapons(weapons: readonly SynergyWeapon[], first: SynergyTerm, second: SynergyTerm): Outcome {
  const has = (index: number, term: SynergyTerm): boolean => {
    const weapon = weapons[index];
    return weapon !== undefined && matches(weapon, term);
  };
  const wild = (index: number, term: SynergyTerm): boolean => weapons[index]?.wildcard === true && 'tag' in term;
  const taking = new Set<number>();
  for (let i = 0; i < weapons.length; i++) {
    for (let j = 0; j < weapons.length; j++) {
      if (i === j) continue;
      const strict = has(i, first) && has(j, second);
      // The wildcard supplies one of the two tags, never both.
      const helped = (has(i, first) && wild(j, second)) || (wild(i, first) && has(j, second));
      if (strict || helped) {
        taking.add(i);
        taking.add(j);
      }
    }
  }
  if (taking.size > 0) return { weapons: [...taking].sort((a, b) => a - b) };

  const firstCount = weapons.filter((weapon) => matches(weapon, first)).length;
  const secondCount = weapons.filter((weapon) => matches(weapon, second)).length;
  if (firstCount > 0 && secondCount === 0) return { weapons: [], missing: label(second, true) };
  if (secondCount > 0 && firstCount === 0) return { weapons: [], missing: label(first, true) };
  // One weapon carries both tags: a second weapon with either tag completes the pair.
  if (firstCount > 0 && secondCount > 0) return { weapons: [], missing: label(second, true) };
  return { weapons: [] };
}

function evaluateStatuses(weapons: readonly SynergyWeapon[], count: number): Outcome {
  const statuses = new Set<StatusEffect>();
  const taking: number[] = [];
  weapons.forEach((weapon, index) => {
    if (weapon.statuses.length > 0) taking.push(index);
    for (const status of weapon.statuses) statuses.add(status);
  });
  if (statuses.size >= count) return { weapons: taking };
  return { weapons: [], missing: statuses.size === count - 1 ? 'status payload' : undefined };
}

/**
 * Works out which synergies are active for a loadout.
 * Duplicate synergies never stack: each synergy appears once, with every weapon taking part.
 */
export function evaluateSynergies(
  weapons: readonly SynergyWeapon[],
  researchUnlocked: readonly string[] = [],
): SynergyReport {
  const active: ActiveSynergy[] = [];
  const nearMisses: NearMiss[] = [];
  const locked: SynergyDef[] = [];

  for (const def of SYNERGY_LIST) {
    const requirement = def.requirement;
    let outcome: Outcome;
    if (requirement.kind === 'oneWeapon') outcome = evaluateOneWeapon(weapons, requirement.all);
    else if (requirement.kind === 'twoWeapons') outcome = evaluateTwoWeapons(weapons, requirement.first, requirement.second);
    else outcome = evaluateStatuses(weapons, requirement.count);

    if (outcome.weapons.length > 0) {
      // Research synergies need a research node plus the tags.
      if (def.type === 'Research' && !researchUnlocked.includes(def.id)) locked.push(def);
      else active.push({ def, weapons: outcome.weapons });
    } else if (outcome.missing) {
      nearMisses.push({ def, text: `one ${outcome.missing} from ${def.name}` });
    }
  }

  return { active, nearMisses, locked };
}
