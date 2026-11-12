// Enemy decisions (GDD 9.4, 9.5, 9.15): utility scoring with personality
// weights, squad orders and attack tokens. Plain functions with no world
// access, so every rule runs in tests. src/sim/world/enemies.ts gathers the
// inputs and carries out the chosen action.

import type { EnemyDef, EnemyRole, Personality } from '../data/enemies';
import { AI_RULES } from '../data/tiers';
import type { Tier } from '../data/tiers';
import type { Rng } from './rng';
import type { AiAction, SquadOrder } from './world/types';

export const AI_ACTIONS: readonly AiAction[] = ['attack', 'protect', 'retreat', 'regroup', 'flank', 'ability'];

/** The main inputs of each action (GDD 9.15). */
export interface ActionInputs {
  // Attack: distance to player, attack ready, attack tokens free.
  /** Distance to the player, pixels. */
  readonly distance: number;
  readonly attackReady: boolean;
  /** A token is free, or the enemy holds one. */
  readonly tokenFree: boolean;
  // Protect allies: ally health, ally role, own role.
  /** The enemy is a Tank or a Support. */
  readonly guard: boolean;
  /** A fragile or wounded ally stands nearby. */
  readonly wardNear: boolean;
  /** Health share of that ally, 0 to 1. */
  readonly wardHealth: number;
  // Retreat: own health, nearby threat, personality.
  readonly healthShare: number;
  /** The player stands closer than the enemy likes: a ranged enemy inside its kite distance. */
  readonly threatened: boolean;
  /** The enemy pulls back after a strike, as Hunting Hounds do. */
  readonly disengaging: boolean;
  // Regroup: distance from squad, squad size, leader alive.
  readonly squadDistance: number;
  readonly squadSize: number;
  /** The squad had a leader and the leader still lives. */
  readonly leaderAlive: boolean;
  /** The squad has lost its leader. */
  readonly leaderLost: boolean;
  /** A formation slot waits for the enemy, away from its position. */
  readonly formationOpen: boolean;
  // Flank: player facing, free flank slots, own speed.
  /** The enemy stands in front of the player, where a flank pays off. */
  readonly inFront: boolean;
  readonly flankSlotFree: boolean;
  /** Pixels per second. */
  readonly speed: number;
  // Use ability: ability ready, ability conditions met, squad order.
  readonly abilityReady: boolean;
  readonly order: SquadOrder | undefined;
  // Personality inputs.
  /** The player stands inside the enemy's home zone. */
  readonly nearHome: boolean;
  /** The player is a weak target: low Health. */
  readonly weakTarget: boolean;
}

export type ActionScores = Record<AiAction, number>;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Base score of each action from its main inputs, before personality. */
export function baseScores(inputs: ActionInputs): ActionScores {
  const closeness = 0.4 + 0.6 * clamp01(1 - inputs.distance / 1200);
  let attack = closeness * (inputs.attackReady ? 1 : 0.7) * (inputs.tokenFree ? 1 : 0.6);
  if (inputs.order === 'Pin') attack *= AI_RULES.orderBonus;

  let protect = 0;
  if (inputs.wardNear) {
    protect = (inputs.guard ? 0.9 : 0.15) * (1.2 - 0.4 * clamp01(inputs.wardHealth));
    if (inputs.order === 'Protect') protect *= AI_RULES.orderBonus;
  }

  let retreat = 0;
  if (inputs.healthShare < AI_RULES.retreatHealthShare) retreat += 0.5 * (1 - inputs.healthShare);
  if (inputs.threatened) retreat += 0.9;
  if (inputs.disengaging) retreat += 1.6;

  let regroup = 0;
  if (inputs.squadSize > 1) {
    regroup = 0.8 * clamp01(inputs.squadDistance / AI_RULES.regroupDistance - 1);
    if (inputs.formationOpen && inputs.leaderAlive) regroup = Math.max(regroup, 0.75);
    if (inputs.leaderLost) regroup *= AI_RULES.leaderlessRegroup;
    if (inputs.order === 'Protect') regroup *= 1.2;
  }

  let flank = 0;
  if (inputs.flankSlotFree && inputs.inFront) {
    flank = 0.55 * clamp01(inputs.speed / 140) * clamp01(inputs.distance / 300);
    if (inputs.order === 'Surround') flank *= AI_RULES.orderBonus;
  }

  const ability = inputs.abilityReady ? 1.25 : 0;

  return { attack, protect, retreat, regroup, flank, ability };
}

type WeightTier = Tier | 'Random';

/** Personality weights (GDD 9.15). Use ability has no column: every personality weighs the action at Medium. */
const PERSONALITY_WEIGHTS: Readonly<
  Record<Personality, Readonly<Record<Exclude<AiAction, 'ability'>, WeightTier>>>
