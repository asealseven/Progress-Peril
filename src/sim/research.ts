// Research web rules (GDD 8.10 to 8.13): costs, requirements, instant research,
// refunds, captured research, hidden nodes and mastery. No Phaser imports.

import { emptyMaterials } from '../data/economy';
import type { Material, MaterialStock } from '../data/economy';
import type { KingdomName } from '../data/palette';
import {
  DISCIPLINES,
  DISCIPLINE_MATERIAL,
  KINGDOM_DISCIPLINES,
  MASTERY_POINTS,
  OPENED_BY,
  RESEARCH_COSTS,
  RESEARCH_NODES,
  RESEARCH_RULES,
  researchNode,
  researchNodeByName,
} from '../data/research';
import type { ResearchEffect, ResearchNodeDef, ResearchRule } from '../data/research';
import type { Discipline } from '../data/weapons';
import { archivePreview, awardPoints, masteryRank, noteResearched } from './archive';
import { AP_REWARDS } from '../data/archive';
import type { ArchiveState } from './archive';

/** The milestone the build has reached. Rules for later milestones stay inert. */
export const RESEARCH_MILESTONE = 9;

export interface Payment {
  readonly points: number;
  readonly materials: Readonly<Partial<MaterialStock>>;
}

export interface ResearchState {
  /** Research Points. Fractions from Research Yield stay in the total. The display rounds down. */
  points: number;
  /** Ids of researched nodes, in order. */
  researched: string[];
  /** What each researched node cost, for refunds. Captured nodes cost nothing. */
  paid: Record<string, Payment>;
  /** Nodes whose mastery points went to the Archive this run. A node pays once per run. */
  masteryAwarded: string[];
  /** Captured research waiting for a choice: the disciplines on offer (GDD 5.8). */
  captures: Array<readonly Discipline[]>;
  /** Steam Burst reactions this run, for Spontaneous Combustion (GDD 8.12). */
  steamBursts: number;
}

export function createResearch(): ResearchState {
  return { points: 0, researched: [], paid: {}, masteryAwarded: [], captures: [], steamBursts: 0 };
}

/** What the research rules read from a run. */
export interface ResearchHolder {
  research: ResearchState;
  archive: ArchiveState;
  materials: MaterialStock;
  researchSynergies: string[];
}

/** 'archive': undiscovered, one step beyond the known tree, bought in the Grand Archive (GDD 15.8). */
export type NodeState = 'undiscovered' | 'archive' | 'blocked' | 'discovered' | 'available' | 'researched';

export function isResearched(holder: ResearchHolder, id: string): boolean {
  return holder.research.researched.includes(id);
}

/** Every effect of every researched node, minus rules for later milestones. */
function activeEffects(researched: readonly string[]): ResearchEffect[] {
  const effects: ResearchEffect[] = [];
  for (const id of researched) {
    for (const effect of researchNode(id)?.effects ?? []) {
      if (effect.kind === 'rule' && (effect.inactiveUntil ?? 0) > RESEARCH_MILESTONE) continue;
      effects.push(effect);
    }
  }
  return effects;
}

export type WeaponStatEffect = Extract<ResearchEffect, { kind: 'weaponStat' }>;
export type PlayerStatEffect = Extract<ResearchEffect, { kind: 'playerStat' }>;
export type StatusDurationEffect = Extract<ResearchEffect, { kind: 'statusDuration' }>;

/** Researched nodes sorted into the shapes the simulation reads. */
export interface ResolvedResearch {
  /** How many researched nodes carry each named rule. */
  readonly rules: ReadonlyMap<ResearchRule, number>;
  readonly weaponStats: readonly WeaponStatEffect[];
  readonly playerStats: readonly PlayerStatEffect[];
  readonly statusDurations: readonly StatusDurationEffect[];
  readonly synergies: readonly string[];
}

export const NO_RESEARCH: ResolvedResearch = {
  rules: new Map(),
  weaponStats: [],
  playerStats: [],
  statusDurations: [],
  synergies: [],
};

export function resolveResearch(researched: readonly string[]): ResolvedResearch {
  const rules = new Map<ResearchRule, number>();
  const weaponStats: WeaponStatEffect[] = [];
  const playerStats: PlayerStatEffect[] = [];
  const statusDurations: StatusDurationEffect[] = [];
  const synergies: string[] = [];
  for (const effect of activeEffects(researched)) {
    if (effect.kind === 'rule') rules.set(effect.rule, (rules.get(effect.rule) ?? 0) + 1);
    else if (effect.kind === 'weaponStat') weaponStats.push(effect);
    else if (effect.kind === 'playerStat') playerStats.push(effect);
    else if (effect.kind === 'statusDuration') statusDurations.push(effect);
    else if (effect.kind === 'synergy') synergies.push(effect.id);
  }
  return { rules, weaponStats, playerStats, statusDurations, synergies };
}

