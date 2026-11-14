// Run state: the campaign between rounds. 21 rounds across three kingdoms
// revealed one at a time, one event per territory, weapons, the economy and
// research. Milestone 8 adds bosses, relics and endings.

import { ARENA_BY_KINGDOM } from '../data/arenas';
import type { ArenaDef } from '../data/arenas';
import { EVENT_RULES, SIGNATURE_EVENT } from '../data/events';
import type { EventId } from '../data/events';
import type { CharacterDef } from '../data/characters';
import { emptyMaterials } from '../data/economy';
import type { MaterialStock } from '../data/economy';
import { FIRST_CAMPAIGN_KINGDOM, KINGDOMS, KINGDOM_NAMES } from '../data/kingdoms';
import type { FactionName, KingdomName } from '../data/palette';
import { CAMPAIGN_ROUNDS, ROUNDS_PER_TERRITORY, roundDuration, roundInTerritory, roundKind, territoryIndex } from '../data/rounds';
import { ADAPTATION, PERFORMANCE_LIMITS, stepTier, tierValue } from '../data/tiers';
import { RELICS, RELIC_RULES, relicEffects, relicRuleTotal, relicsOf } from '../data/relics';
import type { RelicId, RelicRule } from '../data/relics';
import { TAGS } from '../data/tags';
import type { PerformanceLimits } from '../data/tiers';
import type { WeaponDef } from '../data/weapons';
import type { ShopId } from '../data/shop';
import { RESEARCH_RULES } from '../data/research';
import type { UpgradeStat } from '../data/economy';
import { createArchive } from './archive';
import type { ArchiveState } from './archive';
import { BOSS_BY_KINGDOM } from '../data/bosses';
import { MINI_BOSS_BY_KINGDOM } from '../data/miniBosses';
import type { BossPlan } from './world/bosses';
import { planRound } from './director';
import type { RoundEvent } from './director';
import { beginPreparation, createShops, recordRound } from './economy';
import type { RoundLedger, ShopState } from './economy';
import { WEAPON_SLOTS, cloneWeapon, createComponent, createWeapon, installedComponents, resolveLoadout, weaponTags } from './loadout';
import type { ComponentInstance, WeaponInstance } from './loadout';
import { applyFindings, createResearch, hasRule, queueCapture, resolveResearch } from './research';
import type { ResearchState } from './research';
import { Rng } from './rng';
import type { AdaptationMap, PlayerStats, RoundStats } from './world/types';
import { World } from './world/world';

/** The territory event: which one, and the campaign round it runs in (GDD 5.11). */
export interface TerritoryEvent extends RoundEvent {
  readonly round: number;
}

/**
 * Rounds playable in the current build: the full campaign (GDD 4.10).
 * Mini-boss and boss rounds spend their budget with no boss until Milestone 8.
 */
export const PLAYABLE_ROUNDS = CAMPAIGN_ROUNDS;

export type RunStatus = 'active' | 'dead' | 'complete';

export interface RoundResult {
  readonly round: number;
  readonly survived: boolean;
  /** Seconds of combat. */
  readonly seconds: number;
  readonly stats: Readonly<RoundStats>;
  /** Gold, materials and components collected in the round. */
  readonly gold: number;
  readonly materials: Readonly<MaterialStock>;
  readonly components: readonly string[];
  /** Research Points earned (GDD 8.5). */
  readonly research: number;
  /** Hidden nodes the round discovered (GDD 8.12). */
  readonly discoveries: readonly string[];
  /** The territory event of the round, if any, and its extra gold (GDD 5.11). */
  readonly event?: EventId;
  readonly eventGold: number;
}

