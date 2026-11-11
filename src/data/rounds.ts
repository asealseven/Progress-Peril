// Round structure (GDD 4.2), round lengths (GDD 4.3) and threat budgets (GDD 4.11).

import { ROUND_ONE_THREAT } from './tiers';

export const ROUNDS_PER_TERRITORY = 7;
export const CAMPAIGN_ROUNDS = 21;

export type RoundKind = 'encounter' | 'mini-boss' | 'boss';

/** Target combat duration per territory, seconds: first round to last round. */
const DURATION_BANDS: ReadonlyArray<readonly [number, number]> = [
  [30, 45],
  [40, 60],
  [50, 75],
];

/** Budget as a multiple of the Round 1 budget, Rounds 1 to 21 (GDD 4.11). */
const BUDGET_MULTIPLIERS: readonly number[] = [
  1, 1.5, 2, 2, 2.5, 3, 2,
  3.5, 4.25, 5, 3, 5.5, 6.5, 3,
  7, 7.75, 8.5, 4, 9, 10, 5,
];

/** Territory index (0 to 2) for a campaign round (1 to 21). */
export function territoryIndex(round: number): number {
  return Math.min(2, Math.floor((round - 1) / ROUNDS_PER_TERRITORY));
}

/** Round within the territory, 1 to 7. */
export function roundInTerritory(round: number): number {
  return ((round - 1) % ROUNDS_PER_TERRITORY) + 1;
}

export function roundKind(round: number): RoundKind {
  const local = roundInTerritory(round);
  if (local === 4) return 'mini-boss';
  if (local === 7) return 'boss';
  return 'encounter';
}

/** Target combat duration in seconds. Rounds grow longer inside each territory. */
export function roundDuration(round: number): number {
  const band = DURATION_BANDS[territoryIndex(round)] ?? [30, 45];
  const progress = (roundInTerritory(round) - 1) / (ROUNDS_PER_TERRITORY - 1);
  return band[0] + (band[1] - band[0]) * progress;
}

export function budgetMultiplier(round: number): number {
  const index = Math.min(BUDGET_MULTIPLIERS.length, Math.max(1, round)) - 1;
  return BUDGET_MULTIPLIERS[index] ?? 1;
}

/** Threat units the director spends in a round. */
export function threatBudget(round: number): number {
  return Math.round(ROUND_ONE_THREAT * budgetMultiplier(round));
}
