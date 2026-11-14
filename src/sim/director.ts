// Encounter director (GDD 4.4 to 4.12, 5.6, 9.12, 9.13): threat budgets, the
// faction mix, spawn groups, formations, elites and champions. The plan is a
// list of spawn entries. The combat simulation sends them in and holds
// spending while the active enemy limit is full.

import { CHAMPION_FIRST_ROUND } from '../data/champions';
import { ENEMIES, ENEMY_LIST } from '../data/enemies';
import type { EnemyDef } from '../data/enemies';
import { EVENTS, EVENT_RULES } from '../data/events';
import type { EventId } from '../data/events';
import { FACTION_MIX, KINGDOMS } from '../data/kingdoms';
import type { FactionName, KingdomName } from '../data/palette';
import { roundDuration, territoryIndex, threatBudget } from '../data/rounds';
import { DIRECTOR_RULES, THREAT_COST, stepTier, tierValue } from '../data/tiers';
import { isGuard, squadOrder } from './ai';
import type { Rng } from './rng';
import type { EnemyRank, Formation, SpawnEntry, SpawnMember } from './world/types';

/** Budget units one enemy costs (GDD 4.11). Elites cost three times the base cost, champions six times. */
export function threatCost(enemy: EnemyDef, rank: EnemyRank = 'normal'): number {
  const base = THREAT_COST[enemy.threat];
  if (rank === 'elite') return base * DIRECTOR_RULES.eliteCostFactor;
  if (rank === 'champion') return base * DIRECTOR_RULES.championCostFactor;
  return base;
}

export interface BudgetSplit {
  trickle: number;
  groups: number;
  assault: number;
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

// --- Faction mix (GDD 5.6) -------------------------------------------------------

export type FactionSlot = 'home' | 'guest' | 'incursion';
const SLOTS: readonly FactionSlot[] = ['home', 'guest', 'incursion'];

/** Territory 1 fields one faction, then two (GDD 4.12). The guest faction joins from this round. */
const GUEST_FIRST_ROUND = 5;

/**
 * Share of the budget per faction slot for a round (GDD 5.6): home about 65
 * per cent, guest about 25 per cent. The last 10 per cent goes to incursions
 * in Territory 3. Before Territory 3 the home faction takes the share.
 */
export function factionShares(round: number): Record<FactionSlot, number> {
  const territory = territoryIndex(round);
  if (round < GUEST_FIRST_ROUND) return { home: 1, guest: 0, incursion: 0 };
  if (territory < 2) return { home: FACTION_MIX.home + FACTION_MIX.incursion, guest: FACTION_MIX.guest, incursion: 0 };
  return { home: FACTION_MIX.home, guest: FACTION_MIX.guest, incursion: FACTION_MIX.incursion };
}

export function slotFaction(kingdom: KingdomName, slot: FactionSlot): FactionName {
  const def = KINGDOMS[kingdom];
  if (slot === 'home') return def.homeFaction;
  if (slot === 'guest') return def.guestFaction;
  return def.incursionFaction;
}

/**
 * Enemies a faction slot fields in a round. Signature enemies appear in their
 * home kingdom only. Costlier enemies join in later rounds.
 */
export function availableEnemies(kingdom: KingdomName, slot: FactionSlot, round: number): EnemyDef[] {
  const faction = slotFaction(kingdom, slot);
  return ENEMY_LIST.filter((enemy) => {
    if (enemy.faction !== faction) return false;
    if (enemy.signatureOf && (slot !== 'home' || enemy.signatureOf !== kingdom)) return false;
    return DIRECTOR_RULES.tierFirstRound[enemy.threat] <= round;
  });
}

// --- Territory events (GDD 5.11) --------------------------------------------------

/** Challenge Tier levers the director reads (GDD 3.9). */
export interface DirectorDifficulty {
  readonly budgetFactor: number;
  readonly eliteSteps: number;
  /** Formations, flanking and coordinated assaults start this many rounds earlier. */
  readonly tacticsRounds: number;
}

export const NORMAL_DIRECTOR: DirectorDifficulty = { budgetFactor: 1, eliteSteps: 0, tacticsRounds: 0 };

/** The event a round hosts. Military Invasion names the invading faction. */
export interface RoundEvent {
  readonly id: EventId;
  readonly invader?: FactionName;
}

// --- Planning --------------------------------------------------------------------

interface Purchase {
  readonly enemy: EnemyDef;
  readonly rank: EnemyRank;
}

class Planner {
  readonly entries: SpawnEntry[] = [];
  private readonly purse: Record<FactionSlot, number>;
  private readonly roster: Record<FactionSlot, EnemyDef[]>;
  private readonly eliteOdds: number;
  private champion = false;
  /** Event groups enter in this formation (GDD 5.11). */
  readonly eventFormation: Formation | undefined;