export interface RunState {
  readonly seed: number;
  readonly character: CharacterDef;
  /** Up to three weapons (GDD 7.1). */
  weapons: WeaponInstance[];
  /**
   * The kingdom of each territory revealed so far (GDD 5.7). The next kingdom
   * stays unknown until the player presses Start after the boss (GDD 5.8).
   */
  kingdoms: KingdomName[];
  /** The event of each territory, planned when the kingdom is revealed (GDD 5.11). */
  events: Array<TerritoryEvent | undefined>;
  /** The first campaign ever starts in Keldrath (GDD 5.7) and shows the opening card (GDD 2.4). */
  readonly firstCampaign: boolean;
  /** Gold carried (GDD 14.1). Highwaymen steal from this (GDD 9.11). */
  gold: number;
  /** Materials by type (GDD 14.2). */
  materials: MaterialStock;
  /** The component tray: every owned component not installed (GDD 15.8). */
  inventory: ComponentInstance[];
  /** Weapons owned beyond the three slots. */
  reserve: WeaponInstance[];
  /** Three shops with separate stock (GDD 6.5). */
  shops: Record<ShopId, ShopState>;
  /** A free milestone visit waits for a shop of the player's choice (GDD 6.1). */
  freeVisit: boolean;
  /** Free rerolls per visit from the Grand Archive (GDD 6.5). Milestone 9 fills this. */
  freeRerolls: number;
  /** Economy per round, for the debug logger. */
  ledger: RoundLedger[];
  /** The round about to start or in progress, from 1. */
  round: number;
  status: RunStatus;
  /** Adaptation lasts for a territory (GDD 3.7). */
  adaptation: AdaptationMap;
  /** Research synergies opened by research nodes (GDD 7.19). */
  researchSynergies: string[];
  /** Research Points and researched nodes. Both reset each run (GDD 8.5). */
  research: ResearchState;
  /** The Grand Archive: discovered nodes and mastery last across runs (GDD 8.13). */
  archive: ArchiveState;
  /** Kingdom Relics held. They last for the rest of the run (GDD 5.12). */
  relics: RelicId[];
  /** Relics on offer after a territory boss. Empty when no choice waits (GDD 5.8 step 3). */
  relicChoices: RelicId[];
  /** The stat the Mutagen Flask raised this round, for the HUD. */
  flaskStat: FlaskStat | undefined;
  readonly history: RoundResult[];
}

export function createRun(
  seed: number,
  character: CharacterDef,
  startingWeapon: WeaponDef,
  archive: ArchiveState = createArchive(),
): RunState {
  const firstCampaign = archive.campaigns === 0;
  archive.campaigns++;
  return {
    seed: seed >>> 0,
    character,
    weapons: [createWeapon(startingWeapon)],
    kingdoms: [],
    events: [],
    firstCampaign,
    gold: 0,
    materials: emptyMaterials(),
    inventory: [],
    reserve: [],
    shops: createShops(),
    freeVisit: false,
    freeRerolls: 0,
    ledger: [],
    round: 1,
    status: 'active',
    adaptation: {},
    researchSynergies: [],
    research: createResearch(),
    archive,
    relics: [],
    relicChoices: [],
    flaskStat: undefined,
    history: [],
  };
}

/** Base stats the Mutagen Flask can raise for a round (GDD 5.12). */
export const FLASK_STATS = [
  'maxHealth',
  'armour',
  'regeneration',
  'evasion',
  'moveSpeed',
  'pickupRadius',
  'criticalChance',
  'criticalDamage',
] as const;
export type FlaskStat = (typeof FLASK_STATS)[number];

/**
 * Player numbers from the character's base tiers (GDD 3.6). Relics move base
 * tiers up whole steps (GDD 5.12). The Mutagen Flask adds one step to one stat.
 */
export function resolvePlayerStats(character: CharacterDef, relics: readonly RelicId[] = [], flask?: FlaskStat): PlayerStats {
  const base = character.baseStats;
  const steps = (stat: FlaskStat | 'fortune' | 'constructStrength'): number => {
    let total = stat === flask ? 1 : 0;
    for (const effect of relicEffects(relics, 'playerSteps')) if (effect.stat === stat) total += effect.steps;
    return total;
  };
  const tier = (stat: FlaskStat) => stepTier(base[stat], steps(stat));
  return {
    maxHealth: tierValue('playerMaxHealth', tier('maxHealth')),
    armour: tierValue('armour', tier('armour')),
    regeneration: tierValue('regeneration', tier('regeneration')),
    evasion: tierValue('evasion', tier('evasion')),
    moveSpeed: tierValue('playerMoveSpeed', tier('moveSpeed')),
    pickupRadius: tierValue('pickupRadius', tier('pickupRadius')),
    criticalChance: tierValue('criticalChance', tier('criticalChance')),
    criticalDamage: tierValue('criticalDamage', tier('criticalDamage')),
    adaptationPerHit: ADAPTATION.perHit,
    adaptationCap: ADAPTATION.baseCap,
    // Status Potency has base Low (GDD 3.6): no change at the base tier.
    statusPotency: 1,
    // Research Yield has base Medium and Fortune base Low (GDD 3.6): no change at the base tiers.
    researchYield: 1,
    // Fortune and Construct Strength have no number row: each step adds a share (NOTES.md).
    fortune: RELIC_RULES.stepShare * steps('fortune'),
    constructStrength: 1 + RELIC_RULES.stepShare * steps('constructStrength'),
  };
}

