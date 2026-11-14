// The Grand Archive between runs (GDD 3.8, 8.13, 11.1 to 11.14): Archive
// Points, node discoveries, permanent upgrades, specialisations, mastery,
// challenges and the Codex. No Phaser imports.

import {
  AP_REWARDS,
  CHALLENGES,
  CHALLENGE_IDS,
  DISCOVERY,
  PERMANENT_UPGRADES,
  RESPEC,
  SPECIALISATION_COST,
  SPECIALISATION_SLOTS,
  UPGRADE_IDS,
} from '../data/archive';
import type { ChallengeId, UpgradeId } from '../data/archive';
import { DISCIPLINES, MASTERY_RANKS, RESEARCH_NODES, STARTING_KNOWLEDGE, researchNodeByName } from '../data/research';
import type { MasteryRank, ResearchNodeDef } from '../data/research';
import { SPECIALISATIONS } from '../data/specialisations';
import type { SpecialisationId } from '../data/specialisations';
import type { StatusEffect } from '../data/statusEffects';
import type { Discipline } from '../data/weapons';

/** What the Codex has seen (GDD 15.6): enemies, synergies, reactions, relics, lore and endings. */
export interface CodexState {
  enemies: Set<string>;
  synergies: Set<string>;
  reactions: Set<string>;
  relics: Set<string>;
  kingdoms: Set<string>;
  endings: Set<string>;
}

export interface ArchiveState {
  /** Archive Points to spend (GDD 11.2). */
  points: number;
  /** Archive Points earned in total, for the trophy cabinet. */
  earned: number;
  /** Ids of the nodes shown on the research web (GDD 8.10, 11.10). */
  discovered: Set<string>;
  /** Mastery points per discipline. They never reset (GDD 8.13). */
  mastery: Record<Discipline, number>;
  /** Ids of hidden nodes with a hint (GDD 8.12). */
  hints: Set<string>;
  /** Campaigns started. The first ever starts in Keldrath (GDD 5.7). */
  campaigns: number;
  /** Steps bought of each permanent upgrade, and the Archive Points spent on each (GDD 11.11). */
  upgrades: Record<UpgradeId, number>;
  upgradeSpent: Record<UpgradeId, number>;
  /** Specialisations bought, and the ones equipped for the next campaign (GDD 11.12). */
  specialisations: Set<SpecialisationId>;
  equipped: SpecialisationId[];
  /** Challenge progress and completions (GDD 11.7). */
  challenges: Record<ChallengeId, number>;
  completed: Set<ChallengeId>;
  /** Nodes researched in any run: the first research of each pays Archive Points (GDD 11.3). */
  researchedEver: Set<string>;
  codex: CodexState;
  /** The Chemistry Master status, the player's choice (GDD 8.13). */
  masterStatus: StatusEffect;
  /** Endless mode personal bests: the furthest round overall and per character (GDD 13.3). */
  bests: { endlessRound: number; byCharacter: Record<string, number> };
  /** The highest Challenge Tier open: winning a campaign opens the next (GDD 3.9). */
  tierUnlocked: number;
  /** The mode chosen for the last campaign, offered again for the next. */
  lastMode: { assist: boolean; tier: number };
}

function emptyRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  const record = {} as Record<K, number>;
  for (const key of keys) record[key] = 0;
  return record;
}

/** A new Archive with the GDD 11.10 starting knowledge: every centre node and two inner nodes per discipline. */
export function createArchive(): ArchiveState {
  const discovered = new Set<string>();
  for (const name of STARTING_KNOWLEDGE) {
    const node = researchNodeByName(name);
    if (node) discovered.add(node.id);
  }
  return {
    points: 0,
    earned: 0,
    discovered,
    mastery: emptyRecord(DISCIPLINES),
    hints: new Set(),
    campaigns: 0,
    upgrades: emptyRecord(UPGRADE_IDS),
    upgradeSpent: emptyRecord(UPGRADE_IDS),
    specialisations: new Set(),
    equipped: [],
    challenges: emptyRecord(CHALLENGE_IDS),
    completed: new Set(),
    researchedEver: new Set(),
    codex: { enemies: new Set(), synergies: new Set(), reactions: new Set(), relics: new Set(), kingdoms: new Set(), endings: new Set() },
    masterStatus: 'Burning',
    bests: { endlessRound: 0, byCharacter: {} },
    tierUnlocked: 0,
    lastMode: { assist: false, tier: 0 },
  };
}