  constructor(
    readonly round: number,
    readonly kingdom: KingdomName,
    readonly rng: Rng,
    budget: number,
    event?: RoundEvent,
    readonly difficulty: DirectorDifficulty = NORMAL_DIRECTOR,
  ) {
    const shares = factionShares(round);
    this.purse = { home: budget * shares.home, guest: budget * shares.guest, incursion: budget * shares.incursion };
    this.roster = {
      home: availableEnemies(kingdom, 'home', round),
      guest: shares.guest > 0 ? availableEnemies(kingdom, 'guest', round) : [],
      incursion: shares.incursion > 0 ? availableEnemies(kingdom, 'incursion', round) : [],
    };
    const def = event ? EVENTS[event.id] : undefined;
    this.eventFormation = def?.formation;
    if (def?.roster) {
      // The event replaces the faction mix for the round (GDD 5.6). Event enemies skip the round gates.
      this.purse = { home: budget, guest: 0, incursion: 0 };
      this.roster = { home: def.roster.filter((id) => id !== def.leader).map((id) => ENEMIES[id]), guest: [], incursion: [] };
    } else if (event?.id === 'military-invasion' && event.invader) {
      // A random home faction joins in place of the guest and the incursions.
      const invader = event.invader;
      const share = EVENT_RULES.invasionShare;
      this.purse = { home: budget * (1 - share), guest: budget * share, incursion: 0 };
      const gate = Math.max(round, DIRECTOR_RULES.tierFirstRound.Medium);
      this.roster = {
        home: this.roster.home,
        guest: ENEMY_LIST.filter(
          (enemy) => enemy.faction === invader && !enemy.signatureOf && DIRECTOR_RULES.tierFirstRound[enemy.threat] <= gate,
        ),
        incursion: [],
      };
    }
    const tier = stepTier(DIRECTOR_RULES.eliteOdds[territoryIndex(round)] ?? 'Medium', difficulty.eliteSteps);
    this.eliteOdds = round >= DIRECTOR_RULES.eliteFirstRound ? tierValue('criticalChance', tier) : 0;
  }

  /** The faction slot with the most budget left and an enemy at or under the cost limit. */
  pickSlot(limit: number): FactionSlot | undefined {
    let best: FactionSlot | undefined;
    for (const slot of SLOTS) {
      if (!this.roster[slot].some((enemy) => threatCost(enemy) <= limit)) continue;
      if (best === undefined || this.purse[slot] > this.purse[best]) best = slot;
    }
    return best;
  }

  affordable(slot: FactionSlot, limit: number): EnemyDef[] {
    return this.roster[slot].filter((enemy) => threatCost(enemy) <= limit);
  }

  /** Buys one enemy outside the faction rosters, such as an event leader. */
  buyLeader(enemy: EnemyDef): Purchase {
    this.purse.home -= threatCost(enemy);
    return { enemy, rank: 'normal' };
  }