export function hasRule(holder: ResearchHolder, rule: ResearchRule): boolean {
  return (resolveResearch(holder.research.researched).rules.get(rule) ?? 0) > 0;
}

/** Research Points and materials for a node (GDD 8.11). Efficient Research lowers the points. */
export function nodeCost(holder: ResearchHolder, node: ResearchNodeDef): Payment {
  const cost = RESEARCH_COSTS[node.ring];
  const efficient = hasRule(holder, 'efficientResearch') ? RESEARCH_RULES.efficientShare : 1;
  const materials: Partial<MaterialStock> = {};
  if (cost.materials > 0) {
    for (const discipline of node.disciplines) {
      const material = DISCIPLINE_MATERIAL[discipline];
      materials[material] = (materials[material] ?? 0) + cost.materials;
    }
  }
  return { points: Math.ceil(cost.points * efficient - 1e-9), materials };
}

export function requirementsMet(holder: ResearchHolder, node: ResearchNodeDef): boolean {
  return node.requires.every((name) => {
    const required = researchNodeByName(name);
    return required !== undefined && isResearched(holder, required.id);
  });
}

export type ResearchProblem = 'undiscovered' | 'researched' | 'requirements' | 'points' | 'materials';

function affordable(holder: ResearchHolder, cost: Payment): ResearchProblem | undefined {
  if (Math.floor(holder.research.points + 1e-9) < cost.points) return 'points';
  for (const [material, amount] of Object.entries(cost.materials) as Array<[Material, number]>) {
    if (holder.materials[material] < amount) return 'materials';
  }
  return undefined;
}

export function researchProblem(holder: ResearchHolder, node: ResearchNodeDef): ResearchProblem | undefined {
  if (!holder.archive.discovered.has(node.id)) return 'undiscovered';
  if (isResearched(holder, node.id)) return 'researched';
  if (!requirementsMet(holder, node)) return 'requirements';
  return affordable(holder, nodeCost(holder, node));
}

export function nodeState(holder: ResearchHolder, node: ResearchNodeDef): NodeState {
  const problem = researchProblem(holder, node);
  if (problem === undefined) return 'available';
  if (problem === 'undiscovered') return archivePreview(holder.archive, node) ? 'archive' : 'undiscovered';
  if (problem === 'researched') return 'researched';
  if (problem === 'requirements') return 'blocked';
  return 'discovered';
}

/** Hidden node conditions read mastery ranks (GDD 8.12). */
function checkMasteryConditions(holder: ResearchHolder): void {
  const engine = researchNodeByName("The Philosopher's Engine");
  if (!engine) return;
  const experts = DISCIPLINES.filter((discipline) => {
    const rank = masteryRank(holder.archive.mastery[discipline]);
    return rank !== 'Novice' && rank !== 'Practitioner';
  }).length;
  if (experts >= DISCIPLINES.length) holder.archive.discovered.add(engine.id);
  else if (experts >= 1) holder.archive.hints.add(engine.id);
}

function markResearched(holder: ResearchHolder, node: ResearchNodeDef, payment: Payment): void {
  const research = holder.research;
  research.researched.push(node.id);
  research.paid[node.id] = payment;
  // Mastery points go to each linked discipline, once per node per run (GDD 8.13).
  // The first research of a technology in any run pays Archive Points (GDD 11.3).
  noteResearched(holder.archive, node.id);
  if (!research.masteryAwarded.includes(node.id)) {
    research.masteryAwarded.push(node.id);
    for (const discipline of node.disciplines) holder.archive.mastery[discipline] += MASTERY_POINTS[node.ring];
    checkMasteryConditions(holder);
  }
  holder.researchSynergies = [...resolveResearch(research.researched).synergies];
}

/** Researches a node at once (GDD 8.10). Returns the problem when the node stays closed. */
export function researchNodeNow(holder: ResearchHolder, node: ResearchNodeDef): ResearchProblem | undefined {
  const problem = researchProblem(holder, node);
  if (problem) return problem;
  const cost = nodeCost(holder, node);
  holder.research.points -= cost.points;
  for (const [material, amount] of Object.entries(cost.materials) as Array<[Material, number]>) {
    holder.materials[material] -= amount;
  }
  markResearched(holder, node, cost);
  return undefined;
}

