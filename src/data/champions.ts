// Champion traits (GDD 9.13). Names and effects come from GDD.md.

export const CHAMPION_TRAIT_IDS = [
  'warlord',
  'juggernaut',
  'purifier',
  'phase-shifter',
  'reactive-plating',
  'siege-breaker',
  'overclocked',
] as const;

export type ChampionTraitId = (typeof CHAMPION_TRAIT_IDS)[number];

export interface ChampionTraitDef {
  readonly id: ChampionTraitId;
  readonly name: string;
  /** Effect wording from GDD 9.13. */
  readonly effect: string;
}

export const CHAMPION_TRAITS: Readonly<Record<ChampionTraitId, ChampionTraitDef>> = {
  warlord: { id: 'warlord', name: 'Warlord', effect: 'Summons an escort group at set health thresholds' },
  juggernaut: { id: 'juggernaut', name: 'Juggernaut', effect: 'Immune to Stun, knockback and slows' },
  purifier: {
    id: 'purifier',
    name: 'Purifier',
    effect: 'Clears all status effects and empties all status meters every few seconds',
  },
  'phase-shifter': {
    id: 'phase-shifter',
    name: 'Phase-Shifter',
    effect: 'Teleports after taking a large burst of damage',
  },
  'reactive-plating': {
    id: 'reactive-plating',
    name: 'Reactive Plating',
    effect: 'Gains resistance to the damage type taken most, for a short time',
  },
  'siege-breaker': {
    id: 'siege-breaker',
    name: 'Siege Breaker',
    effect: 'Targets and destroys player constructs and traps first',
  },
  overclocked: {
    id: 'overclocked',
    name: 'Overclocked',
    effect: 'Speed and attack speed up two steps below half health',
  },
};

/** Champions appear from this round, the start of Territory 3 (GDD 9.13). */
export const CHAMPION_FIRST_ROUND = 15;
/** Elite modifiers a champion carries (GDD 9.13). */
export const CHAMPION_MODIFIER_COUNT = 2;