  /** Buys one enemy. Elites appear by the odds of the territory when the budget covers three times the cost. */
  buy(slot: FactionSlot, enemy: EnemyDef, remaining: number): Purchase {
    let rank: EnemyRank = 'normal';
    if (this.eliteOdds > 0 && threatCost(enemy, 'elite') <= remaining && this.rng.chance(this.eliteOdds)) rank = 'elite';
    this.purse[slot] -= threatCost(enemy, rank);
    return { enemy, rank };
  }

  /**
   * A champion for this group, from Round 15, one per round (GDD 9.13).
   * Returns undefined when the odds fail or the budget falls short.
   */
  buyChampion(slot: FactionSlot, remaining: number): Purchase | undefined {
    if (this.champion || this.round < CHAMPION_FIRST_ROUND) return undefined;
    if (!this.rng.chance(tierValue('criticalChance', stepTier(DIRECTOR_RULES.championOdds, this.difficulty.eliteSteps)))) return undefined;
    // Swarmers make poor champions: the director picks from enemies of Low threat or above.
    const choices = this.roster[slot].filter(
      (enemy) => THREAT_COST[enemy.threat] >= THREAT_COST.Low && threatCost(enemy, 'champion') <= remaining,
    );
    if (choices.length === 0) return undefined;
    const enemy = this.rng.pick(choices);
    this.champion = true;
    this.purse[slot] -= threatCost(enemy, 'champion');
    return { enemy, rank: 'champion' };
  }

  /** Turns purchases into one spawn entry: every member enters as one squad. */
  addEntry(time: number, kind: SpawnEntry['kind'], purchases: readonly Purchase[], formation?: Formation): void {
    const members: Array<{ enemy: EnemyDef; rank: EnemyRank; count: number }> = [];
    for (const purchase of purchases) {
      const existing = members.find((member) => member.enemy === purchase.enemy && member.rank === purchase.rank);
      if (existing) existing.count++;
      else members.push({ ...purchase, count: 1 });
    }
    const first = members[0];
    if (!first) return;
    const rest: SpawnMember[] = members.slice(1);
    const defs = purchases.map((purchase) => purchase.enemy);
    this.entries.push({
      time,
      kind,
      enemy: first.enemy,
      count: first.count,
      rank: first.rank,
      ...(rest.length > 0 ? { with: rest } : {}),
      ...(purchases.length > 1 ? { order: squadOrder(defs) } : {}),
      ...(formation ? { formation } : {}),
    });
  }

  /**
   * Builds one group for a budget: a core of one enemy type, then one or two
   * other types from the same faction. Returns the purchases and the cost.
   */
  buildGroup(budget: number, sizeBonus: number): { purchases: Purchase[]; cost: number } {
    const purchases: Purchase[] = [];
    let remaining = budget;
    const slot = this.pickSlot(remaining);
    if (!slot) return { purchases, cost: 0 };

    const champion = this.buyChampion(slot, remaining);
    if (champion) {
      purchases.push(champion);
      remaining -= threatCost(champion.enemy, 'champion');
    }

    // The core: an enemy type cheap enough for two or more, where one exists.
    let cores = this.affordable(slot, remaining / 2);
    if (cores.length === 0) cores = this.affordable(slot, remaining);
    if (cores.length === 0) return { purchases, cost: budget - remaining };
    const core = this.rng.pick(cores);
    const coreCost = threatCost(core);
    const others = this.affordable(slot, remaining).filter((enemy) => enemy !== core);
    const mixed = others.length > 0 && this.round >= 2;
    const coreBudget = mixed ? remaining * 0.6 : remaining;
    const size = this.rng.int(DIRECTOR_RULES.groupSizeMin, DIRECTOR_RULES.groupSizeMax) + sizeBonus;
    const coreCount = Math.max(1, Math.min(size, Math.floor(coreBudget / coreCost)));
    for (let i = 0; i < coreCount && remaining >= coreCost; i++) {
      const purchase = this.buy(slot, core, remaining);
      purchases.push(purchase);
      remaining -= threatCost(core, purchase.rank);
    }

    // Complexity: other enemy types join the core (GDD 4.5).
    if (mixed) {
      const types = this.round + this.difficulty.tacticsRounds >= DIRECTOR_RULES.formationFirstRound ? 2 : 1;
      for (let i = 0; i < types; i++) {
        const choices = this.affordable(slot, remaining).filter((enemy) => enemy !== core);
        if (choices.length === 0) break;
        const enemy = this.rng.pick(choices);
        const count = THREAT_COST[enemy.threat] <= THREAT_COST.Low ? 2 : 1;
        for (let n = 0; n < count && threatCost(enemy) <= remaining; n++) {
          const purchase = this.buy(slot, enemy, remaining);
          purchases.push(purchase);
          remaining -= threatCost(enemy, purchase.rank);
        }
      }
    }

    // Spend what is left on the core, up to twice the group size.
    while (remaining >= coreCost && purchases.length < size * 2) {
      const purchase = this.buy(slot, core, remaining);
      purchases.push(purchase);
      remaining -= threatCost(core, purchase.rank);
    }
    return { purchases, cost: budget - remaining };
  }

