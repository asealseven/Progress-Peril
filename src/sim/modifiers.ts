// The stat modifier stack, Armour returns (GDD 3.7), the weapon damage order
// (GDD 7.14) and hits against the player (GDD 3.7).

import type { DamageType } from '../data/damageTypes';
import { ARMOUR_LIMIT, TIERS, TIER_TABLES } from '../data/tiers';

// --- Stat modifier stack ----------------------------------------------------

/** Where a bonus comes from. Bonuses of one source type add. Source types multiply (GDD 7.14 step 3). */
export type ModifierSource = 'components' | 'weapon' | 'research' | 'player' | 'relics' | 'synergies' | 'archive';

/** A percentage factor never drops below this, so stacked "down" effects leave a usable stat. */
const MINIMUM_FACTOR = 0.2;

/** Collects flat and percentage modifiers per stat and resolves them in the GDD 7.14 order. */
export class ModifierStack<Stat extends string = string> {
  private readonly flat = new Map<Stat, number>();
  private readonly percent = new Map<Stat, Map<ModifierSource, number>>();

  addFlat(stat: Stat, amount: number): void {
    this.flat.set(stat, (this.flat.get(stat) ?? 0) + amount);
  }

  /** 0.2 means 20 per cent up. -0.1 means 10 per cent down. */
  addPercent(stat: Stat, source: ModifierSource, amount: number): void {
    let bySource = this.percent.get(stat);
    if (!bySource) {
      bySource = new Map();
      this.percent.set(stat, bySource);
    }
    bySource.set(source, (bySource.get(source) ?? 0) + amount);
  }

  flatFor(stat: Stat): number {
    return this.flat.get(stat) ?? 0;
  }

  /** Summed percentage for one stat and one source type. */
  percentFor(stat: Stat, source: ModifierSource): number {
    return this.percent.get(stat)?.get(source) ?? 0;
  }

  /** Product of every source factor for a stat, with optional extra percentages per source. */
  factor(stat: Stat, extra?: Partial<Record<ModifierSource, number>>): number {
    const sources = new Map(this.percent.get(stat) ?? []);
    if (extra) {
      for (const [source, amount] of Object.entries(extra) as Array<[ModifierSource, number]>) {
        sources.set(source, (sources.get(source) ?? 0) + amount);
      }
    }
    let result = 1;
    for (const total of sources.values()) result *= Math.max(MINIMUM_FACTOR, 1 + total);
    return result;
  }

  /** Base value, plus flat bonuses, times every source factor. */
  resolve(stat: Stat, base: number, extra?: Partial<Record<ModifierSource, number>>): number {
    return Math.max(0, (base + this.flatFor(stat)) * this.factor(stat, extra));
  }
}

// --- Armour -----------------------------------------------------------------

/**
 * Armour stacks through points. A single source keeps its tier value, and
 * stacked sources approach ARMOUR_LIMIT without reaching the limit.
 */
export function armourPoints(reduction: number): number {
  const r = Math.min(Math.max(reduction, 0), ARMOUR_LIMIT - 1e-9);
  return r / (ARMOUR_LIMIT - r);
}

export function armourFromPoints(points: number): number {
  if (points <= 0) return 0;
  return (ARMOUR_LIMIT * points) / (points + 1);
}

/** Combined damage reduction for several Armour sources. */
export function stackArmour(reductions: readonly number[]): number {
  let points = 0;
  for (const reduction of reductions) points += armourPoints(reduction);
  return armourFromPoints(points);
}

const ARMOUR_STEPS: readonly number[] = TIERS.map((tier) => TIER_TABLES.armour[tier]);

/** Position of a reduction on the tier scale: 0 for Minimal, 4 for Extreme. */
function armourPosition(reduction: number): number {
  const top = ARMOUR_STEPS.length - 1;
  const topValue = ARMOUR_STEPS[top] ?? 0;
  if (reduction >= topValue) return top + (reduction - topValue) / (ARMOUR_LIMIT - topValue);
  for (let i = 0; i < top; i++) {
    const low = ARMOUR_STEPS[i] ?? 0;
    const high = ARMOUR_STEPS[i + 1] ?? 0;
    if (reduction <= high) return i + (reduction - low) / (high - low);
  }
  return top;
}

