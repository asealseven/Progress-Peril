// Encounter director. Milestone 1 holds the threat budget and a simple spawn
// plan. Milestone 4 adds spawn groups by faction, elites, champions and limits.

import type { EnemyDef } from '../data/enemies';
import { roundDuration, threatBudget } from '../data/rounds';
import { THREAT_COST } from '../data/tiers';
import type { Rng } from './rng';
import type { SpawnEntry } from './world/types';

/** Budget units one enemy costs (GDD 4.11). */
export function threatCost(enemy: EnemyDef): number {
  return THREAT_COST[enemy.threat];
}

export interface BudgetSplit {
  readonly trickle: number;
  readonly groups: number;
  readonly assault: number;
}

/**
 * Splits a round budget three ways (GDD 4.11): a steady trickle (about a
 * third), group spawns (about half) and one closing assault (the remainder).
 */
export function splitBudget(budget: number): BudgetSplit {
  const trickle = Math.round(budget / 3);
  const groups = Math.round(budget / 2);
  return { trickle, groups, assault: Math.max(0, budget - trickle - groups) };
}

/** Share of the round duration when the trickle and the groups stop and the assault enters. */
const TRICKLE_END = 0.8;
const GROUPS_START = 0.15;
const GROUPS_END = 0.7;
const ASSAULT_TIME = 0.85;
const FIRST_SPAWN_SECONDS = 1;
const GROUP_SIZE_MIN = 3;
const GROUP_SIZE_MAX = 5;

/**
 * Builds the spawn schedule for a round with a single enemy type.
 * Budget left over by one share moves to the next share, so the plan spends
 * as much of the budget as whole enemies allow.
 */
export function planRound(round: number, enemy: EnemyDef, rng: Rng): SpawnEntry[] {
  const duration = roundDuration(round);
  const split = splitBudget(threatBudget(round));
  const cost = threatCost(enemy);
  const entries: SpawnEntry[] = [];

  // Steady trickle: single enemies at even intervals.
  const trickleCount = Math.floor(split.trickle / cost);
  let carried = split.trickle - trickleCount * cost;
  const trickleEnd = duration * TRICKLE_END;
  for (let i = 0; i < trickleCount; i++) {
    const share = trickleCount === 1 ? 0 : i / (trickleCount - 1);
    const time = FIRST_SPAWN_SECONDS + (trickleEnd - FIRST_SPAWN_SECONDS) * share;
    entries.push({ time, enemy, count: 1, kind: 'trickle' });
  }

  // Group spawns: groups of three to five with short gaps between them.
  let groupEnemies = Math.floor((split.groups + carried) / cost);
  carried = split.groups + carried - groupEnemies * cost;
  const groupSizes: number[] = [];
  while (groupEnemies > 0) {
    const size = Math.min(groupEnemies, rng.int(GROUP_SIZE_MIN, GROUP_SIZE_MAX));
    groupSizes.push(size);
    groupEnemies -= size;
  }
  groupSizes.forEach((size, index) => {
    const share = groupSizes.length === 1 ? 0.5 : index / (groupSizes.length - 1);
    const time = duration * (GROUPS_START + (GROUPS_END - GROUPS_START) * share);
    entries.push({ time, enemy, count: size, kind: 'group' });
  });

  // One closing assault with the remainder.
  const assaultCount = Math.floor((split.assault + carried) / cost);
  if (assaultCount > 0) {
    entries.push({ time: duration * ASSAULT_TIME, enemy, count: assaultCount, kind: 'assault' });
  }

  return entries.sort((a, b) => a.time - b.time);
}

/** Threat units a plan spends. */
export function planCost(entries: readonly SpawnEntry[]): number {
  let total = 0;
  for (const entry of entries) total += threatCost(entry.enemy) * entry.count;
  return total;
}
