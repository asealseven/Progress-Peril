// Run state: the campaign between rounds. So far: 21 rounds across three
// territories, up to three weapons with components, and no economy. Later
// milestones add the shop, kingdom selection, bosses and relics.

import { ARENAS } from '../data/arenas';
import type { ArenaDef } from '../data/arenas';
import type { CharacterDef } from '../data/characters';
import { emptyMaterials } from '../data/economy';
import type { MaterialStock } from '../data/economy';
import { DEFAULT_KINGDOM_ORDER } from '../data/kingdoms';
import type { KingdomName } from '../data/palette';
import { CAMPAIGN_ROUNDS, roundDuration, territoryIndex } from '../data/rounds';
import { ADAPTATION, PERFORMANCE_LIMITS, tierValue } from '../data/tiers';
import type { PerformanceLimits } from '../data/tiers';
import type { WeaponDef } from '../data/weapons';
import type { ShopId } from '../data/shop';
import { planRound } from './director';
import { beginPreparation, createShops, recordRound } from './economy';
import type { RoundLedger, ShopState } from './economy';
import { WEAPON_SLOTS, cloneWeapon, createComponent, createWeapon, installedComponents, resolveLoadout } from './loadout';
import type { ComponentInstance, WeaponInstance } from './loadout';
import { Rng } from './rng';
import type { AdaptationMap, PlayerStats, RoundStats } from './world/types';
import { World } from './world/world';

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
}

export interface RunState {
  readonly seed: number;
  readonly character: CharacterDef;
  /** Up to three weapons (GDD 7.1). */
  weapons: WeaponInstance[];
  readonly arena: ArenaDef;
  /**
   * The kingdom roster of each territory (GDD 5.6). Milestone 7 adds kingdom
   * selection and arenas. Until then every territory plays in the same arena.
   */
  kingdoms: KingdomName[];
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
  /** Research synergies opened by research nodes (GDD 7.19). Milestone 6 fills the list. */
  researchSynergies: string[];
  readonly history: RoundResult[];
}

export function createRun(seed: number, character: CharacterDef, startingWeapon: WeaponDef): RunState {
  return {
    seed: seed >>> 0,
    character,
    weapons: [createWeapon(startingWeapon)],
    arena: ARENAS['great-foundry'],
    kingdoms: [...DEFAULT_KINGDOM_ORDER],
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
    history: [],
  };
}

/** Player numbers from the character's base tiers (GDD 3.6). */
export function resolvePlayerStats(character: CharacterDef): PlayerStats {
  const base = character.baseStats;
  return {
    maxHealth: tierValue('playerMaxHealth', base.maxHealth),
    armour: tierValue('armour', base.armour),
    regeneration: tierValue('regeneration', base.regeneration),
    evasion: tierValue('evasion', base.evasion),
    moveSpeed: tierValue('playerMoveSpeed', base.moveSpeed),
    pickupRadius: tierValue('pickupRadius', base.pickupRadius),
    criticalChance: tierValue('criticalChance', base.criticalChance),
    criticalDamage: tierValue('criticalDamage', base.criticalDamage),
    adaptationPerHit: ADAPTATION.perHit,
    adaptationCap: ADAPTATION.baseCap,
    // Status Potency has base Low (GDD 3.6): no change at the base tier.
    statusPotency: 1,
  };
}

/** The kingdom whose roster a round uses. */
export function kingdomForRound(run: RunState, round: number = run.round): KingdomName {
  return run.kingdoms[territoryIndex(round)] ?? run.kingdoms[0] ?? 'Keldrath';
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
  const equipped = run.weapons.slice(0, WEAPON_SLOTS);
  const base = resolvePlayerStats(run.character);
  const loadout = resolveLoadout(equipped, base, { researchSynergies: run.researchSynergies });
  const suppressed = resolveLoadout(withoutAuxiliary(equipped), base, { researchSynergies: run.researchSynergies });
  return new World({
    arena: run.arena,
    seed: roundRng.int(0, 0xffffffff),
    round: run.round,
    duration: roundDuration(run.round),
    spawns: planRound(run.round, kingdomForRound(run), roundRng),
    playerStats: loadout.playerStats,
    weapons: loadout.weapons,
    // A weapon with no Auxiliary component keeps its numbers under suppression.
    suppressedWeapons: loadout.weapons.map((weapon, index) =>
      equipped[index]?.components.Auxiliary ? (suppressed.weapons[index] ?? weapon) : weapon,
    ),
    gold: run.gold,
    synergies: loadout.synergies,
    adaptation: run.adaptation,
    limits,
  });
}

/** Records a finished round and moves the run on. The player heals in full before the next round (GDD 3.7). */
export function finishRound(run: RunState, world: World): RoundResult {
  const survived = world.phase === 'cleared';
  const loot = world.loot;
  const result: RoundResult = {
    round: run.round,
    survived,
    seconds: world.elapsed,
    stats: { ...world.stats },
    gold: loot.gold,
    materials: { ...loot.materials },
    components: loot.components.map((component) => component.name),
  };
  run.history.push(result);
  // Loot collected before a defeat still counts for the campaign statistics.
  run.gold = world.gold;
  let materialsEarned = 0;
  for (const material of Object.keys(loot.materials) as Array<keyof MaterialStock>) {
    run.materials[material] += loot.materials[material];
    materialsEarned += loot.materials[material];
  }
  for (const component of loot.components) run.inventory.push(createComponent(component));
  recordRound(run, run.round, world.stats.kills, loot.gold, materialsEarned, loot.components.length);
  // Adaptation lasts for a territory (GDD 3.7).
  const sameTerritory = territoryIndex(run.round + 1) === territoryIndex(run.round);
  run.adaptation = sameTerritory ? { ...world.player.adaptation } : {};

  if (survived) {
    // Growth effects count rounds completed with the item equipped (GDD 7.17, 7.18).
    for (const weapon of run.weapons) {
      weapon.rounds++;
      for (const component of installedComponents(weapon)) component.rounds++;
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