> = {
  Aggressive: { attack: 'High', protect: 'Low', retreat: 'Minimal', regroup: 'Low', flank: 'Medium' },
  Defensive: { attack: 'Low', protect: 'High', retreat: 'Medium', regroup: 'High', flank: 'Minimal' },
  Cowardly: { attack: 'Low', protect: 'Minimal', retreat: 'High', regroup: 'Medium', flank: 'Low' },
  Disciplined: { attack: 'Medium', protect: 'Medium', retreat: 'Low', regroup: 'High', flank: 'High' },
  // High near home zone. Away from home the weight falls to Low.
  Territorial: { attack: 'High', protect: 'Medium', retreat: 'Low', regroup: 'Medium', flank: 'Low' },
  Unstable: { attack: 'Random', protect: 'Random', retreat: 'Random', regroup: 'Random', flank: 'Random' },
  // High against weak targets. Against a healthy player the weight falls to Medium.
  Predatory: { attack: 'High', protect: 'Minimal', retreat: 'Low', regroup: 'Low', flank: 'High' },
};

const RANDOM_TIERS: readonly Tier[] = ['Minimal', 'Low', 'Medium', 'High'];

/** The multiplier a personality gives one action. Unstable enemies roll each weight anew. */
export function personalityWeight(
  personality: Personality,
  action: AiAction,
  inputs: Pick<ActionInputs, 'nearHome' | 'weakTarget'>,
  rng: Rng,
): number {
  if (action === 'ability') return AI_RULES.weights.Medium;
  let tier = PERSONALITY_WEIGHTS[personality][action];
  if (tier === 'Random') tier = rng.pick(RANDOM_TIERS);
  if (action === 'attack') {
    if (personality === 'Territorial' && !inputs.nearHome) tier = 'Low';
    if (personality === 'Predatory' && !inputs.weakTarget) tier = 'Medium';
  }
  return AI_RULES.weights[tier];
}

/** Scores after personality weights. */
export function scoreActions(inputs: ActionInputs, personality: Personality, rng: Rng): ActionScores {
  const scores = baseScores(inputs);
  for (const action of AI_ACTIONS) scores[action] *= personalityWeight(personality, action, inputs, rng);
  return scores;
}

/** The action with the highest score. Ties go to the earlier action in AI_ACTIONS. */
export function bestAction(scores: ActionScores): AiAction {
  let best: AiAction = 'attack';
  let bestScore = -Infinity;
  for (const action of AI_ACTIONS) {
    if (scores[action] > bestScore) {
      best = action;
      bestScore = scores[action];
    }
  }
  return best;
}

export function chooseAction(inputs: ActionInputs, personality: Personality, rng: Rng): AiAction {
  return bestAction(scoreActions(inputs, personality, rng));
}

// --- Squads ----------------------------------------------------------------------

const GUARD_ROLES: readonly EnemyRole[] = ['Tank', 'Support'];
const WARD_ROLES: readonly EnemyRole[] = ['Ranged attacker', 'Support', 'Summoner', 'Controller'];
const MOBILE_ROLES: readonly EnemyRole[] = ['Skirmisher', 'Swarmer'];

export function hasRole(def: EnemyDef, roles: readonly EnemyRole[]): boolean {
  return def.roles.some((role) => roles.includes(role));
}

/** Tanks and Supports protect allies (GDD 9.15). */
export function isGuard(def: EnemyDef): boolean {
  return hasRole(def, GUARD_ROLES);
}

/** Fragile roles guards stand in front of. */
export function isWard(def: EnemyDef): boolean {
  return hasRole(def, WARD_ROLES) && !def.roles.includes('Tank');
}

/**
 * Leader rank inside a squad: named leaders first, then Supports, then Tanks.
 * 0 means the enemy never leads.
 */
export function leaderRank(def: EnemyDef): number {
  if (def.leader) return 3;
  if (def.roles.includes('Support')) return 2;
  if (def.roles.includes('Tank')) return 1;
  return 0;
}

/**
 * The goal the tactical director gives a squad (GDD 9.15): Protect for squads
 * with guards and fragile allies, Surround for squads led by a named leader or
 * made of fast enemies, Pin for the rest.
 */
export function squadOrder(members: readonly EnemyDef[]): SquadOrder {
  if (members.length === 0) return 'Pin';
  if (members.some((def) => def.leader)) return 'Surround';
  const guards = members.some(isGuard);
  const wards = members.some(isWard);
  if (guards && wards) return 'Protect';
  const mobile = members.filter((def) => hasRole(def, MOBILE_ROLES)).length;
  if (mobile * 2 > members.length) return 'Surround';
  return 'Pin';
}

// --- Fairness and performance (GDD 9.15) -----------------------------------------

/** Enemies allowed to attack the player at once, by territory index. */
export function attackTokens(territory: number): number {
  const tokens = AI_RULES.attackTokens;
  return tokens[Math.min(tokens.length - 1, Math.max(0, territory))] ?? 6;
}

/**
 * Steps between two AI updates by distance to the player: near enemies update
 * every step, mid-range enemies every few steps, distant enemies a few times
 * per second.
 */
export function thinkInterval(distance: number): number {
  if (distance <= AI_RULES.nearDistance) return 1;
  if (distance <= AI_RULES.midDistance) return AI_RULES.midSteps;
  return AI_RULES.farSteps;
}