/** Researched nodes depending on a node, directly or through other nodes. */
export function dependents(holder: ResearchHolder, node: ResearchNodeDef): ResearchNodeDef[] {
  const found: ResearchNodeDef[] = [];
  const names = new Set([node.name]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of holder.research.researched) {
      const other = researchNode(id);
      if (!other || names.has(other.name)) continue;
      if (other.requires.some((name) => names.has(name))) {
        names.add(other.name);
        found.push(other);
        grew = true;
      }
    }
  }
  return found;
}

function refundOf(payment: Payment | undefined): { points: number; materials: MaterialStock } {
  const materials = emptyMaterials();
  if (!payment) return { points: 0, materials };
  for (const [material, amount] of Object.entries(payment.materials) as Array<[Material, number]>) {
    materials[material] = Math.floor(amount * RESEARCH_RULES.refundShare + 1e-9);
  }
  return { points: Math.floor(payment.points * RESEARCH_RULES.refundShare + 1e-9), materials };
}

export interface RefundPreview {
  /** The node and every dependent node the refund removes. */
  readonly nodes: readonly ResearchNodeDef[];
  readonly points: number;
  readonly materials: Readonly<MaterialStock>;
}

/** What removing a node returns: 75 per cent of each removed node, rounded down per node (GDD 8.10). */
export function refundPreview(holder: ResearchHolder, node: ResearchNodeDef): RefundPreview | undefined {
  if (!isResearched(holder, node.id)) return undefined;
  const nodes = [node, ...dependents(holder, node)];
  const materials = emptyMaterials();
  let points = 0;
  for (const entry of nodes) {
    const refund = refundOf(holder.research.paid[entry.id]);
    points += refund.points;
    for (const material of Object.keys(materials) as Material[]) materials[material] += refund.materials[material];
  }
  return { nodes, points, materials };
}

/** Removes a node and every dependent node. Owned items stay owned (GDD 8.10). */
export function refundNode(holder: ResearchHolder, node: ResearchNodeDef): RefundPreview | undefined {
  const preview = refundPreview(holder, node);
  if (!preview) return undefined;
  const removed = new Set(preview.nodes.map((entry) => entry.id));
  const research = holder.research;
  research.researched = research.researched.filter((id) => !removed.has(id));
  for (const id of removed) delete research.paid[id];
  research.points += preview.points;
  for (const material of Object.keys(preview.materials) as Material[]) {
    holder.materials[material] += preview.materials[material];
  }
  holder.researchSynergies = [...resolveResearch(research.researched).synergies];
  return preview;
}

// --- Captured research (GDD 5.8) ---------------------------------------------

/** Queues one free node from the beaten kingdom's disciplines. */
export function queueCapture(holder: ResearchHolder, kingdom: KingdomName): void {
  holder.research.captures.push(KINGDOM_DISCIPLINES[kingdom]);
}

/** Centre and inner nodes on offer for the first waiting capture. */
export function captureChoices(holder: ResearchHolder): ResearchNodeDef[] {
  const disciplines = holder.research.captures[0];
  if (!disciplines) return [];
  return RESEARCH_NODES.filter(
    (node) =>
      (node.ring === 'Centre' || node.ring === 'Inner') &&
      node.disciplines.some((discipline) => disciplines.includes(discipline)) &&
      holder.archive.discovered.has(node.id) &&
      !isResearched(holder, node.id) &&
      requirementsMet(holder, node),
  );
}

/** Researches a node for free: The Philosopher's Engine (GDD 8.12). */
export function grantNode(holder: ResearchHolder, node: ResearchNodeDef): void {
  if (isResearched(holder, node.id)) return;
  markResearched(holder, node, { points: 0, materials: {} });
}

/** Takes a captured node for free. Returns true on success. */
export function captureNode(holder: ResearchHolder, node: ResearchNodeDef): boolean {
  if (!captureChoices(holder).includes(node)) return false;
  holder.research.captures.shift();
  markResearched(holder, node, { points: 0, materials: {} });
  return true;
}

// --- Items opened by research (GDD 8.10) -------------------------------------

/** The name of the node an item waits for, or undefined when the item is open. */
export function itemLockedBy(holder: ResearchHolder, itemName: string): string | undefined {
  const node = OPENED_BY.get(itemName);
  if (!node || isResearched(holder, node.id)) return undefined;
  return node.name;
}

/** Grade III needs any middle-ring node, Grade IV any outer-ring node (GDD 8.10). */
export function gradeOpen(holder: ResearchHolder, grade: number): boolean {
  if (grade < 3) return true;
  const ring = grade === 3 ? 'Middle' : 'Outer';
  return holder.research.researched.some((id) => {
    const node = researchNode(id);
    // An outer-ring node sits past the middle ring, so the node opens Grade III too.
    return node !== undefined && (node.ring === ring || (grade === 3 && node.ring === 'Outer'));
  });
}