/** The kingdom whose roster a round uses. Unrevealed territories fall back to the last kingdom known. */
export function kingdomForRound(run: RunState, round: number = run.round): KingdomName {
  for (let index = territoryIndex(round); index >= 0; index--) {
    const kingdom = run.kingdoms[index];
    if (kingdom) return kingdom;
  }
  return FIRST_CAMPAIGN_KINGDOM;
}

/** The arena of a round's kingdom (GDD 5.9). */
export function arenaForRound(run: RunState, round: number = run.round): ArenaDef {
  return ARENA_BY_KINGDOM[kingdomForRound(run, round)];
}

/** True when the kingdom of the current territory waits for its reveal (GDD 5.8). */
export function revealPending(run: RunState): boolean {
  return run.kingdoms[territoryIndex(run.round)] === undefined;
}

/**
 * Reveals the kingdom of the current territory (GDD 5.7, 5.8): random among
 * kingdoms not yet visited, Keldrath for the first campaign ever, and plans
 * the territory's one event (GDD 5.11). Returns the kingdom.
 */
export function revealKingdom(run: RunState): KingdomName {
  const territory = territoryIndex(run.round);
  const known = run.kingdoms[territory];
  if (known) return known;
  const rng = new Rng(run.seed).fork(8000 + territory);
  const unvisited = KINGDOM_NAMES.filter((name) => !run.kingdoms.includes(name));
  const kingdom =
    territory === 0 && run.firstCampaign ? FIRST_CAMPAIGN_KINGDOM : rng.pick(unvisited.length > 0 ? unvisited : KINGDOM_NAMES);
  run.kingdoms[territory] = kingdom;
  run.events[territory] = planEvent(kingdom, territory, rng);
  return kingdom;
}

/** One event per territory: a random round from 2, 3, 5 and 6, and the GDD 5.11 odds. */
export function planEvent(kingdom: KingdomName, territory: number, rng: Rng): TerritoryEvent {
  const local = rng.pick(EVENT_RULES.rounds);
  const round = territory * ROUNDS_PER_TERRITORY + local;
  const roll = rng.next();
  const odds = EVENT_RULES.odds;
  if (roll < odds.signature) return { id: SIGNATURE_EVENT[kingdom], round };
  if (roll < odds.signature + odds.invasion) {
    // Another kingdom's home faction, distinct from this kingdom's own factions (NOTES.md).
    const own: FactionName[] = [KINGDOMS[kingdom].homeFaction, KINGDOMS[kingdom].guestFaction];
    const invaders = KINGDOM_NAMES.map((name) => KINGDOMS[name].homeFaction).filter((faction) => !own.includes(faction));
    return { id: 'military-invasion', round, invader: rng.pick(invaders) };
  }
  return { id: 'outlaw-ambush', round };
}

/**
 * The bosses of a round (GDD 4.10, 10.6): the kingdom's mini-boss on Round 4
 * of a territory, the boss with an escort on Round 7. The escort is the
 * mini-boss of the previous territory, or the kingdom's own in Territory 1.
 * The final boss borrows the signature attacks of the bosses beaten before.
 */
export function bossPlanForRound(run: RunState, round: number = run.round): BossPlan | undefined {
  const kind = roundKind(round);
  if (kind === 'encounter') return undefined;
  const kingdom = kingdomForRound(run, round);
  if (kind === 'mini-boss') return { kind: 'mini', mini: MINI_BOSS_BY_KINGDOM[kingdom].id };
  const territory = territoryIndex(round);
  const previous = territory > 0 ? run.kingdoms[territory - 1] : undefined;
  const final = round >= PLAYABLE_ROUNDS;
  const borrowed = final
    ? run.kingdoms.slice(0, territory).filter((name): name is KingdomName => name !== undefined && name !== kingdom).map((name) => BOSS_BY_KINGDOM[name].id)
    : [];
  return { kind: 'boss', boss: BOSS_BY_KINGDOM[kingdom].id, escort: MINI_BOSS_BY_KINGDOM[previous ?? kingdom].id, borrowed };
}

/** The event running in a round, if any. */
export function eventForRound(run: RunState, round: number = run.round): TerritoryEvent | undefined {
  const event = run.events[territoryIndex(round)];
  return event && event.round === round ? event : undefined;
}

