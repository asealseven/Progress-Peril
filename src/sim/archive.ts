// The Grand Archive between runs (GDD 11). Milestone 6 holds the parts research
// needs: discovered nodes, mastery points and hidden node hints. Milestone 9
// adds Archive Points, discovery costs, permanent upgrades and saves.

import { DISCIPLINES, MASTERY_RANKS, RESEARCH_NODES } from '../data/research';
import type { MasteryRank } from '../data/research';
import type { Discipline } from '../data/weapons';

export interface ArchiveState {
  /** Ids of the nodes shown on the research web (GDD 8.10). */
  discovered: Set<string>;
  /** Mastery points per discipline. They never reset (GDD 8.13). */
  mastery: Record<Discipline, number>;
  /** Ids of hidden nodes with a hint (GDD 8.12). */
  hints: Set<string>;
}

/**
 * A new Archive. Until Milestone 9 adds discovery costs, every node except the
 * hidden ones counts as discovered (NOTES.md, GDD 11.10).
 */
export function createArchive(): ArchiveState {
  const mastery = {} as Record<Discipline, number>;
  for (const discipline of DISCIPLINES) mastery[discipline] = 0;
  return {
    discovered: new Set(RESEARCH_NODES.filter((node) => node.ring !== 'Hidden').map((node) => node.id)),
    mastery,
    hints: new Set(),
  };
}

export function masteryRank(points: number): MasteryRank {
  let rank: MasteryRank = 'Novice';
  for (const entry of MASTERY_RANKS) if (points >= entry.points) rank = entry.name;
  return rank;
}

/** Points to the next rank, or undefined at Grandmaster. */
export function nextRank(points: number): { name: MasteryRank; points: number } | undefined {
  return MASTERY_RANKS.find((entry) => entry.points > points);
}