  /** How a group enters: shield lines from Round 5, flanking from Round 12 (GDD 4.11). */
  formationFor(purchases: readonly Purchase[]): Formation | undefined {
    if (this.eventFormation && purchases.length >= 2) return this.eventFormation;
    const round = this.round + this.difficulty.tacticsRounds;
    if (purchases.length < 3 || round < DIRECTOR_RULES.formationFirstRound) return undefined;
    if (purchases.some((purchase) => isGuard(purchase.enemy))) return 'line';
    if (round >= DIRECTOR_RULES.flankFirstRound && purchases.length >= 4 && this.rng.chance(0.4)) return 'pincer';
    return undefined;
  }
}

/**
 * Builds the spawn schedule for a round in a kingdom. Budget left over by one
 * share moves to the next share, so the plan spends as much of the budget as
 * whole enemies allow. Unspent budget never carries over to the next round.
 */
export function planRound(
  round: number,
  kingdom: KingdomName,
  rng: Rng,
  event?: RoundEvent,
  difficulty: DirectorDifficulty = NORMAL_DIRECTOR,
): SpawnEntry[] {
  const duration = roundDuration(round);
  // The threat budget lever raises every round's budget (GDD 3.9).
  const budget = Math.round(threatBudget(round) * difficulty.budgetFactor);
  const split = splitBudget(budget);
  const territory = territoryIndex(round);
  const planner = new Planner(round, kingdom, rng, budget, event, difficulty);

  // Outlaw Ambush: a Mercenary Captain leads the first group (GDD 5.11).
  const leaderId = event ? EVENTS[event.id].leader : undefined;
  let leader: Purchase | undefined;
  if (leaderId) {
    leader = planner.buyLeader(ENEMIES[leaderId]);
    split.groups -= threatCost(leader.enemy);
  }

  // Steady trickle: single enemies and small packs at even intervals.
  // Territory 1 trickles enemies up to Medium threat. Later territories add High threat.
  const trickleCap = territory === 0 ? THREAT_COST.Medium : THREAT_COST.High;
  const trickle: Purchase[][] = [];
  let remaining = split.trickle;
  for (;;) {
    const slot = planner.pickSlot(Math.min(remaining, trickleCap));
    if (!slot) break;
    const enemy = rng.pick(planner.affordable(slot, Math.min(remaining, trickleCap)));
    // Minimal enemies swarm in packs (GDD 9.11).
    const pack = THREAT_COST[enemy.threat] === THREAT_COST.Minimal ? 3 : 1;
    const purchases: Purchase[] = [];
    for (let i = 0; i < pack && threatCost(enemy) <= remaining; i++) {
      const purchase = planner.buy(slot, enemy, remaining);
      purchases.push(purchase);
      remaining -= threatCost(enemy, purchase.rank);
    }
    trickle.push(purchases);
  }
  const trickleEnd = duration * DIRECTOR_RULES.trickleEnd;
  trickle.forEach((purchases, index) => {
    const share = trickle.length === 1 ? 0 : index / (trickle.length - 1);
    const time = DIRECTOR_RULES.firstSpawnSeconds + (trickleEnd - DIRECTOR_RULES.firstSpawnSeconds) * share;
    planner.addEntry(time, 'trickle', purchases);
  });

  // Group spawns with short gaps between them. Groups grow with the territory (GDD 4.5).
  remaining += split.groups;
  const groupCount = Math.min(8, Math.max(2, Math.round(split.groups / 8)));
  const groupBudget = split.groups / groupCount;
  const groups: Purchase[][] = [];
  for (let i = 0; i < groupCount * 3 && remaining >= 1; i++) {
    const { purchases, cost } = planner.buildGroup(Math.min(remaining, Math.max(groupBudget, 4)), territory * 2);
    if (purchases.length === 0) break;
    remaining -= cost;
    groups.push(purchases);
    if (groups.length >= groupCount && remaining < groupBudget) break;
  }
  if (leader) {
    if (groups[0]) groups[0].unshift(leader);
    else groups.push([leader]);
  }
  groups.forEach((purchases, index) => {
    const share = groups.length === 1 ? 0.5 : index / (groups.length - 1);
    const time = duration * (DIRECTOR_RULES.groupsStart + (DIRECTOR_RULES.groupsEnd - DIRECTOR_RULES.groupsStart) * share);
    planner.addEntry(time, 'group', purchases, planner.formationFor(purchases));
  });

  // One closing assault with the remainder: larger formations, from several sides in later rounds.
  remaining += split.assault;
  const assaultTime = duration * DIRECTOR_RULES.assaultTime;
  let assaultFormation: Formation | undefined;
  const tactical = round + difficulty.tacticsRounds;
  if (tactical >= DIRECTOR_RULES.coordinatedFirstRound) assaultFormation = 'ring';
  else if (tactical >= DIRECTOR_RULES.flankFirstRound) assaultFormation = 'pincer';
  for (let i = 0; i < 12 && remaining >= 1; i++) {
    const { purchases, cost } = planner.buildGroup(remaining, 4 + territory * 4);
    if (purchases.length === 0) break;
    remaining -= cost;
    planner.addEntry(assaultTime, 'assault', purchases, assaultFormation ?? planner.formationFor(purchases));
  }

  return planner.entries.sort((a, b) => a.time - b.time);
}

// --- Reading a plan --------------------------------------------------------------

function membersOf(entry: SpawnEntry): SpawnMember[] {
  return [{ enemy: entry.enemy, count: entry.count, rank: entry.rank }, ...(entry.with ?? [])];
}

/** Threat units a plan spends. */
export function planCost(entries: readonly SpawnEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const member of membersOf(entry)) total += threatCost(member.enemy, member.rank ?? 'normal') * member.count;
  }
  return total;
}

export interface PlanSummary {
  readonly spent: number;
  readonly enemies: number;
  readonly elites: number;
  readonly champions: number;
  /** Threat units per faction. */
  readonly byFaction: Partial<Record<FactionName, number>>;
}

export function summarisePlan(entries: readonly SpawnEntry[]): PlanSummary {
  let enemies = 0;
  let elites = 0;
  let champions = 0;
  const byFaction: Partial<Record<FactionName, number>> = {};
  for (const entry of entries) {
    for (const member of membersOf(entry)) {
      enemies += member.count;
      if (member.rank === 'elite') elites += member.count;
      if (member.rank === 'champion') champions += member.count;
      const cost = threatCost(member.enemy, member.rank ?? 'normal') * member.count;
      byFaction[member.enemy.faction] = (byFaction[member.enemy.faction] ?? 0) + cost;
    }
  }
  return { spent: planCost(entries), enemies, elites, champions, byFaction };
}