/** A copy of the loadout with every Auxiliary component removed, for The Unstable (GDD 9.11). */
function withoutAuxiliary(weapons: readonly WeaponInstance[]): WeaponInstance[] {
  return weapons.map((weapon) => {
    const copy = cloneWeapon(weapon);
    delete copy.components.Auxiliary;
    return copy;
  });
}

/** Builds the combat simulation for the run's current round. */
export function createWorldForRound(run: RunState, limits: PerformanceLimits = PERFORMANCE_LIMITS.pc): World {
  // One generator per round, so a round replays the same way from the run seed.
  const roundRng = new Rng(run.seed).fork(run.round);
  // Tags and stats only change during preparation, so the loadout resolves once per round.
  // Synergies recalculate here, when the player presses Start (CLAUDE.md rule 7).
  const relics = run.relics;
  const relicRng = new Rng(run.seed).fork(9500 + run.round);
  // Mutagen Flask: one random stat gains a step for the round (GDD 5.12).
  run.flaskStat = relicRuleTotal(relics, 'mutagenFlask') > 0 ? relicRng.pick(FLASK_STATS) : undefined;
  // Shard of the Unmaking: every weapon gains one random extra tag for the round (GDD 5.12).
  const shard = relicRuleTotal(relics, 'shardTags') > 0;
  const equipped = run.weapons.slice(0, WEAPON_SLOTS).map((weapon) => {
    if (!shard) return weapon;
    const copy = cloneWeapon(weapon);
    const own = weaponTags(weapon);
    const choices = TAGS.filter((tag) => !own.includes(tag));
    copy.roundTags = choices.length > 0 ? [relicRng.pick(choices)] : [];
    return copy;
  });
  const base = resolvePlayerStats(run.character, relics, run.flaskStat);
  const research = resolveResearch(run.research.researched);
  const loadout = resolveLoadout(equipped, base, { research, relics });
  const suppressed = resolveLoadout(withoutAuxiliary(equipped), base, { research, relics });
  const nulled = resolveLoadout(withoutAuxiliary(equipped), base, { research, relics, noSynergies: true });
  const relicRules = new Map<RelicRule, number>();
  for (const id of relics) {
    for (const effect of RELICS[id].effects) {
      if (effect.kind === 'rule') relicRules.set(effect.rule, (relicRules.get(effect.rule) ?? 0) + effect.amount);
    }
  }
  const bosses = bossPlanForRound(run);
  // A run driven without the scenes reveals its kingdom here.
  const kingdom = revealKingdom(run);
  const event = eventForRound(run);
  return new World({
    arena: ARENA_BY_KINGDOM[kingdom],
    localRound: roundInTerritory(run.round),
    ...(event ? { event: event.id } : {}),
    seed: roundRng.int(0, 0xffffffff),
    round: run.round,
    duration: roundDuration(run.round),
    spawns: planRound(run.round, kingdom, roundRng, event),
    playerStats: loadout.playerStats,
    weapons: loadout.weapons,
    // A weapon with no Auxiliary component keeps its numbers under suppression.
    suppressedWeapons: loadout.weapons.map((weapon, index) =>
      equipped[index]?.components.Auxiliary ? (suppressed.weapons[index] ?? weapon) : weapon,
    ),
    nulledWeapons: nulled.weapons,
    relicRules,
    ...(bosses ? { bosses } : {}),
    gold: run.gold,
    synergies: loadout.synergies,
    adaptation: run.adaptation,
    research: research.rules,
    limits,
  });
}