function armourAtPosition(position: number): number {
  const top = ARMOUR_STEPS.length - 1;
  const topValue = ARMOUR_STEPS[top] ?? 0;
  if (position <= 0) return 0;
  if (position >= top) return Math.min(ARMOUR_LIMIT, topValue + (position - top) * (ARMOUR_LIMIT - topValue));
  const index = Math.floor(position);
  const low = ARMOUR_STEPS[index] ?? 0;
  const high = ARMOUR_STEPS[index + 1] ?? 0;
  return low + (high - low) * (position - index);
}

/** Lowers Armour by whole tier steps. Values between tiers move along the scale. */
export function stepArmourDown(reduction: number, steps: number): number {
  return armourAtPosition(armourPosition(Math.max(0, reduction)) - steps);
}

/** Tier steps of target Armour ignored by Piercing damage (GDD 7.14 step 6, NOTES.md). */
export const PIERCING_ARMOUR_STEPS = 1;

/** Target Armour after the reductions in GDD 7.14 step 6. */
export function effectiveArmour(reduction: number, damageType: DamageType, corrodedSteps = 0): number {
  const steps = corrodedSteps + (damageType === 'Piercing' ? PIERCING_ARMOUR_STEPS : 0);
  return steps > 0 ? stepArmourDown(reduction, steps) : Math.max(0, reduction);
}

// --- Weapon damage order (GDD 7.14) -----------------------------------------

export interface PercentBonus {
  /** Source type, such as 'components', 'research' or 'player'. */
  readonly source: string;
  /** 0.2 means 20 per cent more damage. */
  readonly amount: number;
}

export interface DamageInput {
  /** Step 1. Weapon base damage. */
  readonly base: number;
  /** Step 2. Flat bonuses from components. */
  readonly flat?: number;
  /** Step 3. Bonuses of one source type add. Different source types multiply. */
  readonly percentBonuses?: readonly PercentBonus[];
  /** Step 4. Critical multiplier on a successful roll, otherwise 1. */
  readonly criticalMultiplier?: number;
  /** Step 5. Target resistance or weakness for the damage type. 1 means neutral. */
  readonly typeMultiplier?: number;
  /** Step 6. Target Armour as a damage reduction, after Corroded and Piercing. */
  readonly armour?: number;
  /** Step 7. Status reaction bonus. 0.25 means 25 per cent more damage. */
  readonly reactionBonus?: number;
}

/** Applies the seven steps of GDD 7.14 in order. */
export function computeDamage(input: DamageInput): number {
  let damage = input.base;
  damage += input.flat ?? 0;

  const bySource = new Map<string, number>();
  for (const bonus of input.percentBonuses ?? []) {
    bySource.set(bonus.source, (bySource.get(bonus.source) ?? 0) + bonus.amount);
  }
  for (const total of bySource.values()) damage *= 1 + total;

  damage *= input.criticalMultiplier ?? 1;
  damage *= input.typeMultiplier ?? 1;
  damage *= 1 - (input.armour ?? 0);
  damage *= 1 + (input.reactionBonus ?? 0);
  return Math.max(0, damage);
}

// --- Hits against the player (GDD 3.7) --------------------------------------

export interface PlayerHitInput {
  readonly damage: number;
  /** Evasion chance, 0 to 1. */
  readonly evasion: number;
  /** A roll in [0, 1) from the run's generator. */
  readonly evasionRoll: number;
  /** Player Armour as a damage reduction. */
  readonly armour: number;
  /** Adaptation resistance to the hit's damage type. */
  readonly adaptation: number;
}

export interface PlayerHitResult {
  readonly evaded: boolean;
  readonly damage: number;
}

/** Order of resolution: Evasion check, then Armour, then adaptation, then health loss. */
export function resolvePlayerHit(input: PlayerHitInput): PlayerHitResult {
  if (input.evasionRoll < input.evasion) return { evaded: true, damage: 0 };
  const damage = input.damage * (1 - input.armour) * (1 - input.adaptation);
  return { evaded: false, damage: Math.max(0, damage) };
}