// --- Hidden nodes (GDD 8.12) -------------------------------------------------

/** A hidden node's condition met: the node enters the Archive at no cost. */
export function discoverHidden(holder: ResearchHolder, name: string): boolean {
  const node = researchNodeByName(name);
  if (!node || holder.archive.discovered.has(node.id)) return false;
  holder.archive.discovered.add(node.id);
  // Discovering hidden technology pays Archive Points (GDD 11.3).
  awardPoints(holder.archive, AP_REWARDS.hiddenTechnology);
  return true;
}

/** A near miss: the web shows an ink smudge with a cryptic note. */
export function hintHidden(holder: ResearchHolder, name: string): void {
  const node = researchNodeByName(name);
  if (node && !holder.archive.discovered.has(node.id)) holder.archive.hints.add(node.id);
}

/** Findings from one round of combat, for the hidden conditions. */
export interface RoundFindings {
  steamBursts: number;
  /** An elite died to a hit under a Galvanic Surge. */
  galvanicEliteKill: boolean;
  /** An elite stood under a Galvanic Surge. */
  galvanicElite: boolean;
  /** The deepest chain generation reached, and the limit of the weapon behind the chain. */
  chainDepth: number;
  chainLimitReached: boolean;
  /** The most critical hits inside one second. */
  criticalBurst: number;
  sporeMotherByConstruct: boolean;
  sporeMotherKilled: boolean;
  unstableSuppressedKill: boolean;
  unstableKilled: boolean;
  /** Mechanical enemies defeated, for Mechanical Menace (GDD 11.7). */
  mechanicalKills: number;
  /** Ids of enemies met and reactions set off, for the Codex (GDD 15.6). */
  enemies: Set<string>;
  reactions: Set<string>;
  /** A mini-boss died, and whether the player took no damage while it fought (GDD 8.12). */
  miniBossKilled: boolean;
  miniBossFlawless: boolean;
}

export function emptyFindings(): RoundFindings {
  return {
    steamBursts: 0,
    galvanicEliteKill: false,
    galvanicElite: false,
    chainDepth: 0,
    chainLimitReached: false,
    criticalBurst: 0,
    sporeMotherByConstruct: false,
    sporeMotherKilled: false,
    unstableSuppressedKill: false,
    unstableKilled: false,
    miniBossKilled: false,
    miniBossFlawless: false,
    mechanicalKills: 0,
    enemies: new Set(),
    reactions: new Set(),
  };
}

export interface RoundContext {
  readonly survived: boolean;
  readonly healthShare: number;
  /** Names of the equipped weapons. */
  readonly weapons: readonly string[];
}

/** Applies a round's findings to the hidden nodes. Returns the names of nodes discovered. */
export function applyFindings(holder: ResearchHolder, findings: RoundFindings, context: RoundContext): string[] {
  const found: string[] = [];
  const check = (name: string, met: boolean, near: boolean): void => {
    if (met) {
      if (discoverHidden(holder, name)) found.push(name);
    } else if (near) hintHidden(holder, name);
  };
  const research = holder.research;
  research.steamBursts += findings.steamBursts;
  check(
    'Spontaneous Combustion',
    research.steamBursts >= RESEARCH_RULES.steamBursts,
    research.steamBursts >= RESEARCH_RULES.steamBursts / 2,
  );
  check('Lightning in a Bottle', findings.galvanicEliteKill, findings.galvanicElite);
  const arsenal = context.weapons.includes('Living Arsenal');
  const rod = context.weapons.includes('Tesla Rod');
  check('Living Battery', context.survived && arsenal && rod, context.survived && (arsenal || rod));
  check('Perpetual Reaction', findings.chainLimitReached, findings.chainDepth >= 2);
  check(
    'Iron Lung',
    context.survived && context.healthShare < RESEARCH_RULES.lowHealthShare,
    context.survived && context.healthShare < RESEARCH_RULES.lowHealthShare * 2,
  );
  check(
    'Probability Storm',
    findings.criticalBurst >= RESEARCH_RULES.criticalBurst,
    findings.criticalBurst >= RESEARCH_RULES.criticalBurst / 2,
  );
  check('Fungal Machinery', findings.sporeMotherByConstruct, findings.sporeMotherKilled);
  check('Anomalous Physics', findings.unstableSuppressedKill, findings.unstableKilled);
  // No halfway point: the hint follows the first failed attempt (GDD 8.12).
  check('Absolute Precision', findings.miniBossFlawless, findings.miniBossKilled);
  return found;
}