/** Records a finished round and moves the run on. The player heals in full before the next round (GDD 3.7). */
export function finishRound(run: RunState, world: World): RoundResult {
  const survived = world.phase === 'cleared';
  const loot = world.loot;
  // Event rounds pay 25 per cent extra gold (GDD 5.11).
  const event = eventForRound(run);
  const eventGold = event && survived ? Math.round(loot.gold * EVENT_RULES.goldBonus) : 0;
  const result: RoundResult = {
    round: run.round,
    survived,
    seconds: world.elapsed,
    stats: { ...world.stats },
    gold: loot.gold,
    materials: { ...loot.materials },
    components: loot.components.map((component) => component.name),
    research: loot.research,
    discoveries: applyFindings(run, world.findings, {
      survived,
      healthShare: world.player.health / world.player.stats.maxHealth,
      weapons: run.weapons.slice(0, WEAPON_SLOTS).map((weapon) => weapon.def.name),
    }),
    ...(event ? { event: event.id } : {}),
    eventGold,
  };
  run.history.push(result);
  run.research.points += loot.research;
  // Loot collected before a defeat still counts for the campaign statistics.
  run.gold = world.gold + eventGold;
  let materialsEarned = 0;
  for (const material of Object.keys(loot.materials) as Array<keyof MaterialStock>) {
    run.materials[material] += loot.materials[material];
    materialsEarned += loot.materials[material];
  }
  for (const component of loot.components) run.inventory.push(createComponent(component));
  // Compound Interest: 5 per cent of unspent gold at the end of each round, up to 25 gold.
  let interest = 0;
  if (survived && hasRule(run, 'compoundInterest')) {
    interest = Math.min(RESEARCH_RULES.interestCap, Math.floor(run.gold * RESEARCH_RULES.interestShare));
    run.gold += interest;
  }
  recordRound(run, run.round, world.stats.kills, loot.gold + eventGold + interest, materialsEarned, loot.components.length, loot.research);
  // Adaptation lasts for a territory (GDD 3.7).
  const sameTerritory = territoryIndex(run.round + 1) === territoryIndex(run.round);
  run.adaptation = sameTerritory ? { ...world.player.adaptation } : {};

  if (survived) {
    // Growth effects count rounds completed with the item equipped (GDD 7.17, 7.18).
    for (const weapon of run.weapons) {
      weapon.rounds++;
      for (const component of installedComponents(weapon)) component.rounds++;
    }
    if (hasRule(run, 'mutagenics')) mutate(run);
    // Relic choice and captured research after each territory except the last (GDD 5.8).
    if (roundKind(run.round) === 'boss' && run.round < PLAYABLE_ROUNDS) {
      const kingdom = kingdomForRound(run);
      run.relicChoices = relicsOf(kingdom)
        .map((entry) => entry.id)
        .filter((id) => !run.relics.includes(id));
      queueCapture(run, kingdom);
    }
  }

  if (!survived) {
    run.status = 'dead';
  } else if (run.round >= PLAYABLE_ROUNDS) {
    run.status = 'complete';
  } else {
    // Preparation follows every round. Mini-boss and boss rounds grant a free shop visit (GDD 6.1).
    beginPreparation(run, run.round);
    run.round++;
  }
  return result;
}

/** Takes one relic from the choice on offer (GDD 5.12). Returns false when the relic is not on offer. */
export function takeRelic(run: RunState, id: RelicId): boolean {
  if (!run.relicChoices.includes(id)) return false;
  run.relics.push(id);
  run.relicChoices = [];
  return true;
}

/** Mutagenics: each round, one Organic component gains a random stat step, up to High (GDD 8.12). */
function mutate(run: RunState): void {
  const rng = new Rng(run.seed).fork(9000 + run.round);
  const stats: UpgradeStat[] = ['damage', 'attackSpeed', 'range'];
  const total = (component: ComponentInstance): number =>
    Object.values(component.mutations ?? {}).reduce((sum, steps) => sum + steps, 0);
  const organic = run.weapons
    .slice(0, WEAPON_SLOTS)
    .flatMap((weapon) => installedComponents(weapon))
    .filter((component) => component.def.tags.includes('Organic') && total(component) < RESEARCH_RULES.mutationCap);
  if (organic.length === 0) return;
  const component = rng.pick(organic);
  const stat = rng.pick(stats);
  component.mutations = { ...component.mutations, [stat]: (component.mutations?.[stat] ?? 0) + 1 };
}

/** Totals across every round played so far. */
export function runTotals(run: RunState): RoundStats & { seconds: number; roundsSurvived: number } {
  const totals = {
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    hitsTaken: 0,
    hitsEvaded: 0,
    shotsFired: 0,
    criticalHits: 0,
    seconds: 0,
    roundsSurvived: 0,
  };
  for (const result of run.history) {
    totals.kills += result.stats.kills;
    totals.damageDealt += result.stats.damageDealt;
    totals.damageTaken += result.stats.damageTaken;
    totals.hitsTaken += result.stats.hitsTaken;
    totals.hitsEvaded += result.stats.hitsEvaded;
    totals.shotsFired += result.stats.shotsFired;
    totals.criticalHits += result.stats.criticalHits;
    totals.seconds += result.seconds;
    if (result.survived) totals.roundsSurvived++;
  }
  return totals;
}