/** An Archive with every node but the hidden ones discovered: debug tools and tests. */
export function createFullArchive(): ArchiveState {
  const archive = createArchive();
  for (const node of RESEARCH_NODES) if (node.ring !== 'Hidden') archive.discovered.add(node.id);
  return archive;
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

function rankIndex(rank: MasteryRank): number {
  return MASTERY_RANKS.findIndex((entry) => entry.name === rank);
}

/** True when a discipline has reached a rank. */
export function hasRank(archive: ArchiveState, discipline: Discipline, rank: MasteryRank): boolean {
  return rankIndex(masteryRank(archive.mastery[discipline])) >= rankIndex(rank);
}

/** Disciplines at Master or above: their rule change is on (GDD 8.13). */
export function masterDisciplines(archive: ArchiveState): Discipline[] {
  return DISCIPLINES.filter((discipline) => hasRank(archive, discipline, 'Master'));
}

// --- Archive Points --------------------------------------------------------------

export function awardPoints(archive: ArchiveState, amount: number): void {
  if (amount <= 0) return;
  archive.points += amount;
  archive.earned += amount;
}

function spend(archive: ArchiveState, amount: number): boolean {
  if (archive.points < amount) return false;
  archive.points -= amount;
  return true;
}

// --- Discoveries (GDD 11.10) -----------------------------------------------------

export type DiscoveryProblem = 'known' | 'hidden' | 'mastery' | 'requirements' | 'points';

export function discoveryCost(node: ResearchNodeDef): number | undefined {
  return DISCOVERY[node.ring]?.points;
}

export function discoveryProblem(archive: ArchiveState, node: ResearchNodeDef): DiscoveryProblem | undefined {
  if (archive.discovered.has(node.id)) return 'known';
  const rule = DISCOVERY[node.ring];
  if (!rule) return 'hidden';
  // Middle nodes need Practitioner and outer nodes Expert in the discipline. Every required node must be known.
  if (rule.condition === 'practitioner' && !node.disciplines.every((d) => hasRank(archive, d, 'Practitioner'))) return 'mastery';
  if (rule.condition === 'expert' && !node.disciplines.every((d) => hasRank(archive, d, 'Expert'))) return 'mastery';
  for (const name of node.requires) {
    const required = researchNodeByName(name);
    if (!required || !archive.discovered.has(required.id)) return 'requirements';
  }
  if (archive.points < rule.points) return 'points';
  return undefined;
}

/** Discovers a node for Archive Points. Discoveries never refund (GDD 11.8). */
export function discoverNode(archive: ArchiveState, node: ResearchNodeDef): DiscoveryProblem | undefined {
  const problem = discoveryProblem(archive, node);
  if (problem) return problem;
  spend(archive, DISCOVERY[node.ring]?.points ?? 0);
  archive.discovered.add(node.id);
  if (node.ring === 'Cross') {
    // First Invention and Scientific Perfection count cross-disciplinary discoveries (GDD 11.7).
    progressChallenge(archive, 'first-invention', 1);
    progressChallenge(archive, 'scientific-perfection', 1);
  }
  return undefined;
}

// --- Permanent upgrades (GDD 11.11) ----------------------------------------------

/** The next step's cost, or undefined at the limit. */
export function upgradeStepCost(archive: ArchiveState, id: UpgradeId): number | undefined {
  return PERMANENT_UPGRADES[id].costs[archive.upgrades[id]];
}

export function buyUpgrade(archive: ArchiveState, id: UpgradeId): boolean {
  const cost = upgradeStepCost(archive, id);
  if (cost === undefined || !spend(archive, cost)) return false;
  archive.upgrades[id]++;
  archive.upgradeSpent[id] += cost;
  return true;
}

/** Resets an upgrade for 90 per cent of the Archive Points spent, rounded down (GDD 11.8). */
export function refundUpgrade(archive: ArchiveState, id: UpgradeId): number {
  const refund = Math.floor(archive.upgradeSpent[id] * RESPEC.upgradeShare);
  archive.points += refund;
  archive.upgrades[id] = 0;
  archive.upgradeSpent[id] = 0;
  return refund;
}

/** The total bonus of an upgrade: gold, points, a share or a count. */
export function upgradeValue(archive: ArchiveState, id: UpgradeId): number {
  return archive.upgrades[id] * PERMANENT_UPGRADES[id].perStep;
}

// --- Specialisations (GDD 11.12) -------------------------------------------------

export function specialisationSlots(archive: ArchiveState): number {
  return DISCIPLINES.some((discipline) => hasRank(archive, discipline, 'Grandmaster')) ? SPECIALISATION_SLOTS.grandmaster : SPECIALISATION_SLOTS.base;
}

export function buySpecialisation(archive: ArchiveState, id: SpecialisationId): boolean {
  if (archive.specialisations.has(id) || !spend(archive, SPECIALISATION_COST)) return false;
  archive.specialisations.add(id);
  return true;
}

/** Equips or removes a specialisation for the next campaign. Swaps are free (GDD 11.12). */
export function toggleSpecialisation(archive: ArchiveState, id: SpecialisationId): boolean {
  if (!archive.specialisations.has(id)) return false;
  const index = archive.equipped.indexOf(id);
  if (index >= 0) {
    archive.equipped.splice(index, 1);
    return true;
  }
  if (archive.equipped.length >= specialisationSlots(archive)) return false;
  archive.equipped.push(id);
  return true;
}

/** Sells a specialisation back for a full refund (GDD 11.8). */
export function refundSpecialisation(archive: ArchiveState, id: SpecialisationId): number {
  if (!archive.specialisations.delete(id)) return 0;
  archive.equipped = archive.equipped.filter((entry) => entry !== id);
  const refund = SPECIALISATION_COST * RESPEC.specialisationShare;
  archive.points += refund;
  return refund;
}

export function specialisationName(id: SpecialisationId): string {
  return SPECIALISATIONS[id].name;
}

// --- Challenges (GDD 11.7, 11.13) ------------------------------------------------

/** Adds challenge progress. A completed challenge pays its Archive Points once. Returns true on completion. */
export function progressChallenge(archive: ArchiveState, id: ChallengeId, amount: number): boolean {
  if (archive.completed.has(id) || amount <= 0) return false;
  const def = CHALLENGES[id];
  archive.challenges[id] = Math.min(def.target, archive.challenges[id] + amount);
  if (archive.challenges[id] < def.target) return false;
  archive.completed.add(id);
  awardPoints(archive, def.points);
  return true;
}

/** Archive Points for the first research of a technology in any run (GDD 11.3, NOTES.md). */
export function noteResearched(archive: ArchiveState, id: string): number {
  if (archive.researchedEver.has(id)) return 0;
  archive.researchedEver.add(id);
  awardPoints(archive, AP_REWARDS.technology);
  return AP_REWARDS.technology;
}
